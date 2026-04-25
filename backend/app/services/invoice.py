from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError

from app.schemas.invoice import InvoiceDraft, InvoiceExtractionResponse


class InvoiceExtractionError(RuntimeError):
    pass


class InvoiceDraftError(RuntimeError):
    pass


def build_invoice_extraction_system_prompt() -> str:
    return (
        "You extract invoice line items from natural language. "
        "Return JSON only. Do not include markdown, commentary, or extra keys. "
        "If multiple products are mentioned, return all of them. "
        "Normalize each item into product_name, quantity, and unit_price. "
        "If the user gives a single product, still return an array with one item."
    )


def build_invoice_extraction_user_prompt(text: str) -> str:
    return (
        "Extract invoice items from the text below.\n"
        "Return exactly this JSON shape:\n"
        '{\n  "items": [\n    {"product_name": "string", "quantity": number, "unit_price": number}\n  ]\n}\n'
        "Rules:\n"
        "- quantity must be numeric.\n"
        "- unit_price must be the price per unit.\n"
        "- Do not calculate totals.\n"
        "- Do not add items that are not explicitly mentioned.\n"
        "- If a field is unclear, make the best conservative extraction from the text.\n\n"
        f"Text:\n{text}"
    )


def extract_json_object(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
            stripped = "\n".join(lines[1:-1]).strip()

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise InvoiceExtractionError("Model response did not contain a JSON object.")
    return stripped[start : end + 1]


def parse_invoice_extraction_response(text: str) -> InvoiceExtractionResponse:
    try:
        payload = json.loads(extract_json_object(text))
        return InvoiceExtractionResponse.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise InvoiceExtractionError(
            "Model response could not be parsed into the expected invoice item structure."
        ) from exc


def build_invoice_draft_system_prompt() -> str:
    return (
        "You create structured commercial invoice drafts for a supplier-facing B2B workflow. "
        "Return JSON only. Do not include markdown, comments, or extra keys. "
        "Use MYR unless another currency is provided. "
        "If dates are unclear, use 2026-04-26 as the issue date and infer due_date from net_days. "
        "Do not invent unsupported claims, tax registration, or legal guarantees. "
        "Use practical terms suitable for a pre-contract invoice that may later fund an escrow."
    )


def build_invoice_draft_user_prompt(prompt: str, context: dict[str, Any] | None) -> str:
    context_text = json.dumps(context or {}, indent=2)
    return (
        "Create a complete invoice draft from the user request.\n"
        "Return exactly this JSON shape:\n"
        "{\n"
        '  "invoice_num": "string",\n'
        '  "invoice_ref": "string or null",\n'
        '  "issue_date": "YYYY-MM-DD",\n'
        '  "currency": "MYR",\n'
        '  "supplier": {"name": "string", "phone": "string or null", "location": "string or null", "tax_id": "string or null"},\n'
        '  "receiver": {"name": "string", "phone": "string or null", "location": "string or null", "tax_id": "string or null"},\n'
        '  "items": [{"product_name": "string", "quantity": number, "unit_price": number}],\n'
        '  "subtotal": number,\n'
        '  "tax_rm": number,\n'
        '  "shipping_rm": number,\n'
        '  "adjustment_rm": number,\n'
        '  "total": number,\n'
        '  "principal_amount": number,\n'
        '  "terms": {"net_days": "Net-14", "due_date": "YYYY-MM-DD or null", "payment_method": "string", "delivery_terms": "string or null", "late_fee_note": "string or null"},\n'
        '  "description": "string or null",\n'
        '  "notes": "string or null",\n'
        '  "status": "draft"\n'
        "}\n\n"
        "Rules:\n"
        "- Include all products explicitly requested.\n"
        "- Keep supplier and receiver realistic but conservative if partially missing.\n"
        "- If supplier is missing, use context.default_supplier_name or 'Hartono Manufacturing'.\n"
        "- If receiver is missing, use context.default_receiver_name or 'Ahmad bin Yusof'.\n"
        "- Put commercial terms in terms, not in notes only.\n"
        "- Do not add taxes unless the user asks for tax.\n"
        "- Do not add shipping unless the user asks for delivery or shipping charges.\n"
        "- Totals will be recalculated by the API after validation.\n\n"
        f"Context:\n{context_text}\n\n"
        f"User request:\n{prompt}"
    )


def build_invoice_revision_system_prompt() -> str:
    return (
        "You revise structured commercial invoice drafts. "
        "Return JSON only. Do not include markdown, comments, or extra keys. "
        "Preserve every existing field unless the instruction clearly changes it. "
        "Stay grounded in the current draft and user instruction."
    )


def build_invoice_revision_user_prompt(draft: dict[str, Any], instruction: str) -> str:
    draft_text = json.dumps(draft, indent=2, default=str)
    return (
        "Revise the current invoice draft according to the instruction.\n"
        "Return the full updated invoice draft using the exact same JSON shape as the current draft.\n"
        "Rules:\n"
        "- Preserve unchanged fields exactly where possible.\n"
        "- Apply only the requested change.\n"
        "- If the instruction changes payment terms, update net_days and due_date when possible.\n"
        "- If the instruction changes products, quantities, or prices, update items.\n"
        "- Totals will be recalculated by the API after validation.\n\n"
        f"Current draft:\n{draft_text}\n\n"
        f"Instruction:\n{instruction}"
    )


def parse_invoice_draft_response(text: str) -> InvoiceDraft:
    try:
        payload = json.loads(extract_json_object(text))
        return InvoiceDraft.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise InvoiceDraftError(
            "Model response could not be parsed into the expected invoice draft structure."
        ) from exc
