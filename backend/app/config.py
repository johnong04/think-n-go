from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Alibaba Cloud Configuration

    Supports both standard Access Keys and STS (temporary) credentials.
    For STS credentials, ensure these env variables are set:
    - ALIYUN_ACCESS_KEY_ID (STS token ID)
    - ALIYUN_ACCESS_KEY_SECRET (STS token secret)
    - ALIYUN_SECURITY_TOKEN (STS session token)
    """

    # Alibaba Cloud credentials (used by EnvironmentVariableCredentialsProvider)
    # These can also be ALIBABA_* prefixed
    aliyun_access_key_id: Optional[str] = None
    aliyun_access_key_secret: Optional[str] = None
    aliyun_security_token: Optional[str] = None
    alibaba_access_key_id: Optional[str] = None
    alibaba_access_key_secret: Optional[str] = None

    # Region configuration
    alibaba_region: str = "cn-hangzhou"

    # OSS Configuration
    alibaba_oss_bucket: Optional[str] = None
    alibaba_oss_endpoint: Optional[str] = None

    # SMS Configuration
    alibaba_sms_sign_name: Optional[str] = None
    alibaba_sms_template_id: Optional[str] = None

    # Email Configuration
    alibaba_email_account_name: Optional[str] = None

    # API Configuration
    api_host: str = "127.0.0.1"
    api_port: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()  # type: ignore
