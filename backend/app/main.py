from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.routers import aws, bedrock, alibaba, invoice, msme, msme_insight
from app.routers import contracts as contracts_router
from app.db.migrations import create_all_tables
from app.scheduler import start_scheduler, stop_scheduler
from backend.app.routers import msme
from backend.app.services import invoice, msme_insight, msme_insight

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create DB tables + start scheduler. Shutdown: stop scheduler."""
    logger.info("Starting up Think N Go API…")
    try:
        await create_all_tables()
    except Exception as exc:
        logger.warning("DB migration skipped (check DB connection): %s", exc)
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("Think N Go API shut down.")


app = FastAPI(
    title="Think N Go API",
    description="Agentic Liquidity Pipeline – Contract & Escrow Service",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(aws.router, tags=["AWS Services"])
app.include_router(bedrock.router, tags=["Bedrock AI"])
app.include_router(invoice.router)
app.include_router(msme.router)
app.include_router(msme_insight.router)
app.include_router(alibaba.router, tags=["Alibaba Cloud"])
app.include_router(contracts_router.router, tags=["Contracts"])


def custom_openapi():
    """Custom OpenAPI schema with enhanced documentation."""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Think N Go API",
        version="1.0.0",
        description="""\n## 🚀 Contract & Escrow Service
Agentic Liquidity Pipeline for B2B supply chain financing.

### 📋 Contract Lifecycle
1. **Propose** - Supplier initiates contract
2. **Agree** - Merchant accepts terms
3. **Fund** - Merchant funds escrow with GO+ vault
4. **Accrue** - System accrues daily yield (daily or manual)
5. **Settle** - Merchant confirms delivery, releases payout

### 🔐 Security
- All operations require authentication
- State transitions are immutable
- Cryptographic audit trail maintained

### 📊 API Tiers
- **Contracts**: Core escrow & settlement
- **AWS**: Cloud services integration
- **Bedrock**: AI-powered insights
- **Alibaba**: Cloud storage & logistics
""",
        routes=app.routes,
    )

    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/")
async def root():
    return {"message": "Think N Go API – Agentic Liquidity Pipeline v1.0"}
