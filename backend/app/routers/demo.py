import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.seed_demo import WHOLESALER_ID, run as run_seed
from app.schemas.demo import DashboardKpisResponse, DemoResetResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["demo"])

# Raw text queries used because the SQLAlchemy ORM Enum binding emits
# `::contractstatus` while the actual DB enum type is `contract_status`,
# which causes `Contract.status.in_(...)` to fail.
KPI_LOCKED_SQL = text("""
    SELECT COALESCE(SUM(principal_amount), 0)
    FROM contracts
    WHERE status::text IN ('PROPOSED','MERCHANT_APPROVED','AGREED','FUNDED','FUNDED_INVESTED')
""")

KPI_LIQUIDITY_SQL = text("SELECT balance FROM wallets WHERE user_id = :uid")


@router.post("/demo/reset", response_model=DemoResetResponse)
async def reset_demo():
    """Wipe + reseed the demo dataset to a deterministic baseline."""
    try:
        result = await run_seed()
        return DemoResetResponse(**result)
    except Exception as exc:
        logger.exception("demo reset failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/dashboard/kpis", response_model=DashboardKpisResponse)
async def dashboard_kpis(db: AsyncSession = Depends(get_db)):
    locked_total = await db.scalar(KPI_LOCKED_SQL)
    # Read from `wallets` table — that's what fn_settle_contract_early writes to,
    # so this naturally ticks up after settlement.
    liquidity = await db.scalar(KPI_LIQUIDITY_SQL, {"uid": WHOLESALER_ID})

    return DashboardKpisResponse(
        escrow_locked_rm=Decimal(locked_total or 0),
        liquidity_available_rm=Decimal(liquidity or 0),
        active_msmes=128,
        go_plus_yield_30d_rm=Decimal("1860"),
    )
