"""Notification models."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from models.users import _now, _uuid


class Notification(BaseModel):
    id: str = Field(default_factory=_uuid)
    user_id: str
    type: str  # roast_received | battle_challenge | battle_result | fire | vote
    actor_name: str
    message: str
    link: str | None = None
    read: bool = False
    created_at: datetime = Field(default_factory=_now)
