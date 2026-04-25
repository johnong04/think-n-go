"""APScheduler job – runs the yield rebalancer every 24 h for all active contracts.

In the hackathon demo, call /contracts/yield/rebalance manually or rely on
the frontend polling every 5 s (which hits the live contract balance).
"""

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.db.database import AsyncSessionLocal
from app.db.models import Contract, ContractStatus
from app.services.contracts import accrue_yield

logger = logging.getLogger(__name__)
_scheduler: AsyncIOScheduler | None = None


async def _run_daily_rebalance() -> None:
    """Iterate all LOCKED_IN_ESCROW / INVESTED contracts and accrue yield."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Contract).where(
                Contract.status == ContractStatus.FUNDED_INVESTED
            )
        )
        contracts = result.scalars().all()
        for contract in contracts:
            try:
                await accrue_yield(db, contract.id)
                logger.info("Accrued yield for contract %s", contract.id)
            except Exception as exc:
                logger.error(
                    "Failed to rebalance contract %s: %s", contract.id, exc
                )


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone="Asia/Kuala_Lumpur")
    # Run daily at midnight MYT
    _scheduler.add_job(
        _run_daily_rebalance,
        trigger="cron",
        hour=0,
        minute=0,
        id="daily_yield_rebalance",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("APScheduler started – daily yield rebalancer registered.")
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
