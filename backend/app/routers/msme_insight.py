from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.schemas.msme import MsmeInsightRequest, MsmeInsightResponse
from app.services.bedrock import BedrockError, converse_text
from app.services.msme_insight import (
    build_msme_insight_headline,
    build_msme_insight_system_prompt,
    build_msme_insight_user_prompt,
)

router = APIRouter(prefix="/msme", tags=["msme"])


@router.post("/demand-pressure/insight", response_model=MsmeInsightResponse)
async def create_demand_pressure_insight(
    request: MsmeInsightRequest,
    settings: Settings = Depends(get_settings),
):
    try:
        insight = converse_text(
            settings=settings,
            system_prompt=build_msme_insight_system_prompt(),
            message=build_msme_insight_user_prompt(
                request.llm_summary.model_dump(mode="json")
            ),
            max_tokens=220,
            temperature=0.2,
        )
    except BedrockError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return MsmeInsightResponse(
        headline=build_msme_insight_headline(request.llm_summary.model_dump(mode="json")),
        message=insight.strip(),
        tone="supportive",
        source_summary=request.llm_summary,
    )
