import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

from app.core.config import Settings


class AwsCredentialsError(RuntimeError):
    pass


def create_aws_session(settings: Settings) -> boto3.Session:
    session_kwargs = {"region_name": settings.aws_region}

    if settings.aws_profile:
        session_kwargs["profile_name"] = settings.aws_profile

    return boto3.Session(**session_kwargs)


def get_caller_identity(settings: Settings) -> dict[str, str]:
    try:
        session = create_aws_session(settings)
        return session.client("sts").get_caller_identity()
    except NoCredentialsError as exc:
        raise AwsCredentialsError(
            "AWS credentials were not found. Run `aws configure sso` and `aws sso login`, "
            "or provide credentials through the standard AWS credential chain."
        ) from exc
    except (BotoCoreError, ClientError) as exc:
        raise AwsCredentialsError(str(exc)) from exc
