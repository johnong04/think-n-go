"""Pydantic request / response schemas for the Contract & Escrow endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Wallet
# ---------------------------------------------------------------------------


class WalletOut(BaseModel):
    user_id: uuid.UUID
    balance: Decimal
    currency: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Contract - read (used in all phase responses)
# ---------------------------------------------------------------------------


class ContractOut(BaseModel):
    id: uuid.UUID
    invoice_num: Optional[str]
    supplier_id: uuid.UUID
    merchant_id: Optional[uuid.UUID]
    business_name: Optional[str]
    supplier_name: Optional[str]
    supplier_ph: Optional[str]
    supplier_location: Optional[str]
    receiver_name: Optional[str]
    receiver_ph: Optional[str]
    receiver_location: Optional[str]
    product: Optional[str]
    quantity: Optional[Decimal]
    price_per_unit: Optional[Decimal]
    total_price: Optional[Decimal]
    signature_url: Optional[str]
    principal_amount: Decimal
    total_amount: Optional[Decimal]
    status: str
    yield_rate: Decimal
    invoice_ref: Optional[str]
    net_days: Optional[str]
    description: Optional[str]
    date_created: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    agreed_at: Optional[datetime]
    approved_at: Optional[datetime]
    funded_at: Optional[datetime]
    solved_at: Optional[datetime]
    settled_at: Optional[datetime]

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Investment Ledger - read
# ---------------------------------------------------------------------------


class LedgerOut(BaseModel):
    contract_id: uuid.UUID
    amount_held: Decimal
    daily_yield_rate: Decimal
    accrued_interest: Decimal
    last_accrual_date: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Step 1: PROPOSED - Supplier proposes contract
# ---------------------------------------------------------------------------


class ContractPropose(BaseModel):
    supplier_id: uuid.UUID = Field(..., description="UUID of the proposing supplier")
    invoice_num: Optional[str] = Field(None, max_length=50)
    merchant_id: Optional[uuid.UUID] = Field(None, description="Optional merchant UUID")
    business_name: Optional[str] = Field(None, max_length=255)
    supplier_name: Optional[str] = Field(None, max_length=255)
    supplier_ph: Optional[str] = Field(None, max_length=20)
    supplier_location: Optional[str] = Field(None, max_length=2000)
    receiver_name: Optional[str] = Field(None, max_length=255)
    receiver_ph: Optional[str] = Field(None, max_length=20)
    receiver_location: Optional[str] = Field(None, max_length=2000)
    product: Optional[str] = Field(None, max_length=255)
    quantity: Optional[Decimal] = Field(None, ge=0)
    price_per_unit: Optional[Decimal] = Field(None, ge=0)
    total_price: Optional[Decimal] = Field(None, ge=0)
    signature_url: Optional[str] = Field(None, max_length=2000)
    principal_amount: Decimal = Field(..., gt=0, description="Invoice value in MYR")
    total_amount: Optional[Decimal] = Field(None, ge=0)
    yield_rate: Decimal = Field(
        default=Decimal("0.0350"),
        ge=0,
        le=1,
        description="Annual yield rate (e.g. 0.0350 = 3.5% p.a.)",
    )
    invoice_ref: Optional[str] = Field(None, max_length=128)
    net_days: Optional[str] = Field(None, max_length=16, examples=["Net-14", "Net-30"])
    description: Optional[str] = Field(None, max_length=512)


class UpdateContractProductRequest(BaseModel):
    product: Optional[str] = Field(None, max_length=255)
    quantity: Optional[Decimal] = Field(None, ge=0)
    price_per_unit: Optional[Decimal] = Field(None, ge=0)
    total_price: Optional[Decimal] = Field(None, ge=0)
    signature_url: Optional[str] = Field(None, max_length=2000)


class BulkProductUpdateItem(BaseModel):
    contract_id: Optional[uuid.UUID] = None
    invoice_num: Optional[str] = Field(None, max_length=50)
    product: Optional[str] = Field(None, max_length=255)
    quantity: Optional[Decimal] = Field(None, ge=0)
    price_per_unit: Optional[Decimal] = Field(None, ge=0)
    total_price: Optional[Decimal] = Field(None, ge=0)
    signature_url: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def validate_identifier(self) -> "BulkProductUpdateItem":
        if self.contract_id is None and not self.invoice_num:
            raise ValueError("Each item must include contract_id or invoice_num")
        return self


class BulkProductUpdateResult(BaseModel):
    updated: list[ContractOut]
    failed: list[dict[str, str]]


class UpdateContractMetadataRequest(BaseModel):
    invoice_num: Optional[str] = Field(None, max_length=50)
    business_name: Optional[str] = Field(None, max_length=255)
    supplier_name: Optional[str] = Field(None, max_length=255)
    supplier_ph: Optional[str] = Field(None, max_length=20)
    supplier_location: Optional[str] = Field(None, max_length=2000)
    receiver_name: Optional[str] = Field(None, max_length=255)
    receiver_ph: Optional[str] = Field(None, max_length=20)
    receiver_location: Optional[str] = Field(None, max_length=2000)
    invoice_ref: Optional[str] = Field(None, max_length=128)
    net_days: Optional[str] = Field(None, max_length=16)
    description: Optional[str] = Field(None, max_length=512)


class BulkMetadataUpdateItem(BaseModel):
    contract_id: Optional[uuid.UUID] = None
    invoice_num: Optional[str] = Field(None, max_length=50)
    business_name: Optional[str] = Field(None, max_length=255)
    supplier_name: Optional[str] = Field(None, max_length=255)
    supplier_ph: Optional[str] = Field(None, max_length=20)
    supplier_location: Optional[str] = Field(None, max_length=2000)
    receiver_name: Optional[str] = Field(None, max_length=255)
    receiver_ph: Optional[str] = Field(None, max_length=20)
    receiver_location: Optional[str] = Field(None, max_length=2000)
    invoice_ref: Optional[str] = Field(None, max_length=128)
    net_days: Optional[str] = Field(None, max_length=16)
    description: Optional[str] = Field(None, max_length=512)

    @model_validator(mode="after")
    def validate_identifier(self) -> "BulkMetadataUpdateItem":
        if self.contract_id is None and not self.invoice_num:
            raise ValueError("Each item must include contract_id or invoice_num")
        return self


class BulkMetadataUpdateResult(BaseModel):
    updated: list[ContractOut]
    failed: list[dict[str, str]]


# ---------------------------------------------------------------------------
# Step 2: AGREED - Merchant accepts terms
# ---------------------------------------------------------------------------


class MerchantAgreeRequest(BaseModel):
    contract_id: uuid.UUID
    merchant_id: uuid.UUID = Field(..., description="UUID of the agreeing merchant")


# ---------------------------------------------------------------------------
# Step 3: FUNDED_INVESTED - Fund trigger
# ---------------------------------------------------------------------------


class FundContractRequest(BaseModel):
    contract_id: uuid.UUID


class FundContractResponse(BaseModel):
    contract: ContractOut
    ledger: LedgerOut
    supplier_notified: bool = True
    message: str


# ---------------------------------------------------------------------------
# Yield accrual (called by scheduler or manually for demo)
# ---------------------------------------------------------------------------


class AccrueYieldRequest(BaseModel):
    contract_id: uuid.UUID


# ---------------------------------------------------------------------------
# Step 4: SETTLED - Merchant releases payout
# ---------------------------------------------------------------------------


class SettleRequest(BaseModel):
    contract_id: uuid.UUID


class SettleResponse(BaseModel):
    contract_id: uuid.UUID
    status: str
    payout_to_supplier: Decimal = Field(
        description="Full principal released to supplier"
    )
    rebate_to_merchant: Decimal = Field(
        description="Accrued interest returned to merchant as cashback"
    )
    accrued_interest_captured: Decimal


# ---------------------------------------------------------------------------
# Generic contract_id-only request (shared by multiple endpoints)
# ---------------------------------------------------------------------------


class ContractIdRequest(BaseModel):
    contract_id: uuid.UUID
