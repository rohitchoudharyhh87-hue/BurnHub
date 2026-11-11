"""User + auth + leaderboard models."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(BaseModel):
    id: str = Field(default_factory=_uuid)
    username: str
    avatar: str = "🔥"
    color: str = "#F43F5E"
    bio: str = ""
    burn_points: int = 0
    wins: int = 0
    losses: int = 0
    streak: int = 0
    best_streak: int = 0
    roast_count: int = 0
    created_at: datetime = Field(default_factory=_now)


class LoginRequest(BaseModel):
    username: str = Field(min_length=2, max_length=24)
    avatar: str = Field(default="🔥", max_length=8)
    color: str = Field(default="#F43F5E", max_length=9)


class ProfileResponse(BaseModel):
    user: User
    rank: int
    best_roast: str | None = None
