from fastapi import APIRouter

from app.schemas.users import User

router = APIRouter()


@router.get("/users/", tags=["users"], response_model=list[User])
async def read_users():
    return [User(username="Rick"), User(username="Morty")]


@router.get("/users/me", tags=["users"], response_model=User)
async def read_user_me():
    return User(username="fakecurrentuser")


@router.get("/users/{username}", tags=["users"], response_model=User)
async def read_user(username: str):
    return User(username=username)
