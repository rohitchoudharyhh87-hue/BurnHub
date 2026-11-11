import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def today_iso(tz: str | None = None) -> str:
    """Today's date as YYYY-MM-DD in `tz` (default: APP_TZ env, else UTC)."""
    zone = tz or os.environ.get("APP_TZ", "UTC")
    return datetime.now(ZoneInfo(zone)).strftime("%Y-%m-%d")


def as_aware(dt: datetime) -> datetime:
    """Motor hands naive UTC datetimes back from BSON — normalize on read so
    nothing ever subtracts a naive datetime from an aware one (the 500 trap)."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def aware_doc(doc: dict) -> dict:
    """Copy of a Mongo doc with every datetime field made UTC-aware."""
    out = dict(doc)
    for key in ("created_at", "closed_at"):
        if isinstance(out.get(key), datetime):
            out[key] = as_aware(out[key])
    return out