import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

from models.roasts import Roast


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SideRef(BaseModel):
    kind: Literal["user", "crew"]
    id: str
    name: str
    emoji: str = "🔥"


class Battle(BaseModel):
    id: str = Field(default_factory=_uuid)
    mode: Literal["solo", "crew"]
    theme: str = "genz"
    challenger: SideRef
    defender: SideRef
    challenger_member_ids: list[str] = Field(default_factory=list)
    defender_member_ids: list[str] = Field(default_factory=list)
    status: Literal["open", "closed"] = "open"
    winner_id: str | None = None
    verdict: str | None = None
    challenger_score: int | None = None
    defender_score: int | None = None
    created_at: datetime = Field(default_factory=_now)
    closed_at: datetime | None = None


class BattleCreate(BaseModel):
    mode: Literal["solo", "crew"]
    defender_id: str
    theme: str = "genz"
    challenger_crew_id: str | None = None


class BattleDetail(Battle):
    roasts: list[Roast] = Field(default_factory=list)