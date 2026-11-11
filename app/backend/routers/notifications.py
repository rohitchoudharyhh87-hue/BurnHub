"""Notifications feed + the push helper every other router imports."""

from fastapi import APIRouter, Request

from lib.auth import require_user
from lib.db import db
from lib.dates import aware_doc
from models.notifications import Notification

router = APIRouter()


async def push(user_id: str, type_: str, actor_name: str, message: str, link: str | None = None) -> None:
    """Fire a notification at a user. Best-effort: never let it break the caller."""
    try:
        n = Notification(user_id=user_id, type=type_, actor_name=actor_name, message=message, link=link)
        await db.notifications.insert_one(n.model_dump())
    except Exception:
        pass


@router.get("/notifications", response_model=list[Notification])
async def my_notifications(request: Request):
    user = await require_user(request)
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    return [Notification(**aware_doc(d)) for d in docs]


@router.post("/notifications/read-all", response_model=list[Notification])
async def mark_all_read(request: Request):
    user = await require_user(request)
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).to_list(50)
    return [Notification(**aware_doc(d)) for d in docs]
