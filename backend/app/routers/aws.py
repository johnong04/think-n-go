from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.schemas.aws import AwsIdentity
from app.services.aws import AwsCredentialsError, get_caller_identity

router = APIRouter(prefix="/aws", tags=["aws"])


@router.get("/identity", response_model=AwsIdentity)
async def read_aws_identity(settings: Settings = Depends(get_settings)):
    try:
        identity = get_caller_identity(settings)
    except AwsCredentialsError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return AwsIdentity(
        account=identity["Account"],
        arn=identity["Arn"],
        user_id=identity["UserId"],
        region=settings.aws_region,
        profile=settings.aws_profile,
    )
