from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError

from app.schemas.invoice import InvoiceExtractionResponse


class InvoiceExtractionError(RuntimeError):
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
