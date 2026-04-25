from fastapi import Depends, FastAPI

from app.dependencies import get_query_token
from app.routers import admin, items, users

app = FastAPI(title="Think N Go API")

app.include_router(users.router)
app.include_router(items.router)
app.include_router(
    admin.router,
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_query_token)],
    responses={418: {"description": "I'm a teapot"}},
)


@app.get("/")
async def root():
    return {"message": "Hello Bigger Applications!"}
