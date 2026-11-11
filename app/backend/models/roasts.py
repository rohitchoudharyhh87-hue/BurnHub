"""Roast models — a roast is either direct (target_user_id) or in-battle (battle_id+side)."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from models.users import _now, _uuid


class Roast(BaseModel):
    id: str = Field(default_factory=_uuid)
    author_id: str
    author_name: str
    author_avatar: str = "🔥"
    text: str
    theme: str = "genz"
    ai_generated: bool = False
    # direct-roast fields
    target_user_id: str | None = None
    target_name: str | None = None
    target_avatar: str | None = None
    # battle-roast fields
    battle_id: str | None = None
    side: str | None = None
    # engagement
    ai_score: int | None = None
    critique: str | None = None
    fires: int = 0
    fired_by: list[str] = []
    voters: list[str] = []
    created_at: datetime = Field(default_factory=_now)


class RoastCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    theme: str = "genz"
    target_user_id: str | None = None
    battle_id: str | None = None
    ai_generated: bool = False


class FeedFilter(str):
    LATEST = "latest"
    HOT = "hot"
    HALL = "hall"
