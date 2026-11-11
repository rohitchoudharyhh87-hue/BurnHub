"""Roasts: the wall feed, firing roasts (direct or in-battle), fires and votes."""

from fastapi import APIRouter, HTTPException, Request
from pymongo import ReturnDocument

from lib.auth import require_user
from lib.db import db
from lib.dates import aware_doc
from lib.llm import ROAST_THEMES, judge_roast
from models.roasts import Roast, RoastCreate
from routers.notifications import push

router = APIRouter()

# Burn Points economy
POINTS_ROAST = 5          # for firing any roast
POINTS_PER_SCORE = 10     # author earns score // 10 extra from The Judge
POINTS_FIRE = 2           # to the roast author per fire
POINTS_VOTE = 3           # to the roast author per community vote


def _roast(doc: dict) -> Roast:
    return Roast(**aware_doc(doc))


@router.get("/roasts", response_model=list[Roast])
async def list_roasts(filter: str = "latest", target: str | None = None, author: str | None = None, battle: str | None = None):
    query: dict = {}
    if target:
        query["target_user_id"] = target
    if author:
        query["author_id"] = author
    if battle:
        query["battle_id"] = battle
    sort = [("created_at", -1)]
    if filter == "hot":
        sort = [("fires", -1), ("created_at", -1)]
    elif filter == "hall":
        sort = [("ai_score", -1), ("created_at", -1)]
    docs = await db.roasts.find(query).sort(sort).to_list(40)
    return [_roast(d) for d in docs]


@router.post("/roasts", response_model=Roast)
async def create_roast(body: RoastCreate, request: Request):
    user = await require_user(request)
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Write something first — even a lukewarm take counts")
    theme = body.theme if body.theme in ROAST_THEMES else "genz"

    battle_doc = None
    target_doc = None
    side = None
    if body.battle_id:
        battle_doc = await db.battles.find_one({"id": body.battle_id})
        if not battle_doc:
            raise HTTPException(status_code=404, detail="That arena never existed")
        if battle_doc["status"] != "open":
            raise HTTPException(status_code=409, detail="That battle is closed — the smoke has settled")
        if user["id"] in battle_doc["challenger_member_ids"]:
            side = "challenger"
        elif user["id"] in battle_doc["defender_member_ids"]:
            side = "defender"
        else:
            raise HTTPException(status_code=403, detail="Only the two sides roast in this arena")
        target_name = battle_doc["defender"]["name"] if side == "challenger" else battle_doc["challenger"]["name"]
    elif body.target_user_id:
        target_doc = await db.users.find_one({"id": body.target_user_id})
        if not target_doc:
            raise HTTPException(status_code=404, detail="That target does not exist")
        if target_doc["id"] == user["id"]:
            raise HTTPException(status_code=422, detail="Self-roasts are a cry for help — pick someone else")
        target_name = target_doc["username"]
    else:
        raise HTTPException(status_code=422, detail="Pick a target for the roast")

    score, critique = await judge_roast(text, target_name, theme)
    roast = Roast(
        author_id=user["id"],
        author_name=user["username"],
        author_avatar=user.get("avatar", "🔥"),
        text=text,
        theme=theme,
        ai_generated=body.ai_generated,
        target_user_id=target_doc["id"] if target_doc else None,
        target_name=target_doc["username"] if target_doc else None,
        target_avatar=target_doc.get("avatar") if target_doc else None,
        battle_id=battle_doc["id"] if battle_doc else None,
        side=side,
        ai_score=score,
        critique=critique,
    )
    await db.roasts.insert_one(roast.model_dump())

    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"burn_points": POINTS_ROAST + score // POINTS_PER_SCORE, "roast_count": 1}},
    )

    if battle_doc and battle_doc:
        opponent_members = (
            battle_doc["defender_member_ids"] if side == "challenger" else battle_doc["challenger_member_ids"]
        )
        for member_id in opponent_members:
            await push(
                member_id,
                "roast_received",
                user["username"],
                f'{user["username"]} fired a roast at your side in the arena — fight back!',
                f"/battles/{battle_doc['id']}",
            )
    elif target_doc:
        await push(
            target_doc["id"],
            "roast_received",
            user["username"],
            f'{user["username"]} just roasted you. The Judge gave it {score}/100 — roast back!',
            f"/?target={user['id']}",
        )

    return roast


@router.post("/roasts/{roast_id}/fire", response_model=Roast)
async def toggle_fire(roast_id: str, request: Request):
    user = await require_user(request)
    doc = await db.roasts.find_one({"id": roast_id})
    if not doc:
        raise HTTPException(status_code=404, detail="That roast evaporated")
    if user["id"] == doc["author_id"]:
        raise HTTPException(status_code=422, detail="Save the self-fire — let the crowd burn you in")

    if user["id"] in doc.get("fired_by", []):
        updated = await db.roasts.find_one_and_update(
            {"id": roast_id},
            {"$pull": {"fired_by": user["id"]}, "$inc": {"fires": -1}},
            return_document=ReturnDocument.AFTER,
        )
    else:
        updated = await db.roasts.find_one_and_update(
            {"id": roast_id},
            {"$addToSet": {"fired_by": user["id"]}, "$inc": {"fires": 1}},
            return_document=ReturnDocument.AFTER,
        )
        await db.users.update_one({"id": doc["author_id"]}, {"$inc": {"burn_points": POINTS_FIRE}})
        await push(
            doc["author_id"],
            "fire",
            user["username"],
            f'{user["username"]} dropped a 🔥 on your roast',
            f"/u/{doc['author_id']}",
        )
    return _roast(updated or doc)


@router.post("/roasts/{roast_id}/vote", response_model=Roast)
async def toggle_vote(roast_id: str, request: Request):
    user = await require_user(request)
    doc = await db.roasts.find_one({"id": roast_id})
    if not doc:
        raise HTTPException(status_code=404, detail="That roast evaporated")
    if not doc.get("battle_id"):
        raise HTTPException(status_code=422, detail="Voting is arena-only — take it to a battle")
    if user["id"] == doc["author_id"]:
        raise HTTPException(status_code=422, detail="Voting for your own roast? Bold. Denied.")

    if user["id"] in doc.get("voters", []):
        updated = await db.roasts.find_one_and_update(
            {"id": roast_id},
            {"$pull": {"voters": user["id"]}, "$inc": {"fires": 0}},
            return_document=ReturnDocument.AFTER,
        )
    else:
        updated = await db.roasts.find_one_and_update(
            {"id": roast_id},
            {"$addToSet": {"voters": user["id"]}},
            return_document=ReturnDocument.AFTER,
        )
        await db.users.update_one({"id": doc["author_id"]}, {"$inc": {"burn_points": POINTS_VOTE}})
        await push(
            doc["author_id"],
            "vote",
            user["username"],
            f'{user["username"]} voted for your roast in the arena',
            f"/battles/{doc['battle_id']}",
        )
    return _roast(updated or doc)
