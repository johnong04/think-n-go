from fastapi import FastAPI

from app.routers import alibaba, aws, bedrock, invoice, msme, msme_insight

app = FastAPI(title="Think N Go API")

app.include_router(aws.router)
app.include_router(bedrock.router)
app.include_router(invoice.router)
app.include_router(msme.router)
app.include_router(msme_insight.router)
app.include_router(alibaba.router)


@app.get("/")
async def root():
    return {"message": "Think N Go API"}
