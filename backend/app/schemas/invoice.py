from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class InvoiceLineItem(BaseModel):
    product_name: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)


class InvoiceExtractionRequest(BaseModel):
    text: str = Field(..., min_length=1)


class InvoiceExtractionResponse(BaseModel):
    items: list[InvoiceLineItem]


class InvoiceParty(BaseModel):
    name: str = Field(..., min_length=1)
    phone: str | None = None
    location: str | None = None
    tax_id: str | None = None


class InvoiceTerms(BaseModel):
    net_days: str = Field(default="Net-14", min_length=1, max_length=16)
    due_date: date | None = None
    payment_method: str = Field(default="TNG escrow")
    delivery_terms: str | None = None
    late_fee_note: str | None = None


class InvoiceDraft(BaseModel):
    invoice_num: str = Field(..., min_length=1, max_length=50)
    invoice_ref: str | None = Field(default=None, max_length=128)
    issue_date: date
    currency: str = Field(default="MYR", min_length=3, max_length=3)
    supplier: InvoiceParty
    receiver: InvoiceParty
    items: list[InvoiceLineItem] = Field(..., min_length=1)
    subtotal: float = Field(..., ge=0)
    tax_rm: float = Field(default=0, ge=0)
    shipping_rm: float = Field(default=0, ge=0)
    adjustment_rm: float = Field(default=0)
    total: float = Field(..., ge=0)
    principal_amount: float = Field(..., ge=0)
    terms: InvoiceTerms = Field(default_factory=InvoiceTerms)
    description: str | None = Field(default=None, max_length=512)
    notes: str | None = Field(default=None, max_length=1000)
    status: Literal["draft", "ready_for_review"] = "draft"

    @model_validator(mode="after")
    def normalize_totals(self) -> "InvoiceDraft":
        subtotal = round(
            sum(item.quantity * item.unit_price for item in self.items) + 1e-9,
            2,
        )
        total = round(
            subtotal + self.tax_rm + self.shipping_rm + self.adjustment_rm + 1e-9,
            2,
        )
        self.subtotal = subtotal
        self.total = max(0.0, total)
        self.principal_amount = self.total
        return self


class InvoiceDraftContext(BaseModel):
    default_supplier_name: str | None = None
    default_receiver_name: str | None = None
    currency: str = Field(default="MYR", min_length=3, max_length=3)


class InvoiceDraftRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    context: InvoiceDraftContext | None = None


class InvoiceRevisionRequest(BaseModel):
    draft: InvoiceDraft
    instruction: str = Field(..., min_length=1)


class InvoiceDraftResponse(BaseModel):
    draft: InvoiceDraft
