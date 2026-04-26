from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

from app.core.config import Settings
from app.services.aws import create_aws_session


class BedrockError(RuntimeError):
    pass


def converse_text(
    settings: Settings,
    message: str,
    model_id: str | None = None,
    system_prompt: str | None = None,
    max_tokens: int = 512,
    temperature: float = 0.2,
) -> str:
    try:
        session = create_aws_session(settings, region_name=settings.aws_bedrock_region)
        client = session.client("bedrock-runtime")

        request = {
            "modelId": model_id or settings.bedrock_model_id,
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": message}],
                }
            ],
            "inferenceConfig": {
                "maxTokens": max_tokens,
                "temperature": temperature,
            },
        }

        if system_prompt:
            request["system"] = [{"text": system_prompt}]

        response = client.converse(**request)
        content = response["output"]["message"]["content"]
        return "".join(block.get("text", "") for block in content)
    except NoCredentialsError as exc:
        raise BedrockError(
            "AWS credentials were not found. Run `aws sso login --profile <profile-name>`."
        ) from exc
    except ClientError as exc:
        error = exc.response.get("Error", {})
        message_text = error.get("Message") or error.get("Code") or str(exc)
        raise BedrockError(message_text) from exc
    except BotoCoreError as exc:
        raise BedrockError(str(exc)) from exc


import json
import logging

_logger = logging.getLogger(__name__)


def generate_reasoning(
    settings: Settings,
    *,
    role: str,
    task: str,
    facts: dict,
    fallback: str,
    max_chars: int = 280,
) -> str:
    """One-shot Bedrock call returning a plain-text reasoning blurb.

    Returns `fallback` on any error so callers never have to handle Bedrock failures.
    """
    system_prompt = (
        f"You are the {role} agent in a Malaysian B2B liquidity engine. "
        f"Task: {task}. "
        "Reply in plain English (no markdown, no bullets, no headings). "
        f"Be concrete, cite the numbers from FACTS, and keep it under {max_chars} characters. "
        "End with a single sentence stating the recommendation or outcome."
    )
    user_message = "FACTS:\n" + json.dumps(facts, default=str, indent=2)

    try:
        text_out = converse_text(
            settings,
            user_message,
            system_prompt=system_prompt,
            max_tokens=180,
            temperature=0.3,
        )
        cleaned = text_out.replace("**", "").replace("`", "").strip()
        if len(cleaned) > max_chars:
            cleaned = cleaned[: max_chars - 1].rstrip() + "…"
        return cleaned or fallback
    except Exception as exc:
        _logger.warning("Bedrock reasoning failed, using fallback: %s", exc)
        return fallback
