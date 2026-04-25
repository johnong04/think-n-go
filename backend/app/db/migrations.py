"""Alembic / manual migration helper – creates all tables from ORM metadata.

Run once on a fresh RDS instance:
    python -m app.db.migrations
"""

import asyncio
import logging

from app.db.database import engine
from app.db.models import Base  # noqa: F401 – import triggers model registration

logger = logging.getLogger(__name__)


async def create_all_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("All tables created / verified.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(create_all_tables())
