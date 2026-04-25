from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.schemas.invoice import InvoiceExtractionRequest, InvoiceExtractionResponse
from app.services.bedrock import BedrockError, converse_text
from app.services.invoice import (
    InvoiceExtractionError,
    build_invoice_extraction_system_prompt,
    build_invoice_extraction_user_prompt,
    parse_invoice_extraction_response,
)

router = APIRouter(prefix="/invoice", tags=["invoice"])


@router.post("/extract-items", response_model=InvoiceExtractionResponse)
async def extract_invoice_items(
    request: InvoiceExtractionRequest,
    settings: Settings = Depends(get_settings),
):
    try:
        raw_output = converse_text(
            settings=settings,
            system_prompt=build_invoice_extraction_system_prompt(),
            message=build_invoice_extraction_user_prompt(request.text),
            max_tokens=500,
            temperature=0,
        )
        return parse_invoice_extraction_response(raw_output)
    except (BedrockError, InvoiceExtractionError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
