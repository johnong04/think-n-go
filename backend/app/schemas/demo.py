from decimal import Decimal
from pydantic import BaseModel, Field


class DemoResetResponse(BaseModel):
    ok: bool
    wholesaler: str
    merchants: int
    contracts: int


class DashboardKpisResponse(BaseModel):
    escrow_locked_rm: Decimal = Field(..., description="Sum of principal across LOCKED-equivalent statuses")
    liquidity_available_rm: Decimal = Field(..., description="Wholesaler wallet balance")
    active_msmes: int = Field(..., description="Static for now (cards 3+4 are not live-wired)")
    go_plus_yield_30d_rm: Decimal = Field(..., description="Static for now")
