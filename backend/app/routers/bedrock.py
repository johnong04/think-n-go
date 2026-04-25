from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.schemas.bedrock import BedrockChatRequest, BedrockChatResponse
from app.services.bedrock import BedrockError, converse_text

router = APIRouter(prefix="/bedrock", tags=["bedrock"])


@router.post("/chat", response_model=BedrockChatResponse)
async def chat_with_bedrock(
    request: BedrockChatRequest,
    settings: Settings = Depends(get_settings),
):
    try:
        output_text = converse_text(
            settings=settings,
            message=request.message,
            model_id=request.model_id,
            system_prompt=request.system_prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
        )
    except BedrockError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return BedrockChatResponse(
        model_id=request.model_id or settings.bedrock_model_id,
        region=settings.aws_bedrock_region,
        output_text=output_text,
    )
