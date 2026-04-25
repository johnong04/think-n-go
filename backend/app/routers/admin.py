from fastapi import APIRouter

from app.schemas.common import Message

router = APIRouter()


@router.post("/", response_model=Message)
async def update_admin():
    return Message(message="Admin updated")
