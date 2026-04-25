from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_token_header
from app.schemas.items import Item

router = APIRouter(
    prefix="/items",
    tags=["items"],
    dependencies=[Depends(get_token_header)],
    responses={404: {"description": "Not found"}},
)

fake_items_db = {
    "plumbus": Item(name="Plumbus"),
    "gun": Item(name="Portal Gun"),
}


@router.get("/", response_model=dict[str, Item])
async def read_items():
    return fake_items_db


@router.get("/{item_id}", response_model=Item)
async def read_item(item_id: str):
    if item_id not in fake_items_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return fake_items_db[item_id]
