"""Crew models."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from models.users import User, _now, _uuid


class Crew(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    emoji: str = "🔥"
    tagline: str = ""
    color: str = "#F97316"
    creator_id: str
    member_ids: list[str] = []
    wins: int = 0
    losses: int = 0
    burn_points: int = 0
    created_at: datetime = Field(default_factory=_now)


class CrewCreate(BaseModel):
    name: str = Field(min_length=2, max_length=30)
    emoji: str = Field(default="🔥", max_length=8)
    tagline: str = Field(default="", max_length=90)
    color: str = Field(default="#F97316", max_length=9)


class CrewDetail(Crew):
    members: list[User] = []
