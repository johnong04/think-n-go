from fastapi import FastAPI

from app.routers import aws, bedrock

app = FastAPI(title="Think N Go API")

app.include_router(aws.router)
app.include_router(bedrock.router)


@app.get("/")
async def root():
    return {"message": "Think N Go API"}
