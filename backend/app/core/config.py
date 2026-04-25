import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    aws_region: str = os.getenv("AWS_REGION", "ap-southeast-1")
    aws_profile: str | None = os.getenv("AWS_PROFILE")


@lru_cache
def get_settings() -> Settings:
    return Settings()
