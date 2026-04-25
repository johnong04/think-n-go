"""FastAPI router - Contract & Escrow endpoints.

State Machine Flow
------------------
POST /contracts/propose          (Supplier) -> PROPOSED
POST /contracts/agree            (Merchant) -> AGREED
POST /contracts/fund             (System)   -> FUNDED_INVESTED  + ledger created
POST /contracts/yield/accrue     (Cron)     -> accrues daily interest
POST /contracts/settle           (Merchant) -> SETTLED          + dual payout

Read Endpoints
--------------
GET  /contracts/              - list all
GET  /contracts/{id}          - fetch one contract
GET  /contracts/{id}/ledger   - fetch GO+ vault ledger row
GET  /wallet/{user_id}        - wallet balance for any user
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Contract, InvestmentLedger, Wallet
from app.schemas.contracts import (
    AccrueYieldRequest,
    BulkMetadataUpdateItem,
    BulkMetadataUpdateResult,
    BulkProductUpdateItem,
    BulkProductUpdateResult,
    ContractOut,
    ContractPropose,
    FundContractRequest,
    FundContractResponse,
    LedgerOut,
    MerchantAgreeRequest,
    SettleRequest,
    SettleResponse,
    UpdateContractMetadataRequest,
    UpdateContractProductRequest,
    WalletOut,
)
from app.services.contracts import (
    accrue_yield,
    approve_and_release_payout,
    fund_contract_to_escrow,
    merchant_agree,
    propose_contract,
    update_contract_metadata,
    update_contract_metadata_by_invoice,
    update_contract_product,
    update_contract_product_by_invoice,
)

router = APIRouter(prefix="/contracts", tags=["contracts"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _contract_out(c: Contract) -> ContractOut:
    return ContractOut.model_validate(c)


def _ledger_out(l: InvestmentLedger) -> LedgerOut:
    return LedgerOut.model_validate(l)


# ---------------------------------------------------------------------------
# READ endpoints (defined first to avoid path conflicts with /{id})
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=list[ContractOut],
    summary="List all contracts (newest first)",
)
async def list_contracts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contract).order_by(Contract.created_at.desc()))
    return [_contract_out(c) for c in result.scalars().all()]


@router.get(
    "/{contract_id}",
    response_model=ContractOut,
    summary="Fetch a single contract by ID",
)
async def get_contract(contract_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found.")
    return _contract_out(contract)


@router.get(
    "/{contract_id}/ledger",
    response_model=LedgerOut,
    summary="Get the GO+ investment ledger for a contract",
)
async def get_ledger(contract_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InvestmentLedger).where(InvestmentLedger.contract_id == contract_id)
    )
    ledger = result.scalar_one_or_none()
    if ledger is None:
        raise HTTPException(
            status_code=404,
            detail="Investment ledger not found. Contract may not be in FUNDED_INVESTED state yet.",
        )
    return _ledger_out(ledger)


@router.get(
    "/wallet/{user_id}",
    response_model=WalletOut,
    summary="Get wallet balance for a merchant or supplier",
)
async def get_wallet(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    if wallet is None:
        raise HTTPException(status_code=404, detail="Wallet not found.")
    return WalletOut.model_validate(wallet)


# ---------------------------------------------------------------------------
# STEP 1 - Supplier proposes contract (PROPOSED)
# ---------------------------------------------------------------------------


@router.post(
    "/propose",
    response_model=ContractOut,
    status_code=status.HTTP_201_CREATED,
    summary="[Supplier] Propose a new contract with invoice details",
)
async def propose(body: ContractPropose, db: AsyncSession = Depends(get_db)):
    """Supplier creates the contract. No merchant linked yet; no funds move.

    State transition: (none) -> PROPOSED
    """
    contract = await propose_contract(
        db=db,
        supplier_id=body.supplier_id,
        invoice_num=body.invoice_num,
        merchant_id=body.merchant_id,
        business_name=body.business_name,
        supplier_name=body.supplier_name,
        supplier_ph=body.supplier_ph,
        supplier_location=body.supplier_location,
        receiver_name=body.receiver_name,
        receiver_ph=body.receiver_ph,
        receiver_location=body.receiver_location,
        product=body.product,
        quantity=body.quantity,
        price_per_unit=body.price_per_unit,
        total_price=body.total_price,
        signature_url=body.signature_url,
        principal_amount=body.principal_amount,
        total_amount=body.total_amount,
        yield_rate=body.yield_rate,
        invoice_ref=body.invoice_ref,
        net_days=body.net_days,
        description=body.description,
    )
    return _contract_out(contract)


@router.patch(
    "/{contract_id}/product",
    response_model=ContractOut,
    summary="Update product fields for a contract",
)
async def patch_contract_product(
    contract_id: uuid.UUID,
    body: UpdateContractProductRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        contract = await update_contract_product(
            db,
            contract_id=contract_id,
            product=body.product,
            quantity=body.quantity,
            price_per_unit=body.price_per_unit,
            total_price=body.total_price,
            signature_url=body.signature_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _contract_out(contract)


@router.patch(
    "/{contract_id}/metadata",
    response_model=ContractOut,
    summary="Update non-product contract metadata fields",
)
async def patch_contract_metadata(
    contract_id: uuid.UUID,
    body: UpdateContractMetadataRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        contract = await update_contract_metadata(
            db,
            contract_id=contract_id,
            invoice_num=body.invoice_num,
            business_name=body.business_name,
            supplier_name=body.supplier_name,
            supplier_ph=body.supplier_ph,
            supplier_location=body.supplier_location,
            receiver_name=body.receiver_name,
            receiver_ph=body.receiver_ph,
            receiver_location=body.receiver_location,
            invoice_ref=body.invoice_ref,
            net_days=body.net_days,
            description=body.description,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _contract_out(contract)


@router.post(
    "/product/bulk-json",
    response_model=BulkProductUpdateResult,
    summary="Bulk update contract product fields from JSON list",
)
async def bulk_update_contract_products(
    updates: list[BulkProductUpdateItem],
    db: AsyncSession = Depends(get_db),
):
    updated: list[ContractOut] = []
    failed: list[dict[str, str]] = []

    for item in updates:
        try:
            if item.contract_id is not None:
                contract = await update_contract_product(
                    db,
                    contract_id=item.contract_id,
                    product=item.product,
                    quantity=item.quantity,
                    price_per_unit=item.price_per_unit,
                    total_price=item.total_price,
                    signature_url=item.signature_url,
                )
            else:
                contract = await update_contract_product_by_invoice(
                    db,
                    invoice_num=item.invoice_num or "",
                    product=item.product,
                    quantity=item.quantity,
                    price_per_unit=item.price_per_unit,
                    total_price=item.total_price,
                    signature_url=item.signature_url,
                )
            updated.append(_contract_out(contract))
        except ValueError as exc:
            ref = str(item.contract_id) if item.contract_id else (item.invoice_num or "")
            failed.append({"contract_ref": ref, "error": str(exc)})

    return BulkProductUpdateResult(updated=updated, failed=failed)


@router.post(
    "/metadata/bulk-json",
    response_model=BulkMetadataUpdateResult,
    summary="Bulk update non-product contract metadata from JSON list",
)
async def bulk_update_contract_metadata(
    updates: list[BulkMetadataUpdateItem],
    db: AsyncSession = Depends(get_db),
):
    updated: list[ContractOut] = []
    failed: list[dict[str, str]] = []

    for item in updates:
        try:
            if item.contract_id is not None:
                contract = await update_contract_metadata(
                    db,
                    contract_id=item.contract_id,
                    invoice_num=item.invoice_num,
                    business_name=item.business_name,
                    supplier_name=item.supplier_name,
                    supplier_ph=item.supplier_ph,
                    supplier_location=item.supplier_location,
                    receiver_name=item.receiver_name,
                    receiver_ph=item.receiver_ph,
                    receiver_location=item.receiver_location,
                    invoice_ref=item.invoice_ref,
                    net_days=item.net_days,
                    description=item.description,
                )
            else:
                contract = await update_contract_metadata_by_invoice(
                    db,
                    invoice_num=item.invoice_num or "",
                    business_name=item.business_name,
                    supplier_name=item.supplier_name,
                    supplier_ph=item.supplier_ph,
                    supplier_location=item.supplier_location,
                    receiver_name=item.receiver_name,
                    receiver_ph=item.receiver_ph,
                    receiver_location=item.receiver_location,
                    invoice_ref=item.invoice_ref,
                    net_days=item.net_days,
                    description=item.description,
                )
            updated.append(_contract_out(contract))
        except ValueError as exc:
            ref = str(item.contract_id) if item.contract_id else (item.invoice_num or "")
            failed.append({"contract_ref": ref, "error": str(exc)})

    return BulkMetadataUpdateResult(updated=updated, failed=failed)


# ---------------------------------------------------------------------------
# STEP 2 - Merchant accepts terms (AGREED)
# ---------------------------------------------------------------------------


@router.post(
    "/agree",
    response_model=ContractOut,
    summary="[Merchant] Accept a supplier's contract proposal",
)
async def agree(body: MerchantAgreeRequest, db: AsyncSession = Depends(get_db)):
    """Merchant signs the contract. Links merchant_id; no funds move yet.

    State transition: PROPOSED -> AGREED
    """
    try:
        contract = await merchant_agree(db, body.contract_id, body.merchant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _contract_out(contract)


# ---------------------------------------------------------------------------
# STEP 3 - Fund & Invest trigger (FUNDED_INVESTED)
# ---------------------------------------------------------------------------


@router.post(
    "/fund",
    response_model=FundContractResponse,
    summary="[System/Merchant] Move funds from merchant wallet into GO+ vault",
)
async def fund(body: FundContractRequest, db: AsyncSession = Depends(get_db)):
    """Atomically debits the merchant wallet and seeds the investment_ledger.
    Yield accrual begins immediately. Supplier is notified.

    State transition: AGREED -> FUNDED_INVESTED
    """
    try:
        contract, ledger = await fund_contract_to_escrow(db, body.contract_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FundContractResponse(
        contract=_contract_out(contract),
        ledger=_ledger_out(ledger),
        supplier_notified=True,
        message=(
            f"Liquidity Guaranteed. RM{contract.principal_amount} is now "
            f"earning {float(contract.yield_rate) * 100:.2f}% p.a. yield in Escrow."
        ),
    )


# ---------------------------------------------------------------------------
# YIELD ACCRUAL - called daily by APScheduler or manually during demo
# ---------------------------------------------------------------------------


@router.post(
    "/yield/accrue",
    response_model=LedgerOut,
    summary="[Cron/Demo] Accrue one day's interest for a FUNDED_INVESTED contract",
)
async def yield_accrue(body: AccrueYieldRequest, db: AsyncSession = Depends(get_db)):
    """Calculates and persists daily interest.

    Formula: daily_interest = (amount_held x daily_yield_rate) / 365

    Call every 24 h via APScheduler, or hit manually during demo to simulate
    yield growth without waiting for real days to pass.
    """
    try:
        ledger = await accrue_yield(db, body.contract_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _ledger_out(ledger)


# ---------------------------------------------------------------------------
# STEP 4 - Merchant approves & releases payout (SETTLED)
# ---------------------------------------------------------------------------


@router.post(
    "/settle",
    response_model=SettleResponse,
    summary="[Merchant] Confirm delivery and release settlement payout",
)
async def settle(body: SettleRequest, db: AsyncSession = Depends(get_db)):
    """Merchant triggers the final settlement after confirming delivery.

    Settlement split:
        Supplier <- full principal (amount_held)
        Merchant <- accrued interest as cashback (rebate)

    State transition: FUNDED_INVESTED -> SETTLED
    """
    try:
        result = await approve_and_release_payout(db, body.contract_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SettleResponse(**result)
