import uuid
import logging
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Contract, ContractStatus, Merchant, Supplier
from app.schemas.contracts import ContractOut
from app.schemas.agent import (
    OptimizeDiscountRequest,
    OptimizeDiscountResponse,
    AuditArbitrageRequest,
    ConsultantViewResponse,
    SettleEarlyRequest,
    VelocityAnalysisResponse,
    UnderwriteRequest,
    UnderwriteResponse,
    AuthorizeDispatchRequest,
    AuthorizeDispatchResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])

# ---------------------------------------------------------------------------
# Scenario A: Supplier-Led Liquidation (The Early Release)
# ---------------------------------------------------------------------------

@router.post("/supplier/optimize-discount", response_model=OptimizeDiscountResponse)
async def optimize_discount_strategy(body: OptimizeDiscountRequest, db: AsyncSession = Depends(get_db)):
    """
    Supplier AI: "The Liquidity Broker"
    Finds FUNDED contracts and suggests a blended discount rate to hit a cash target.
    """
    result = await db.execute(
        select(Contract).where(
            Contract.supplier_id == body.supplier_id,
            Contract.status.in_([ContractStatus.FUNDED, ContractStatus.FUNDED_INVESTED])
        )
    )
    contracts = result.scalars().all()

    if not contracts:
        raise HTTPException(status_code=404, detail="No funded contracts available for early release.")

    total_in_escrow = sum(c.principal_amount for c in contracts)
    
    if total_in_escrow < body.target_cash:
        raise HTTPException(
            status_code=400, 
            detail=f"Target cash (RM{body.target_cash}) exceeds available escrow (RM{total_in_escrow})."
        )

    # Simplified AI heuristic: Apply a flat blended discount across all available contracts
    # For a real system, this would be an optimization function.
    # We'll mock a simple 1.5% discount if they need <= 50% of escrow, 3% if they need > 50%.
    ratio = body.target_cash / total_in_escrow
    discount_rate = Decimal("0.015") if ratio <= Decimal("0.5") else Decimal("0.03")

    return OptimizeDiscountResponse(
        suggested_discount_rate=discount_rate,
        target_contracts=[c.id for c in contracts],
        message=f"Optimal strategy: {discount_rate*100}% discount across {len(contracts)} contracts to minimize cost of cash."
    )

@router.post("/merchant/audit-arbitrage", response_model=ConsultantViewResponse)
async def audit_arbitrage_viability(body: AuditArbitrageRequest, db: AsyncSession = Depends(get_db)):
    """
    Merchant AI: "The Agentic CFO"
    Compares the Supplier's discount offer against the yield generated in the GO+ Vault.
    Returns the "Consultant Roast" if the offer is mathematically offensive.
    """
    result = await db.execute(select(Contract).where(Contract.id == body.contract_id))
    contract = result.scalar_one_or_none()
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    principal = contract.principal_amount
    yield_rate = contract.yield_rate
    discount_rate = body.discount_rate

    # Mock remaining days to maturity (e.g., 14 days left on Net-30 terms)
    remaining_days = Decimal("14")
    
    # Mathematical computations
    expected_yield = principal * yield_rate * (remaining_days / Decimal("365"))
    discount_capture = principal * discount_rate

    yield_str = f"RM {principal:,.2f} x {yield_rate:.4f} x ({remaining_days}/365) = RM {expected_yield:,.2f}"
    discount_str = f"RM {principal:,.2f} x {discount_rate:.4f} = RM {discount_capture:,.2f}"

    # Decision Engine: The Consultant Roast
    if discount_capture < expected_yield:
        decision = (
            f"Supplier's offer is mathematically offensive. "
            f"Holding funds generates RM {expected_yield:,.2f}; "
            f"this offer only yields RM {discount_capture:,.2f}. "
            "Recommendation: DECLINE."
        )
    else:
        decision = (
            f"Mathematically sound. Discount capture (RM {discount_capture:,.2f}) "
            f"exceeds passive yield (RM {expected_yield:,.2f}). "
            "Recommendation: ACCEPT & TRIGGER EARLY SETTLEMENT."
        )

    return ConsultantViewResponse(
        yield_calculation=yield_str,
        discount_capture=discount_str,
        decision_engine=decision
    )

@router.post("/merchant/trigger-settlement")
async def trigger_early_settlement(body: SettleEarlyRequest, db: AsyncSession = Depends(get_db)):
    """
    Executes the atomic SQL function to finalize the early release and distribute funds.
    """
    try:
        # Execute the raw SQL function
        result = await db.execute(
            text("SELECT fn_settle_contract_early(:contract_id, :discount_rate)"),
            {"contract_id": body.contract_id, "discount_rate": body.discount_rate}
        )
        await db.commit()
        return result.scalar()
    except Exception as e:
        await db.rollback()
        logger.error(f"Early settlement failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------------------------
# Scenario B: Merchant-Led BNPL (The Predictive Restock)
# ---------------------------------------------------------------------------

@router.get("/merchant/analyze-velocity/{merchant_id}", response_model=VelocityAnalysisResponse)
async def analyze_velocity_and_shortfall(merchant_id: uuid.UUID):
    """
    Merchant AI: Predicts inventory shortfall using mocked linear regression on sales history.
    """
    return VelocityAnalysisResponse(
        merchant_id=merchant_id,
        predicted_shortfall_hours=48,
        message="URGENT: Premium White Bread velocity dictates a stockout in 48 hours. Bridging liquidity trap with BNPL is recommended."
    )

@router.post("/merchant/request-underwriting", response_model=UnderwriteResponse)
async def request_instant_underwriting(body: UnderwriteRequest, db: AsyncSession = Depends(get_db)):
    """
    Merchant AI: Mints a BNPL credit line directly into escrow if credit score > 650.
    Executes atomic SQL function `fn_mint_bnpl_escrow`.
    """
    try:
        result = await db.execute(
            text("SELECT fn_mint_bnpl_escrow(:merchant_id, :supplier_id, :principal)"),
            {
                "merchant_id": body.merchant_id,
                "supplier_id": body.supplier_id,
                "principal": body.principal_amount
            }
        )
        await db.commit()
        
        sql_result = result.scalar()
        return UnderwriteResponse(
            contract_id=sql_result.get("contract_id"),
            status=sql_result.get("status"),
            principal=sql_result.get("principal"),
            funding_source=sql_result.get("funding_source"),
            message="Instant Underwriting Successful. Funds secured in Escrow via TNG BNPL."
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"BNPL Underwriting failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/supplier/poll-secured/{supplier_id}", response_model=list[ContractOut])
async def poll_secured_contracts(supplier_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Supplier AI: Replaces WebSockets for simplicity. Polls for newly secured (FUNDED) contracts.
    """
    result = await db.execute(
        select(Contract).where(
            Contract.supplier_id == supplier_id,
            Contract.status.in_([ContractStatus.FUNDED, ContractStatus.FUNDED_INVESTED])
        ).order_by(Contract.created_at.desc()).limit(5)
    )
    return result.scalars().all()

@router.post("/supplier/authorize-logistics", response_model=AuthorizeDispatchResponse)
async def authorize_logistics_release(body: AuthorizeDispatchRequest, db: AsyncSession = Depends(get_db)):
    """
    Supplier AI: Generates an invoice_num and marks the order for "Dispatch".
    """
    async with db.begin():
        result = await db.execute(select(Contract).where(Contract.id == body.contract_id))
        contract = result.scalar_one_or_none()

        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found.")

        # Generate a mock invoice number and update metadata
        invoice_num = f"INV-TNG-{str(uuid.uuid4())[:8].upper()}"
        contract.invoice_num = invoice_num
        
        # We store the dispatch state in terms_metadata
        if contract.terms_metadata is None:
            contract.terms_metadata = {}
        
        metadata = dict(contract.terms_metadata)
        metadata["logistics_status"] = "DISPATCHED"
        contract.terms_metadata = metadata

    return AuthorizeDispatchResponse(
        contract_id=contract.id,
        invoice_num=invoice_num,
        status="DISPATCHED",
        message="Proof of Funds verified. Logistics authorized to release inventory."
    )
