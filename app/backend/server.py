import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from lib.db import close_database, db, ensure_indexes, ping_database


class StatusCheckCreate(BaseModel):
    client_name: str


class StatusCheck(StatusCheckCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    try:
        await ping_database()
        await ensure_indexes()
        yield
    finally:
        close_database()


app = FastAPI(title="BurnHub API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")

configured_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip() and origin.strip() != "*"
]
app_url = os.environ.get("APP_URL", "").strip()
if app_url and app_url not in configured_origins:
    configured_origins.append(app_url)
if not configured_origins:
    configured_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@api_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "Hello World"}


@api_router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate) -> StatusCheck:
    status_obj = StatusCheck(**input.model_dump())
    await db.status_checks.insert_one(status_obj.model_dump())
    return status_obj


@api_router.get("/status", response_model=list[StatusCheck])
async def get_status_checks() -> list[StatusCheck]:
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


from routers import ai as ai_router
from routers import auth as auth_router
from routers import battles as battles_router
from routers import crews as crews_router
from routers import notifications as notifications_router
from routers import roasts as roasts_router
from routers import users as users_router

api_router.include_router(auth_router.router)
api_router.include_router(users_router.router)
api_router.include_router(crews_router.router)
api_router.include_router(battles_router.router)
api_router.include_router(roasts_router.router)
api_router.include_router(ai_router.router)
api_router.include_router(notifications_router.router)

app.include_router(api_router)