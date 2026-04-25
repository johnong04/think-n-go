from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.schemas.msme import MsmeInsightRequest, MsmeInsightResponse
from app.services.bedrock import BedrockError, converse_text
from app.services.msme_insight import (
    build_msme_insight_headline,
    build_msme_insight_system_prompt,
    build_msme_insight_user_prompt,
    parse_msme_insight,
)

router = APIRouter(prefix="/msme", tags=["msme"])


@router.post("/demand-pressure/insight", response_model=MsmeInsightResponse)
async def create_demand_pressure_insight(
    request: MsmeInsightRequest,
    settings: Settings = Depends(get_settings),
):
    summary_payload = request.llm_summary.model_dump(mode="json")
    try:
        raw_insight = converse_text(
            settings=settings,
            system_prompt=build_msme_insight_system_prompt(),
            message=build_msme_insight_user_prompt(summary_payload),
            max_tokens=420,
            temperature=0.2,
        )
    except BedrockError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    insight = parse_msme_insight(raw_insight, summary_payload)

    return MsmeInsightResponse(
        headline=insight["headline"] or build_msme_insight_headline(summary_payload),
        summary=insight["summary"],
        main_numbers=insight["main_numbers"],
        plain_reasons=insight["plain_reasons"],
        repayment_text=insight["repayment_text"],
        caveat=insight["caveat"],
        tone="supportive",
        source_summary=request.llm_summary,
    )
