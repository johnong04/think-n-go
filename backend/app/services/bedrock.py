from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

from app.core.config import Settings
from app.services.aws import create_aws_session


class BedrockError(RuntimeError):
    pass


def converse_text(
    settings: Settings,
    message: str,
    system_prompt: str | None = None,
    max_tokens: int = 512,
    temperature: float = 0.2,
) -> str:
    try:
        session = create_aws_session(settings, region_name=settings.aws_bedrock_region)
        client = session.client("bedrock-runtime")

        request = {
            "modelId": settings.bedrock_model_id,
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
