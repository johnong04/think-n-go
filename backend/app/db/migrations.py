"""Alembic / manual migration helper – creates all tables and syncs missing columns from ORM metadata.

This script is enhanced to automatically detect and add missing columns to existing tables,
preventing the 'column does not exist' errors when models are updated.
"""

import asyncio
import logging
import sys
from sqlalchemy import text, inspect

from app.db.database import engine
from app.db.models import Base  # noqa: F401

logger = logging.getLogger(__name__)

async def create_all_tables() -> None:
    """Creates tables if missing, and adds columns if missing."""
    async with engine.begin() as conn:
        # 1. Create tables that don't exist
        await conn.run_sync(Base.metadata.create_all)
        
        # 2. Add columns that don't exist
        def sync_columns(sync_conn):
            inspector = inspect(sync_conn)
            db_tables = inspector.get_table_names()
            
            for table_name, table_obj in Base.metadata.tables.items():
                if table_name in db_tables:
                    db_columns = [col['name'] for col in inspector.get_columns(table_name)]
                    for col_name, col_obj in table_obj.columns.items():
                        if col_name not in db_columns:
                            logger.info(f"Adding missing column '{col_name}' to table '{table_name}'...")
                            # Determine type string (simplified for TIMESTAMPTZ, UUID, NUMERIC, etc.)
                            type_str = str(col_obj.type).upper()
                            if "VARCHAR" in type_str:
                                type_str = "VARCHAR"
                            elif "DATETIME" in type_str or "TIMESTAMP" in type_str:
                                type_str = "TIMESTAMPTZ"
                                
                            sql = f'ALTER TABLE {table_name} ADD COLUMN "{col_name}" {type_str}'
                            sync_conn.execute(text(sql))
        
        await conn.run_sync(sync_columns)
        
    logger.info("✅ Database schema synchronized with models.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(create_all_tables())
