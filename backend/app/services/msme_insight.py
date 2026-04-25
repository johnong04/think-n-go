from __future__ import annotations

import json
from typing import Any


def build_msme_insight_system_prompt() -> str:
    return (
        "You are helping explain a transaction-based demand pressure model result to a merchant. "
        "You must stay strictly grounded in the provided llm_summary. "
        "Do not invent missing facts such as business type, products, supplier names, or exact payment purposes. "
        "You only know this merchant has recurring large OUT patterns inferred from transaction timing and amount. "
        "If you mention the repayment or BNPL recommendation, describe it as a suggestion from the model, not a guaranteed approval. "
        "Use plain, supportive language. Keep the output concise and clear."
    )


def build_msme_insight_user_prompt(llm_summary: dict[str, Any]) -> str:
    payload = json.dumps(llm_summary, indent=2)
    return (
        "Write a concise merchant-facing insight based only on the llm_summary below.\n"
        "Requirements:\n"
        "- Explain the result in a helpful business tone.\n"
        "- Use only the provided reason_codes and numeric fields.\n"
        "- Do not claim you know the type of business.\n"
        "- Say 'large OUT pattern' or 'large outgoing payment pattern' instead of supplier, stock, or inventory.\n"
        "- Mention the suggested BNPL top-up as a model suggestion when relevant.\n"
        "- Keep it to one short paragraph.\n\n"
        f"llm_summary:\n{payload}"
    )


def build_msme_insight_headline(llm_summary: dict[str, Any]) -> str:
    result = llm_summary.get("result", {})
    label = str(result.get("demand_pressure_label", "Model")).strip() or "Model"
    topup = (
        llm_summary.get("calculation_trace", {}).get("suggested_bnpl_topup_rm") or 0
    )
    if isinstance(topup, (int, float)) and topup > 0:
        return f"{label} demand pressure; financing may help"
    return f"{label} demand pressure detected"
