from __future__ import annotations

import json
import re
from typing import Any


def build_msme_insight_system_prompt() -> str:
    return (
        "You are helping explain a wallet-based cashflow warning to a small business owner. "
        "You must stay strictly grounded in the provided llm_summary. "
        "Do not invent missing facts such as business type, products, supplier names, or exact payment purposes. "
        "Avoid finance jargon. Do not use terms like baseline, outflow, demand pressure, or cycle unless there is no simpler phrase. "
        "Prefer words like money-in, payment, balance, shortfall, and top-up. "
        "If you mention the repayment or BNPL recommendation, describe it as a suggestion from the model, not a guaranteed approval. "
        "Use plain, supportive language. Return valid JSON only, with no markdown."
    )


def build_msme_insight_user_prompt(llm_summary: dict[str, Any]) -> str:
    payload = json.dumps(llm_summary, indent=2)
    return (
        "Write a merchant-facing explanation based only on the llm_summary below.\n"
        "Requirements:\n"
        "- Write for a regular MSME owner, not a finance analyst.\n"
        "- Use only the provided reason_codes and numeric fields.\n"
        "- Do not claim you know the type of business.\n"
        "- Say 'large payment' or 'similar past payment' instead of large OUT pattern.\n"
        "- Mention the suggested BNPL top-up as a model suggestion, not an approval.\n"
        "- No markdown headings, no bold markers, no bullet markdown, no hashtags.\n"
        "- Keep every sentence short and easy to scan.\n"
        "- Return exactly this JSON shape:\n"
        "{\n"
        '  "headline": "You may need extra cash soon",\n'
        '  "summary": "one simple sentence explaining the situation",\n'
        '  "main_numbers": [{"label": "Current balance", "value": "RM760"}, {"label": "Usual large payment", "value": "RM1,891"}],\n'
        '  "plain_reasons": ["simple reason", "simple reason", "simple reason"],\n'
        '  "repayment_text": "simple repayment sentence or null",\n'
        '  "caveat": "simple caveat"\n'
        "}\n\n"
        f"llm_summary:\n{payload}"
    )


def build_msme_insight_headline(llm_summary: dict[str, Any]) -> str:
    trace = llm_summary.get("calculation_trace", {})
    topup = trace.get("suggested_bnpl_topup_rm") or 0
    if isinstance(topup, (int, float)) and topup > 0:
        return "You may need extra cash soon"
    return "Your cashflow may need attention"


def clean_model_text(value: object) -> str:
    text = str(value or "").strip()
    text = re.sub(r"^#+\s*", "", text)
    text = text.replace("**", "").replace("__", "").replace("`", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
            stripped = "\n".join(lines[1:-1]).strip()

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("Model response did not contain JSON.")
    payload = json.loads(stripped[start : end + 1])
    if not isinstance(payload, dict):
        raise ValueError("Model response JSON was not an object.")
    return payload


def parse_msme_insight(raw_output: str, llm_summary: dict[str, Any]) -> dict[str, Any]:
    trace = llm_summary.get("calculation_trace", {})

    def rm(value: object, decimals: int = 0) -> str:
        try:
            return f"RM{float(value):,.{decimals}f}"
        except (TypeError, ValueError):
            return "RM0"

    fallback = {
        "headline": build_msme_insight_headline(llm_summary),
        "summary": (
            "Your wallet balance may not be enough for a large payment that usually "
            "happens around this time."
        ),
        "main_numbers": [
            {"label": "Current balance", "value": rm(trace.get("current_balance_rm"))},
            {"label": "Usual large payment", "value": rm(trace.get("typical_large_outflow_rm"))},
            {"label": "Possible shortfall", "value": rm(trace.get("estimated_cash_gap_rm"))},
            {"label": "Suggested top-up", "value": rm(trace.get("suggested_bnpl_topup_rm"))},
        ],
        "plain_reasons": [
            f"A similar large payment usually happens about every {trace.get('typical_cycle_days', 0):g} days.",
            f"It has been {trace.get('days_since_last_large_outflow', 0)} days since the last similar payment.",
            "Your recent money-in is higher than usual, which may help with repayment.",
        ],
        "repayment_text": (
            f"Estimated repayment is about {rm(trace.get('expected_5pct_daily_repayment_rm'), 2)} "
            f"per day for around {trace.get('estimated_repayment_days', 0)} days."
        ),
        "caveat": (
            "We do not know what the payment is for. This is based only on wallet "
            "transaction timing and amounts."
        ),
    }

    try:
        payload = extract_json_object(raw_output)
    except Exception:
        fallback["summary"] = clean_model_text(raw_output) or fallback["summary"]
        return fallback

    main_numbers = payload.get("main_numbers") or fallback["main_numbers"]
    if not isinstance(main_numbers, list):
        main_numbers = fallback["main_numbers"]

    cleaned_numbers: list[dict[str, str]] = []
    for item in main_numbers:
        if not isinstance(item, dict):
            continue
        label = clean_model_text(item.get("label"))
        value = clean_model_text(item.get("value"))
        if label and value:
            cleaned_numbers.append({"label": label, "value": value})

    plain_reasons = payload.get("plain_reasons") or fallback["plain_reasons"]
    if not isinstance(plain_reasons, list):
        plain_reasons = fallback["plain_reasons"]

    return {
        "headline": clean_model_text(payload.get("headline"))
        or build_msme_insight_headline(llm_summary),
        "summary": clean_model_text(payload.get("summary")) or fallback["summary"],
        "main_numbers": cleaned_numbers[:4] or fallback["main_numbers"],
        "plain_reasons": [
            clean_model_text(reason)
            for reason in plain_reasons
            if clean_model_text(reason)
        ][:3]
        or fallback["plain_reasons"],
        "repayment_text": clean_model_text(payload.get("repayment_text"))
        or fallback["repayment_text"],
        "caveat": clean_model_text(payload.get("caveat")) or fallback["caveat"],
    }
