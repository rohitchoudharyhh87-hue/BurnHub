"""Crews: found, list, join, inspect."""

from fastapi import APIRouter, HTTPException, Request

from lib.auth import require_user
from lib.db import db
from lib.dates import aware_doc
from models.crews import Crew, CrewCreate, CrewDetail
from models.users import User

router = APIRouter()


@router.get("/crews", response_model=list[Crew])
async def list_crews():
    docs = await db.crews.find().sort("burn_points", -1).to_list(100)
    return [Crew(**aware_doc(d)) for d in docs]


@router.get("/crews/{crew_id}", response_model=CrewDetail)
async def get_crew(crew_id: str):
    crew = await db.crews.find_one({"id": crew_id})
    if not crew:
        raise HTTPException(status_code=404, detail="That crew disbanded (or never existed)")
    member_docs = await db.users.find({"id": {"$in": crew.get("member_ids", [])}}).to_list(200)
    members = [User(**aware_doc(m)) for m in member_docs]
    return CrewDetail(**aware_doc(crew), members=members)


@router.post("/crews", response_model=Crew)
async def create_crew(body: CrewCreate, request: Request):
    user = await require_user(request)
    crew = Crew(
        name=body.name.strip(),
        emoji=body.emoji or "🔥",
        tagline=body.tagline.strip(),
        color=body.color or "#F97316",
        creator_id=user["id"],
        member_ids=[user["id"]],
    )
    await db.crews.insert_one(crew.model_dump())
    return crew


@router.post("/crews/{crew_id}/join", response_model=Crew)
async def join_crew(crew_id: str, request: Request):
    user = await require_user(request)
    crew = await db.crews.find_one({"id": crew_id})
    if not crew:
        raise HTTPException(status_code=404, detail="That crew disbanded (or never existed)")
    if user["id"] in crew.get("member_ids", []):
        return Crew(**aware_doc(crew))
    updated = await db.crews.find_one_and_update(
        {"id": crew_id},
        {"$addToSet": {"member_ids": user["id"]}},
        return_document=True,  # motor returns the pre-update doc for a plain bool True
    )
    # find_one_and_update with return_document=True is pymongo's BEFORE — refetch to be safe
    await db.crews.update_one({"id": crew_id}, {"$addToSet": {"member_ids": user["id"]}})
    refreshed = await db.crews.find_one({"id": crew_id})
    return Crew(**aware_doc(refreshed or crew))