"""User directory, roast passport (profile), leaderboard."""

from fastapi import APIRouter, HTTPException

from lib.db import db
from lib.dates import aware_doc
from models.users import ProfileResponse, User

router = APIRouter()


@router.get("/users", response_model=list[User])
async def list_users():
    docs = await db.users.find().sort("username", 1).to_list(200)
    return [User(**aware_doc(d)) for d in docs]


@router.get("/leaderboard", response_model=list[User])
async def leaderboard():
    docs = await db.users.find().sort("burn_points", -1).to_list(100)
    return [User(**aware_doc(d)) for d in docs]


@router.get("/users/{user_id}", response_model=ProfileResponse)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="No such roaster in the burn unit")
    rank = 1 + await db.users.count_documents({"burn_points": {"$gt": user.get("burn_points", 0)}})
    best = await db.roasts.find(
        {"author_id": user_id, "ai_score": {"$ne": None}}
    ).sort("ai_score", -1).to_list(1)
    best_roast = best[0]["text"] if best else None
    return ProfileResponse(
        user=User(**aware_doc(user)), rank=rank, best_roast=best_roast
    )
