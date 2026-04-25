import asyncio
import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy import text
from app.db.database import AsyncSessionLocal

async def init_agentic_functions():
    sql_file_path = os.path.join(os.path.dirname(__file__), 'agentic_functions.sql')
    
    print(f"Reading SQL from {sql_file_path}...")
    with open(sql_file_path, 'r') as file:
        sql_script = file.read()

    print("Executing SQL functions...")
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await session.execute(text(sql_script))
    
    print("Agentic functions initialized successfully.")

if __name__ == "__main__":
    asyncio.run(init_agentic_functions())
