"""Alibaba services routers"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from app.alibaba_services import AlibabsOSSService, get_oss_service
import os
import tempfile

router = APIRouter(prefix="/alibaba", tags=["alibaba"])


class FileUploadResponse(BaseModel):
    status: str
    url: str
    object_name: str


def get_configured_oss_service() -> AlibabsOSSService:
    try:
        return get_oss_service()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/oss/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    oss_service: AlibabsOSSService = Depends(get_configured_oss_service),
):
    """Upload file to Alibaba Cloud OSS"""
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        contents = await file.read()
        temp_file.write(contents)
        temp_file.flush()
        
        result = await oss_service.upload_file(
            file_path=temp_file.name,
            object_name=file.filename or "uploaded_file",
        )
        
        # Clean up temp file
        os.unlink(temp_file.name)
    
    return result


@router.get("/oss/list")
async def list_files(
    prefix: str = "",
    oss_service: AlibabsOSSService = Depends(get_configured_oss_service),
):
    """List files in OSS bucket"""
    result = await oss_service.list_files(prefix=prefix)
    return result


@router.delete("/oss/delete/{object_name}")
async def delete_file(
    object_name: str,
    oss_service: AlibabsOSSService = Depends(get_configured_oss_service),
):
    """Delete file from OSS"""
    result = await oss_service.delete_file(object_name=object_name)
    return result
