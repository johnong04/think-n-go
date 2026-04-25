from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.schemas.msme import MsmeDemandPressureResponse
from app.services.msme_demand_pressure import (
    DEFAULT_FORECAST_DAYS,
    DEFAULT_STATE,
    MsmeDemandPressureError,
    build_mock_demand_pressure_summary,
)

router = APIRouter(prefix="/msme", tags=["msme"])


@router.get("/demand-pressure/mock", response_model=MsmeDemandPressureResponse)
async def read_mock_demand_pressure(
    current_balance_rm: float = Query(default=760.0, ge=0),
    as_of_date: date = Query(default=date(2026, 4, 25)),
    forecast_days: int = Query(default=DEFAULT_FORECAST_DAYS, ge=1, le=30),
    state: str = Query(default=DEFAULT_STATE, min_length=1),
):
    try:
        return build_mock_demand_pressure_summary(
            current_balance_rm=current_balance_rm,
            as_of=as_of_date,
            forecast_days=forecast_days,
            state=state,
        )
    except MsmeDemandPressureError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
