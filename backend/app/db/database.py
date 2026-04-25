"""PostgreSQL database connection using SQLAlchemy async engine (AWS RDS)."""

import json
import os
import ssl
from urllib.parse import quote_plus

import boto3
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# Build the async DSN from env vars
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "tngo-db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
AWS_SECRETS_MANAGER_SECRET_ARN = os.getenv(
    "AWS_SECRETS_MANAGER_SECRET_ARN", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-1")
DB_SSL_MODE = os.getenv("DB_SSL_MODE", "prefer").lower()
DB_SSL_ROOT_CERT = os.getenv("DB_SSL_ROOT_CERT", "")


def _looks_like_placeholder(value: str) -> bool:
    lowered = value.strip().lower()
    return lowered in {"", "your_rds_password", "changeme", "placeholder"}


def _password_from_secrets_manager() -> str | None:
    if not AWS_SECRETS_MANAGER_SECRET_ARN:
        return None

    try:
        client = boto3.client("secretsmanager", region_name=AWS_REGION)
        response = client.get_secret_value(
            SecretId=AWS_SECRETS_MANAGER_SECRET_ARN)
        secret_string = response.get("SecretString")
        if not secret_string:
            return None
        parsed = json.loads(secret_string)
        password = parsed.get("password")
        return str(password) if password else None
    except Exception:
        # Keep startup resilient if AWS auth is unavailable in local/dev flows.
        return None


def _resolve_db_password() -> str:
    if not _looks_like_placeholder(DB_PASSWORD):
        return DB_PASSWORD

    secret_password = _password_from_secrets_manager()
    if secret_password:
        return secret_password

    return DB_PASSWORD


RESOLVED_DB_PASSWORD = _resolve_db_password()

DATABASE_URL = (
    f"postgresql+asyncpg://{DB_USER}:{quote_plus(RESOLVED_DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


def _build_ssl_context() -> ssl.SSLContext | bool | None:
    """Translate env SSL settings into asyncpg-compatible SSL options."""
    if DB_SSL_MODE in {"disable", "allow", "prefer"}:
        return None

    if DB_SSL_MODE == "require":
        return True

    context = ssl.create_default_context()
    if DB_SSL_ROOT_CERT and os.path.exists(DB_SSL_ROOT_CERT):
        context.load_verify_locations(DB_SSL_ROOT_CERT)

    if DB_SSL_MODE == "verify-ca":
        context.check_hostname = False
        return context

    if DB_SSL_MODE == "verify-full":
        context.check_hostname = True
        return context

    return None


connect_args = {}
ssl_option = _build_ssl_context()
if ssl_option is not None:
    connect_args["ssl"] = ssl_option

engine = create_async_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,       # keeps idle connections alive on RDS
    pool_size=5,
    max_overflow=10,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


async def get_db() -> AsyncSession:  # type: ignore[return]
    """FastAPI dependency: yields an async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
