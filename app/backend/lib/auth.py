"""Passwordless session auth: a handle IS the identity. Sessions live in Mongo,
the browser only ever sees an httpOnly cookie."""

import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, Request, Response
from pymongo.errors import DuplicateKeyError

SESSION_COOKIE = "burnhub_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days
USERNAME_RE = re.compile(r"^[A-Za-z0-9_ ]{2,24}$")


def normalize_username(raw: str) -> str:
    """Collapse whitespace so 'Nova  Blaze' and 'Nova Blaze' collide."""
    return " ".join(raw.split())


def validate_username(raw: str) -> str:
    username = normalize_username(raw)
    if not USERNAME_RE.match(username):
        raise HTTPException(
            status_code=422,
            detail="Handles are 2-24 characters: letters, numbers, spaces or underscores",
        )
    return username


async def find_or_create_user(username: str, avatar: str, color: str) -> dict:
    from lib.db import db

    existing = await db.users.find_one({"username_lower": username.lower()})
    if existing:
        return existing
    doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "username_lower": username.lower(),
        "avatar": avatar,
        "color": color,
        "bio": "",
        "burn_points": 0,
        "wins": 0,
        "losses": 0,
        "streak": 0,
        "best_streak": 0,
        "roast_count": 0,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await db.users.insert_one(doc)
        return doc
    except DuplicateKeyError:
        return await db.users.find_one({"username_lower": username.lower()})


async def create_session(response: Response, user_id: str) -> str:
    from lib.db import db

    session_id = str(uuid.uuid4())
    await db.sessions.insert_one(
        {
            "id": session_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc),
        }
    )
    response.set_cookie(
        SESSION_COOKIE,
        session_id,
        httponly=True,
        samesite="lax",
        max_age=SESSION_TTL_SECONDS,
    )
    return session_id


async def destroy_session(request: Request, response: Response) -> None:
    from lib.db import db

    session_id = request.cookies.get(SESSION_COOKIE)
    if session_id:
        await db.sessions.delete_one({"id": session_id})
    response.delete_cookie(SESSION_COOKIE)


async def get_current_user(request: Request) -> dict | None:
    from lib.db import db

    session_id = request.cookies.get(SESSION_COOKIE)
    if not session_id:
        return None
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        return None
    return await db.users.find_one({"id": session["user_id"]})


async def require_user(request: Request) -> dict:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Pick a handle first to join the burn unit")
    return user
