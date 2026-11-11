from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

from lib.config import DB_NAME, MONGO_URL

if not MONGO_URL:
    raise RuntimeError("MONGO_URL is missing; configure it in app/backend/.env")
if not DB_NAME:
    raise RuntimeError("DB_NAME is missing; configure it in app/backend/.env")

client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]

INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [
        IndexModel([("username_lower", ASCENDING)], name="username_lower_unique", unique=True),
        IndexModel([("burn_points", DESCENDING)], name="burn_points_desc"),
    ],
    "sessions": [IndexModel([("id", ASCENDING)], name="id_unique", unique=True)],
    "crews": [
        IndexModel([("id", ASCENDING)], name="id_unique", unique=True),
        IndexModel([("burn_points", DESCENDING)], name="burn_points_desc"),
    ],
    "battles": [
        IndexModel([("id", ASCENDING)], name="id_unique", unique=True),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
    ],
    "roasts": [
        IndexModel([("id", ASCENDING)], name="id_unique", unique=True),
        IndexModel([("battle_id", ASCENDING), ("created_at", ASCENDING)], name="battle_created"),
        IndexModel([("target_user_id", ASCENDING), ("created_at", DESCENDING)], name="target_created"),
        IndexModel([("author_id", ASCENDING), ("created_at", DESCENDING)], name="author_created"),
        IndexModel([("fires", DESCENDING), ("created_at", DESCENDING)], name="fires_desc"),
        IndexModel([("ai_score", DESCENDING), ("created_at", DESCENDING)], name="ai_score_desc"),
    ],
    "notifications": [
        IndexModel([("id", ASCENDING)], name="id_unique", unique=True),
        IndexModel(
            [("user_id", ASCENDING), ("read", ASCENDING), ("created_at", DESCENDING)],
            name="user_read_created",
        ),
    ],
}


async def ping_database() -> None:
    await client.admin.command("ping")


async def ensure_indexes() -> None:
    for collection_name, indexes in INDEXES.items():
        await db[collection_name].create_indexes(indexes)


def close_database() -> None:
    client.close()