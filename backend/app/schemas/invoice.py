from pydantic import BaseModel, Field


class InvoiceLineItem(BaseModel):
    product_name: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)


class InvoiceExtractionRequest(BaseModel):
    text: str = Field(..., min_length=1)


class InvoiceExtractionResponse(BaseModel):
    items: list[InvoiceLineItem]
