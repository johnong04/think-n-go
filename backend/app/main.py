from fastapi import FastAPI

from app.routers import aws, bedrock, msme, msme_insight
from app.routers import alibaba

app = FastAPI(title="Think N Go API")

app.include_router(aws.router)
app.include_router(bedrock.router)
app.include_router(alibaba.router)
app.include_router(msme.router)
app.include_router(msme_insight.router)


@app.get("/")
async def root():
    return {"message": "Think N Go API"}
