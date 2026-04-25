import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    aws_region: str = os.getenv("AWS_REGION", "ap-southeast-1")
    aws_profile: str | None = os.getenv("AWS_PROFILE")
    aws_bedrock_region: str = os.getenv("AWS_BEDROCK_REGION", "ap-southeast-1")
    bedrock_model_id: str = os.getenv("BEDROCK_MODEL_ID", "apac.amazon.nova-micro-v1:0")


@lru_cache
def get_settings() -> Settings:
    return Settings()
