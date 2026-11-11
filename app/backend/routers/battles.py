"""Battles: 1v1 duels and crew wars, with AI-judge + community scoring."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from lib.auth import require_user
from lib.db import db
from lib.dates import aware_doc
from lib.llm import ROAST_THEMES, battle_verdict
from models.battles import Battle, BattleCreate, BattleDetail, SideRef
from routers.notifications import push

router = APIRouter()

POINTS_WIN = 25
POINTS_LOSS = 10
POINTS_DRAW = 15


def _battle(doc: dict) -> Battle:
    return Battle(**aware_doc(doc))


@router.get("/battles", response_model=list[Battle])
async def list_battles():
    docs = await db.battles.find().sort("created_at", -1).to_list(50)
    return [_battle(d) for d in docs]


@router.get("/battles/{battle_id}", response_model=BattleDetail)
async def get_battle(battle_id: str):
    doc = await db.battles.find_one({"id": battle_id})
    if not doc:
        raise HTTPException(status_code=404, detail="That arena never existed")
    roast_docs = await db.roasts.find({"battle_id": battle_id}).sort("created_at", 1).to_list(1000)
    from models.roasts import Roast

    return BattleDetail(**aware_doc(doc), roasts=[Roast(**aware_doc(r)) for r in roast_docs])


@router.post("/battles", response_model=Battle)
async def create_battle(body: BattleCreate, request: Request):
    user = await require_user(request)
    theme = body.theme if body.theme in ROAST_THEMES else "genz"

    if body.mode == "solo":
        defender = await db.users.find_one({"id": body.defender_id})
        if not defender:
            raise HTTPException(status_code=404, detail="That roaster does not exist")
        if defender["id"] == user["id"]:
            raise HTTPException(status_code=422, detail="You cannot duel yourself — the mirror loses anyway")
        challenger_ref = SideRef(kind="user", id=user["id"], name=user["username"], emoji=user.get("avatar", "🔥"))
        defender_ref = SideRef(kind="user", id=defender["id"], name=defender["username"], emoji=defender.get("avatar", "🔥"))
        challenger_members = [user["id"]]
        defender_members = [defender["id"]]
    else:
        challenger_crew = await db.crews.find_one({"id": body.challenger_crew_id}) if body.challenger_crew_id else None
        if not challenger_crew:
            raise HTTPException(status_code=422, detail="Join or found a crew before declaring crew war")
        if user["id"] not in challenger_crew.get("member_ids", []):
            raise HTTPException(status_code=403, detail="Only crew members can declare war for their crew")
        defender_crew = await db.crews.find_one({"id": body.defender_id})
        if not defender_crew:
            raise HTTPException(status_code=404, detail="That crew disbanded (or never existed)")
        if defender_crew["id"] == challenger_crew["id"]:
            raise HTTPException(status_code=422, detail="Pick a rival crew — civil war is bad for morale")
        challenger_ref = SideRef(kind="crew", id=challenger_crew["id"], name=challenger_crew["name"], emoji=challenger_crew.get("emoji", "🔥"))
        defender_ref = SideRef(kind="crew", id=defender_crew["id"], name=defender_crew["name"], emoji=defender_crew.get("emoji", "🔥"))
        challenger_members = challenger_crew.get("member_ids", [])
        defender_members = defender_crew.get("member_ids", [])

    battle = Battle(
        mode=body.mode,
        theme=theme,
        challenger=challenger_ref,
        defender=defender_ref,
        challenger_member_ids=challenger_members,
        defender_member_ids=defender_members,
    )
    await db.battles.insert_one(battle.model_dump())

    for member_id in defender_members:
        await push(
            member_id,
            "battle_challenge",
            user["username"],
            f'You have been challenged to a {battle.theme} roast battle — the arena is lit!',
            f"/battles/{battle.id}",
        )
    return battle


@router.post("/battles/{battle_id}/close", response_model=Battle)
async def close_battle(battle_id: str, request: Request):
    user = await require_user(request)
    doc = await db.battles.find_one({"id": battle_id})
    if not doc:
        raise HTTPException(status_code=404, detail="That arena never existed")
    if doc["status"] != "open":
        raise HTTPException(status_code=409, detail="This battle already has a verdict")
    if user["id"] not in doc["challenger_member_ids"] + doc["defender_member_ids"]:
        raise HTTPException(status_code=403, detail="Only the two sides can close the battle")

    roast_docs = await db.roasts.find({"battle_id": battle_id}).to_list(1000)

    def side_score(side: str) -> int:
        total = 0
        for r in roast_docs:
            if r.get("side") != side:
                continue
            total += (r.get("ai_score") or 0) + 4 * len(r.get("voters", [])) + r.get("fires", 0)
        return total

    challenger_score = side_score("challenger")
    defender_score = side_score("defender")
    if challenger_score > defender_score:
        winner_id = doc["challenger"]["id"]
    elif defender_score > challenger_score:
        winner_id = doc["defender"]["id"]
    else:
        winner_id = None

    verdict = await battle_verdict(
        doc["challenger"]["name"], doc["defender"]["name"], challenger_score, defender_score
    )

    updated = await db.battles.find_one_and_update(
        {"id": battle_id},
        {
            "$set": {
                "status": "closed",
                "winner_id": winner_id,
                "verdict": verdict,
                "challenger_score": challenger_score,
                "defender_score": defender_score,
                "closed_at": datetime.now(timezone.utc),
            }
        },
        return_document=True,
    )
    battle = _battle(await db.battles.find_one({"id": battle_id}) or doc)

    # User-level scoring: burn points for everyone; solo battles also move W/L and streaks.
 
    winner_members = (
        doc["challenger_member_ids"] if winner_id == doc["challenger"]["id"]
        else doc["defender_member_ids"] if winner_id == doc["defender"]["id"]
        else []
    )
    loser_members = (
        doc["defender_member_ids"] if winner_id == doc["challenger"]["id"]
        else doc["challenger_member_ids"] if winner_id == doc["defender"]["id"]
        else []
    )

    for member_id in winner_members:
        inc: dict = {"burn_points": POINTS_WIN}
        if doc["mode"] == "solo":
            inc.update({"wins": 1, "streak": 1})
        await db.users.update_one({"id": member_id}, {"$inc": inc})
        if doc["mode"] == "solo":
            u = await db.users.find_one({"id": member_id})
            await db.users.update_one(
                {"id": member_id},
                {"$set": {"best_streak": max(u.get("best_streak", 0), u.get("streak", 0)), "streak": u.get("streak", 0)}},
            )
    for member_id in loser_members:
        inc = {"burn_points": POINTS_LOSS}
        if doc["mode"] == "solo":
            inc.update({"losses": 1})
        await db.users.update_one({"id": member_id}, {"$inc": inc})
        if doc["mode"] == "solo":
            await db.users.update_one({"id": member_id}, {"$set": {"streak": 0}})
    if winner_id is None:
        for member_id in doc["challenger_member_ids"] + doc["defender_member_ids"]:
            await db.users.update_one({"id": member_id}, {"$inc": {"burn_points": POINTS_DRAW}})

    # Crew records for crew wars.
    if doc["mode"] == "crew" and winner_id is not None:
        winner_crew_id = winner_id
        loser_crew_id = doc["defender"]["id"] if winner_id == doc["challenger"]["id"] else doc["challenger"]["id"]
        await db.crews.update_one({"id": winner_crew_id}, {"$inc": {"wins": 1, "burn_points": POINTS_WIN}})
        await db.crews.update_one({"id": loser_crew_id}, {"$inc": {"losses": 1, "burn_points": POINTS_LOSS}})

    for member_id in doc["challenger_member_ids"] + doc["defender_member_ids"]:
        await push(
            member_id,
            "battle_result",
            "The Judge",
            verdict,
            f"/battles/{battle_id}",
        )

    return battle
