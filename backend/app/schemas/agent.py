from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from decimal import Decimal
from app.schemas.contracts import ContractOut

# ---------------------------------------------------------------------------
# Scenario A: Supplier-Led Liquidation
# ---------------------------------------------------------------------------

class OptimizeDiscountRequest(BaseModel):
    supplier_id: uuid.UUID
    target_cash: Decimal = Field(..., description="Amount of cash the supplier needs immediately")

class OptimizeDiscountResponse(BaseModel):
    suggested_discount_rate: Decimal = Field(..., description="Calculated discount rate (e.g., 0.01 for 1%)")
    target_contracts: List[uuid.UUID] = Field(..., description="List of contract IDs this discount applies to")
    message: str

class AuditArbitrageRequest(BaseModel):
    contract_id: uuid.UUID
    discount_rate: Decimal = Field(..., description="Discount rate offered by the supplier")

class ConsultantViewResponse(BaseModel):
    yield_calculation: str = Field(..., description="Mathematical output of yield over remaining days")
    discount_capture: str = Field(..., description="Mathematical output of the discount amount")
    decision_engine: str = Field(..., description="ACCEPT or REJECT based on Consultant Roast logic")

class SettleEarlyRequest(BaseModel):
    contract_id: uuid.UUID
    discount_rate: Decimal

# ---------------------------------------------------------------------------
# Scenario B: Merchant-Led BNPL
# ---------------------------------------------------------------------------

class VelocityAnalysisResponse(BaseModel):
    merchant_id: uuid.UUID
    predicted_shortfall_hours: int = Field(..., description="Hours until premium product stocks out")
    message: str

class UnderwriteRequest(BaseModel):
    merchant_id: uuid.UUID
    supplier_id: uuid.UUID
    principal_amount: Decimal = Field(..., description="Amount to secure via BNPL")

class UnderwriteResponse(BaseModel):
    contract_id: uuid.UUID
    status: str
    principal: Decimal
    funding_source: str
    message: str

class AuthorizeDispatchRequest(BaseModel):
    contract_id: uuid.UUID

class AuthorizeDispatchResponse(BaseModel):
    contract_id: uuid.UUID
    invoice_num: str
    status: str
    message: str
