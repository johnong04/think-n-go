"""Contract & Escrow service - Agentic Liquidity Engine.

State Machine
-------------
PROPOSED       (Supplier)  -> Supplier creates the contract with invoice details.
AGREED         (Merchant)  -> Merchant accepts terms and is linked to the contract.
FUNDED_INVESTED(System)    -> Merchant funds are atomically moved into the GO+ vault.
                              Yield accrual begins.
SETTLED        (Merchant)  -> Merchant triggers release after delivery confirmation.
                              Principal -> Supplier wallet.
                              Accrued interest (yield) -> Merchant wallet as cashback.

All DB writes use atomic transactions with explicit rollback on failure.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Contract, ContractStatus, InvestmentLedger, Wallet


# ---------------------------------------------------------------------------
# Internal wallet helpers
# ---------------------------------------------------------------------------


async def _get_or_create_wallet(
    db: AsyncSession, user_id: uuid.UUID, role: str
) -> Wallet:
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    if wallet is None:
        wallet = Wallet(user_id=user_id, role=role, balance=Decimal("0"))
        db.add(wallet)
        await db.flush()
    return wallet


async def _credit_wallet(
    db: AsyncSession, user_id: uuid.UUID, amount: Decimal
) -> None:
    await db.execute(
        update(Wallet)
        .where(Wallet.user_id == user_id)
        .values(balance=Wallet.balance + amount)
    )


async def _debit_wallet(
    db: AsyncSession, user_id: uuid.UUID, amount: Decimal
) -> None:
    """Debit wallet; raises ValueError if balance would go negative."""
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    if wallet is None or wallet.balance < amount:
        raise ValueError(
            f"Insufficient balance for user {user_id}. "
            f"Available: {wallet.balance if wallet else 0}, Required: {amount}"
        )
    await db.execute(
        update(Wallet)
        .where(Wallet.user_id == user_id)
        .values(balance=Wallet.balance - amount)
    )


async def _get_contract_or_raise(
    db: AsyncSession, contract_id: uuid.UUID
) -> Contract:
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if contract is None:
        raise ValueError(f"Contract {contract_id} not found.")
    return contract


async def _get_ledger_or_raise(
    db: AsyncSession, contract_id: uuid.UUID
) -> InvestmentLedger:
    result = await db.execute(
        select(InvestmentLedger).where(InvestmentLedger.contract_id == contract_id)
    )
    ledger = result.scalar_one_or_none()
    if ledger is None:
        raise ValueError(f"No investment ledger found for contract {contract_id}.")
    return ledger


# ---------------------------------------------------------------------------
# Step 1: PROPOSED - Supplier creates the contract
# ---------------------------------------------------------------------------


async def propose_contract(
    db: AsyncSession,
    supplier_id: uuid.UUID,
    principal_amount: Decimal,
    invoice_num: str | None = None,
    merchant_id: uuid.UUID | None = None,
    business_name: str | None = None,
    supplier_name: str | None = None,
    supplier_ph: str | None = None,
    supplier_location: str | None = None,
    receiver_name: str | None = None,
    receiver_ph: str | None = None,
    receiver_location: str | None = None,
    product: str | None = None,
    quantity: Decimal | None = None,
    price_per_unit: Decimal | None = None,
    total_price: Decimal | None = None,
    signature_url: str | None = None,
    total_amount: Decimal | None = None,
    yield_rate: Decimal = Decimal("0.0350"),
    invoice_ref: str | None = None,
    net_days: str | None = None,
    description: str | None = None,
) -> Contract:
    """Supplier initiates a contract proposal. No merchant linked yet.

    State: (none) -> PROPOSED
    """
    contract = Contract(
        invoice_num=invoice_num,
        supplier_id=supplier_id,
        merchant_id=merchant_id,
        business_name=business_name,
        supplier_name=supplier_name,
        supplier_ph=supplier_ph,
        supplier_location=supplier_location,
        receiver_name=receiver_name,
        receiver_ph=receiver_ph,
        receiver_location=receiver_location,
        product=product,
        quantity=quantity,
        price_per_unit=price_per_unit,
        total_price=total_price,
        signature_url=signature_url,
        principal_amount=principal_amount,
        total_amount=total_amount,
        status=ContractStatus.PROPOSED,
        yield_rate=yield_rate,
        invoice_ref=invoice_ref,
        net_days=net_days,
        description=description,
    )
    db.add(contract)
    await db.commit()
    await db.refresh(contract)
    return contract


# ---------------------------------------------------------------------------
# Step 2: AGREED - Merchant accepts terms
# ---------------------------------------------------------------------------


async def merchant_agree(
    db: AsyncSession,
    contract_id: uuid.UUID,
    merchant_id: uuid.UUID,
) -> Contract:
    """Merchant accepts the supplier's contract proposal.

    State: PROPOSED -> AGREED
    Links the merchant_id to the contract (was null in PROPOSED state).
    """
    async with db.begin():
        contract = await _get_contract_or_raise(db, contract_id)

        if contract.status != ContractStatus.PROPOSED:
            raise ValueError(
                f"Cannot agree: contract is in state '{contract.status}'. "
                "Expected PROPOSED."
            )

        contract.merchant_id = merchant_id
        contract.status = ContractStatus.AGREED
        contract.agreed_at = datetime.now(timezone.utc)
        contract.updated_at = datetime.now(timezone.utc)

    await db.refresh(contract)
    return contract


# ---------------------------------------------------------------------------
# Step 3: FUNDED_INVESTED - Atomic fund + invest trigger
# ---------------------------------------------------------------------------


async def fund_contract_to_escrow(
    db: AsyncSession,
    contract_id: uuid.UUID,
) -> tuple[Contract, InvestmentLedger]:
    """Merchant funds are moved into the GO+ vault. Yield accrual begins.

    State: AGREED -> FUNDED_INVESTED

    Atomic operations:
        1. Debit merchant wallet by principal_amount.
        2. Create investment_ledger row (mocking the GO+ fund deposit).
        3. Send supplier notification: "Liquidity Guaranteed."
    """
    async with db.begin():
        contract = await _get_contract_or_raise(db, contract_id)

        if contract.status != ContractStatus.AGREED:
            raise ValueError(
                f"Cannot fund: contract is in state '{contract.status}'. "
                "Expected AGREED."
            )
        if contract.merchant_id is None:
            raise ValueError("Contract has no merchant linked. Call merchant_agree first.")

        # 1. Debit merchant wallet
        await _get_or_create_wallet(db, contract.merchant_id, "MERCHANT")
        await _debit_wallet(db, contract.merchant_id, contract.principal_amount)

        # 2. Advance state
        contract.status = ContractStatus.FUNDED_INVESTED
        contract.funded_at = datetime.now(timezone.utc)
        contract.updated_at = datetime.now(timezone.utc)

        # 3. Create GO+ ledger entry (mocking the move to money-market vault)
        ledger = InvestmentLedger(
            contract_id=contract.id,
            amount_held=contract.principal_amount,
            daily_yield_rate=contract.yield_rate,
            accrued_interest=Decimal("0.0000"),
            last_accrual_date=datetime.now(timezone.utc),
        )
        db.add(ledger)

    await db.refresh(contract)
    await db.refresh(ledger)

    # Agentic notification (mocked - wire up real push/webhook in prod)
    _notify_supplier(
        contract.supplier_id,
        f"Liquidity Guaranteed. RM{contract.principal_amount} is now earning "
        f"yield in Escrow. Invoice Ref: {contract.invoice_ref}",
    )

    return contract, ledger


# ---------------------------------------------------------------------------
# Yield Accrual - called daily by APScheduler
# ---------------------------------------------------------------------------


async def accrue_yield(
    db: AsyncSession,
    contract_id: uuid.UUID,
) -> InvestmentLedger:
    """Accumulate one day's interest for a FUNDED_INVESTED contract.

    Formula: daily_interest = (amount_held x daily_yield_rate) / 365

    Updates investment_ledger.accrued_interest and last_accrual_date.
    """
    async with db.begin():
        contract = await _get_contract_or_raise(db, contract_id)

        if contract.status != ContractStatus.FUNDED_INVESTED:
            raise ValueError(
                f"Cannot accrue yield: contract is in state '{contract.status}'. "
                "Expected FUNDED_INVESTED."
            )

        ledger = await _get_ledger_or_raise(db, contract_id)

        daily_interest = (ledger.amount_held * ledger.daily_yield_rate) / Decimal("365")
        ledger.accrued_interest = ledger.accrued_interest + daily_interest
        ledger.last_accrual_date = datetime.now(timezone.utc)

        contract.updated_at = datetime.now(timezone.utc)

    await db.refresh(ledger)
    return ledger


# ---------------------------------------------------------------------------
# Step 4: SETTLED - Merchant approves and releases payout
# ---------------------------------------------------------------------------


async def approve_and_release_payout(
    db: AsyncSession,
    contract_id: uuid.UUID,
) -> dict:
    """Merchant confirms delivery and triggers the settlement split.

    State: FUNDED_INVESTED -> SETTLED

    Settlement logic (Trust-Minimized, Merchant controls final release):
        payout_to_supplier = ledger.amount_held       (full principal)
        rebate_to_merchant = ledger.accrued_interest  (yield earned as cashback)

    Atomic operations:
        1. Credit supplier wallet with full principal.
        2. Credit merchant wallet with accrued interest (the "cashback").
        3. Mark contract SETTLED.
    """
    async with db.begin():
        contract = await _get_contract_or_raise(db, contract_id)

        if contract.status != ContractStatus.FUNDED_INVESTED:
            raise ValueError(
                f"Cannot settle: contract is in state '{contract.status}'. "
                "Expected FUNDED_INVESTED."
            )

        ledger = await _get_ledger_or_raise(db, contract_id)

        payout_to_supplier = ledger.amount_held
        rebate_to_merchant = ledger.accrued_interest

        # Ensure wallets exist before crediting
        await _get_or_create_wallet(db, contract.supplier_id, "SUPPLIER")
        await _get_or_create_wallet(db, contract.merchant_id, "MERCHANT")

        # Atomic dual credit
        await _credit_wallet(db, contract.supplier_id, payout_to_supplier)
        await _credit_wallet(db, contract.merchant_id, rebate_to_merchant)

        # Finalise state machine
        contract.status = ContractStatus.SETTLED
        contract.settled_at = datetime.now(timezone.utc)
        contract.updated_at = datetime.now(timezone.utc)

    return {
        "contract_id": contract_id,
        "status": ContractStatus.SETTLED,
        "payout_to_supplier": payout_to_supplier,
        "rebate_to_merchant": rebate_to_merchant,
        "accrued_interest_captured": rebate_to_merchant,
    }


# ---------------------------------------------------------------------------
# Internal notification stub
# ---------------------------------------------------------------------------


def _notify_supplier(supplier_id: uuid.UUID, message: str) -> None:
    """Mocked agentic notification. Replace with real push/webhook in prod."""
    import logging
    logging.getLogger(__name__).info(
        "[NOTIFY supplier=%s] %s", supplier_id, message
    )


async def update_contract_product(
    db: AsyncSession,
    *,
    contract_id: uuid.UUID,
    product: str | None = None,
    quantity: Decimal | None = None,
    price_per_unit: Decimal | None = None,
    total_price: Decimal | None = None,
    signature_url: str | None = None,
) -> Contract:
    """Update product-related fields for a contract."""
    async with db.begin():
        contract = await _get_contract_or_raise(db, contract_id)

        if contract.status in {
            ContractStatus.FUNDED,
            ContractStatus.FUNDED_INVESTED,
            ContractStatus.SOLVED,
            ContractStatus.RELEASED,
            ContractStatus.SETTLED,
        }:
            raise ValueError(
                "Cannot update product details after contract has been funded/closed."
            )

        if product is not None:
            contract.product = product
        if quantity is not None:
            contract.quantity = quantity
        if price_per_unit is not None:
            contract.price_per_unit = price_per_unit
        if signature_url is not None:
            contract.signature_url = signature_url

        if total_price is not None:
            contract.total_price = total_price
        elif contract.quantity is not None and contract.price_per_unit is not None:
            contract.total_price = contract.quantity * contract.price_per_unit

        contract.updated_at = datetime.now(timezone.utc)

    await db.refresh(contract)
    return contract


async def update_contract_product_by_invoice(
    db: AsyncSession,
    *,
    invoice_num: str,
    product: str | None = None,
    quantity: Decimal | None = None,
    price_per_unit: Decimal | None = None,
    total_price: Decimal | None = None,
    signature_url: str | None = None,
) -> Contract:
    async with db.begin():
        result = await db.execute(select(Contract).where(Contract.invoice_num == invoice_num))
        contract = result.scalar_one_or_none()
        if contract is None:
            raise ValueError(f"Contract with invoice_num '{invoice_num}' not found.")

    return await update_contract_product(
        db,
        contract_id=contract.id,
        product=product,
        quantity=quantity,
        price_per_unit=price_per_unit,
        total_price=total_price,
        signature_url=signature_url,
    )


async def update_contract_metadata(
    db: AsyncSession,
    *,
    contract_id: uuid.UUID,
    invoice_num: str | None = None,
    business_name: str | None = None,
    supplier_name: str | None = None,
    supplier_ph: str | None = None,
    supplier_location: str | None = None,
    receiver_name: str | None = None,
    receiver_ph: str | None = None,
    receiver_location: str | None = None,
    invoice_ref: str | None = None,
    net_days: str | None = None,
    description: str | None = None,
) -> Contract:
    """Update business/contact/invoice metadata fields for a contract."""
    async with db.begin():
        contract = await _get_contract_or_raise(db, contract_id)

        if contract.status in {
            ContractStatus.FUNDED,
            ContractStatus.FUNDED_INVESTED,
            ContractStatus.SOLVED,
            ContractStatus.RELEASED,
            ContractStatus.SETTLED,
        }:
            raise ValueError(
                "Cannot update metadata after contract has been funded/closed."
            )

        if invoice_num is not None:
            contract.invoice_num = invoice_num
        if business_name is not None:
            contract.business_name = business_name
        if supplier_name is not None:
            contract.supplier_name = supplier_name
        if supplier_ph is not None:
            contract.supplier_ph = supplier_ph
        if supplier_location is not None:
            contract.supplier_location = supplier_location
        if receiver_name is not None:
            contract.receiver_name = receiver_name
        if receiver_ph is not None:
            contract.receiver_ph = receiver_ph
        if receiver_location is not None:
            contract.receiver_location = receiver_location
        if invoice_ref is not None:
            contract.invoice_ref = invoice_ref
        if net_days is not None:
            contract.net_days = net_days
        if description is not None:
            contract.description = description

        contract.updated_at = datetime.now(timezone.utc)

    await db.refresh(contract)
    return contract


async def update_contract_metadata_by_invoice(
    db: AsyncSession,
    *,
    invoice_num: str,
    business_name: str | None = None,
    supplier_name: str | None = None,
    supplier_ph: str | None = None,
    supplier_location: str | None = None,
    receiver_name: str | None = None,
    receiver_ph: str | None = None,
    receiver_location: str | None = None,
    invoice_ref: str | None = None,
    net_days: str | None = None,
    description: str | None = None,
) -> Contract:
    async with db.begin():
        result = await db.execute(select(Contract).where(Contract.invoice_num == invoice_num))
        contract = result.scalar_one_or_none()
        if contract is None:
            raise ValueError(f"Contract with invoice_num '{invoice_num}' not found.")

    return await update_contract_metadata(
        db,
        contract_id=contract.id,
        business_name=business_name,
        supplier_name=supplier_name,
        supplier_ph=supplier_ph,
        supplier_location=supplier_location,
        receiver_name=receiver_name,
        receiver_ph=receiver_ph,
        receiver_location=receiver_location,
        invoice_ref=invoice_ref,
        net_days=net_days,
        description=description,
    )
