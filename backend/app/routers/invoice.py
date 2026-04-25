from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.schemas.invoice import (
    InvoiceDraftRequest,
    InvoiceDraftResponse,
    InvoiceExtractionRequest,
    InvoiceExtractionResponse,
    InvoiceRevisionRequest,
)
from app.services.bedrock import BedrockError, converse_text
from app.services.invoice import (
    InvoiceDraftError,
    InvoiceExtractionError,
    build_invoice_draft_system_prompt,
    build_invoice_draft_user_prompt,
    build_invoice_extraction_system_prompt,
    build_invoice_extraction_user_prompt,
    build_invoice_revision_system_prompt,
    build_invoice_revision_user_prompt,
    parse_invoice_draft_response,
    parse_invoice_extraction_response,
)

router = APIRouter(prefix="/invoice", tags=["invoice"])


@router.post("/extract-items", response_model=InvoiceExtractionResponse)
async def extract_invoice_items(
    request: InvoiceExtractionRequest,
    settings: Settings = Depends(get_settings),
):
    try:
        raw_output = converse_text(
            settings=settings,
            system_prompt=build_invoice_extraction_system_prompt(),
            message=build_invoice_extraction_user_prompt(request.text),
            max_tokens=500,
            temperature=0,
        )
        return parse_invoice_extraction_response(raw_output)
    except (BedrockError, InvoiceExtractionError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/draft", response_model=InvoiceDraftResponse)
async def create_invoice_draft(
    request: InvoiceDraftRequest,
    settings: Settings = Depends(get_settings),
):
    try:
        raw_output = converse_text(
            settings=settings,
            system_prompt=build_invoice_draft_system_prompt(),
            message=build_invoice_draft_user_prompt(
                request.prompt,
                request.context.model_dump(mode="json") if request.context else None,
            ),
            max_tokens=1200,
            temperature=0.1,
        )
        return InvoiceDraftResponse(draft=parse_invoice_draft_response(raw_output))
    except (BedrockError, InvoiceDraftError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/revise", response_model=InvoiceDraftResponse)
async def revise_invoice_draft(
    request: InvoiceRevisionRequest,
    settings: Settings = Depends(get_settings),
):
    try:
        raw_output = converse_text(
            settings=settings,
            system_prompt=build_invoice_revision_system_prompt(),
            message=build_invoice_revision_user_prompt(
                request.draft.model_dump(mode="json"),
                request.instruction,
            ),
            max_tokens=1200,
            temperature=0.1,
        )
        return InvoiceDraftResponse(draft=parse_invoice_draft_response(raw_output))
    except (BedrockError, InvoiceDraftError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
