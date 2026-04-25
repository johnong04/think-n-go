"""SQLAlchemy ORM models for the Contract & Escrow state machine.

Tables
------
contracts         - The escrow ledger (source of truth for liquidity state).
investment_ledger - Mocked GO+ yield engine records.
wallets           - Simplified merchant / supplier wallet balances.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.database import Base


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class ContractStatus(str, enum.Enum):
    # Supplier creates contract / sends invoice
    PROPOSED = "PROPOSED"
    MERCHANT_APPROVED = "MERCHANT_APPROVED"    # Refined schema status
    FUNDED = "FUNDED"                          # Refined schema status
    SOLVED = "SOLVED"                          # Refined schema status
    RELEASED = "RELEASED"                      # Refined schema status
    AGREED = "AGREED"                          # Backward compatibility status
    FUNDED_INVESTED = "FUNDED_INVESTED"        # Backward compatibility status
    SETTLED = "SETTLED"                        # Backward compatibility status
    DISPUTED = "DISPUTED"


class UserRole(str, enum.Enum):
    MERCHANT = "MERCHANT"
    SUPPLIER = "SUPPLIER"


# ---------------------------------------------------------------------------
# Refined actor profile tables
# ---------------------------------------------------------------------------


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    tng_merchant_id = Column(String(64), nullable=True, unique=True)
    wallet_balance = Column(
        Numeric(precision=15, scale=2), nullable=False, default=0)


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    wallet_balance = Column(
        Numeric(precision=15, scale=2), nullable=False, default=0)
    credit_score = Column(Integer, nullable=True)


# ---------------------------------------------------------------------------
# Wallets (simplified; real system would link to bank rails)
# ---------------------------------------------------------------------------


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    role = Column(Enum(UserRole), nullable=False)
    balance = Column(Numeric(precision=18, scale=4), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="MYR")
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Contracts (state-machine core)
# ---------------------------------------------------------------------------


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Invoice & actor details
    invoice_num = Column(
        String(50),
        nullable=True,
        comment="Invoice number for reference",
    )
    supplier_id = Column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="Supplier who proposed the contract",
    )
    merchant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Merchant who agrees and funds; populated on merchant approval",
    )
    business_name = Column(
        String(255),
        nullable=True,
        comment="Business name for the transaction",
    )
    supplier_name = Column(
        String(255),
        nullable=True,
        comment="Supplier name (denormalized from suppliers table)",
    )
    supplier_ph = Column(
        String(20),
        nullable=True,
        comment="Supplier phone number",
    )
    supplier_location = Column(
        String(255),
        nullable=True,
        comment="Supplier location/address",
    )
    receiver_name = Column(
        String(255),
        nullable=True,
        comment="Receiver/recipient name",
    )
    receiver_ph = Column(
        String(20),
        nullable=True,
        comment="Receiver phone number",
    )
    receiver_location = Column(
        String(255),
        nullable=True,
        comment="Receiver location/address",
    )

    # Product information
    product = Column(
        String(255),
        nullable=True,
        comment="Product description",
    )
    quantity = Column(
        Numeric(precision=15, scale=2),
        nullable=True,
        comment="Product quantity",
    )
    price_per_unit = Column(
        Numeric(precision=15, scale=2),
        nullable=True,
        comment="Unit price of the product",
    )
    total_price = Column(
        Numeric(precision=15, scale=2),
        nullable=True,
        comment="Total invoice amount (quantity × price_per_unit)",
    )
    signature_url = Column(
        String(512),
        nullable=True,
        comment="URL to digital signature or proof of agreement",
    )

    # Financial fields
    principal_amount = Column(
        Numeric(precision=15, scale=2), nullable=False,
        comment="Invoice face value in MYR",
    )
    total_amount = Column(
        Numeric(precision=15, scale=2),
        nullable=True,
        comment="Refined schema invoice value in MYR (may differ from total_price)",
    )
    yield_rate = Column(
        Numeric(precision=5, scale=4),
        nullable=False,
        default=0.0350,
        comment="Annual yield rate, e.g. 0.0350 = 3.5% p.a.",
    )

    # Legacy compatibility fields
    invoice_ref = Column(String(128), nullable=True)
    net_days = Column(String(16), nullable=True, comment="e.g. Net-30, Net-14")
    description = Column(String(512), nullable=True)

    # Status & metadata
    status = Column(
        Enum(ContractStatus),
        nullable=False,
        default=ContractStatus.PROPOSED,
    )
    terms_metadata = Column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
        comment="Dynamic terms, e.g. delivery and milestone conditions",
    )

    # Timestamps
    date_created = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        comment="Invoice creation date",
    )
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    approved_at = Column(DateTime(timezone=True), nullable=True)
    funded_at = Column(DateTime(timezone=True), nullable=True)
    solved_at = Column(DateTime(timezone=True), nullable=True)

    # settled_at is captured on release
    settled_at = Column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# Refined financial layer tables
# ---------------------------------------------------------------------------


class EscrowVault(Base):
    __tablename__ = "escrow_vault"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    locked_amount = Column(Numeric(precision=15, scale=2), nullable=False)
    is_invested = Column(Boolean, nullable=False, default=True)
    vault_status = Column(String(32), nullable=False, default="HOLDING")


class MockInvestment(Base):
    __tablename__ = "mock_investments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    apy_rate = Column(Numeric(precision=5, scale=4),
                      nullable=False, default=0.0345)
    accrued_yield = Column(Numeric(precision=15, scale=6),
                           nullable=False, default=0)
    investment_start = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_recalc_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


# ---------------------------------------------------------------------------
# Investment Ledger - the mocked GO+ "Shadow Bank" vault
# ---------------------------------------------------------------------------


class InvestmentLedger(Base):
    """One row per contract. Represents funds locked in the GO+ money-market vault.

    Columns match the spec SQL exactly:
        amount_held       - the locked principal (= contract.principal_amount)
        daily_yield_rate  - 3.5% p.a. mock rate (stored as 0.0350)
        accrued_interest  - running total of daily interest earned
        last_accrual_date - timestamp of last yield calculation
    """

    __tablename__ = "investment_ledger"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    amount_held = Column(
        Numeric(precision=15, scale=2),
        nullable=False,
        comment="The locked principal mirrored from contracts.principal_amount",
    )
    daily_yield_rate = Column(
        Numeric(precision=5, scale=4),
        nullable=False,
        default=0.0350,
        comment="Mock 3.5% p.a. annual rate stored per-ledger for auditability",
    )
    accrued_interest = Column(
        Numeric(precision=15, scale=4),
        nullable=False,
        default=0.0000,
        comment="Running sum of daily interest: (amount_held x daily_yield_rate) / 365",
    )
    last_accrual_date = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        comment="Timestamp of the last yield accrual run",
    )

    __table_args__ = (
        UniqueConstraint("contract_id", name="uq_investment_ledger_contract"),
    )
