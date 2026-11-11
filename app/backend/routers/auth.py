"""Auth routes: pick-a-handle login, who-am-i, logout. All under /api/auth/*."""

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from lib.auth import (
    create_session,
    destroy_session,
    find_or_create_user,
    get_current_user,
    validate_username,
)
from lib.dates import aware_doc
from models.users import LoginRequest, User

router = APIRouter()


class OkResponse(BaseModel):
    ok: bool = True


@router.post("/auth/login", response_model=User)
async def login(body: LoginRequest, response: Response):
    username = validate_username(body.username)
    doc = await find_or_create_user(username, body.avatar or "🔥", body.color or "#F43F5E")
    await create_session(response, doc["id"])
    return User(**aware_doc(doc))


@router.get("/auth/me", response_model=User)
async def me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Pick a handle first")
    return User(**aware_doc(user))

@router.post("/auth/logout", response_model=OkResponse)
async def logout(request: Request, response: Response):
    await destroy_session(request, response)
    return OkResponse()
