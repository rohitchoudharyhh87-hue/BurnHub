"""Idempotent demo seed for BurnHub: run `cd /app/backend && python seed.py`."""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from lib.db import db, ensure_indexes


def _stable_id(key: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"burnhub-seed:{key}"))


def _ago(days: float = 0, hours: float = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days, hours=hours)


USERS = [
    # username, avatar, color, bio, burn_points, wins, losses, streak, best_streak, roast_count
    ("Nova Blaze", "🔥", "#F43F5E", "Certified flame broker. I roast first, apologize never.", 486, 6, 2, 3, 4, 12),
    ("SirBurnsALot", "🎩", "#D97706", "Elizabethan insult artisan. Thee hast been warned.", 402, 5, 2, 2, 3, 10),
    ("EmberQueen", "👑", "#EA580C", "Reigning champion of the smoke. Bow before the blaze.", 355, 4, 1, 2, 2, 8),
    ("ToastyMike", "🍞", "#F59E0B", "I am the toast, not the roaster. Mostly.", 210, 2, 3, 0, 1, 7),
    ("GrilledCheese", "🧀", "#FBBF24", "Melty under pressure. Come at me, bread.", 145, 1, 2, 0, 1, 5),
    ("CaptainCringe", "🏴‍☠️", "#7C3AED", "My roasts sail at dawn. My jokes sink by noon.", 98, 0, 2, 0, 0, 4),
]

CREWS = [
    ("Toast Armada", "🍞", "#F59E0B", "We rise, we brown, we crumble walls.", 512, 3, 1),
    ("Charcoal Court", "🏛️", "#57534E", "Old money, new burns. Rights to roast reserved.", 478, 2, 2),
    ("The Microwavers", "📡", "#F43F5E", "Fast, hot, and slightly exploding.", 130, 0, 1),
]

SEED_ROASTS = [
    # author_idx, target_idx, theme, text, score, critique, fires, voters, days_ago
    (0, 3, "genz", "Mike, you're the human version of bread left out overnight — technically toast, spiritually a mistake 💀", 91, "Certified toast — butter-side down.", 14, [1, 2, 4], 2),
    (3, 0, "dad_joke", "Nova, you're like my lawnmower: loud, petty, and only useful when you're pushed", 74, "Dad energy detected. The crowd groaned — in a good way.", 6, [2], 2),
    (1, 4, "shakespearean", "Thou art a cheese of little faith, GrilledCheese — melted before the battle's heat e'en began", 88, "The bard weeps; the target melts.", 9, [0, 3, 5], 1),
    (4, 1, "corporate", "SirBurnsALot, your roasts read like quarterly reports: long, forgettable, and nobody claps at the end", 82, "Per my last assessment: ouch, effective immediately.", 11, [0, 2], 1),
    (2, 5, "pirate", "Cap'n Cringe, yer roasts be like yer ship — all sail, no wind, and the crew's already jumped", 85, "High seas, low blow. The arena approves.", 8, [0, 1, 3], 0),
    (5, 2, "genz", "EmberQueen, you're a sparkler at a wildfire convention — cute, loud, deeply outgunned", 69, "Cute attempt. The queen kept her crown.", 4, [3], 0),
]


async def seed() -> None:
    await ensure_indexes()

    user_ids: list[str] = []
    for username, avatar, color, bio, points, wins, losses, streak, best, roast_count in USERS:
        username_lower = username.lower()
        existing = await db.users.find_one({"username_lower": username_lower})
        if existing:
            user_ids.append(existing["id"])
            continue
        doc = {
            "id": _stable_id(f"user:{username_lower}"),
            "username": username,
            "username_lower": username_lower,
            "avatar": avatar,
            "color": color,
            "bio": bio,
            "burn_points": points,
            "wins": wins,
            "losses": losses,
            "streak": streak,
            "best_streak": best,
            "roast_count": roast_count,
            "created_at": _ago(days=30),
        }
        await db.users.update_one(
            {"username_lower": username_lower},
            {"$setOnInsert": doc},
            upsert=True,
        )
        stored = await db.users.find_one({"username_lower": username_lower})
        if not stored:
            raise RuntimeError(f"Unable to create seed user {username!r}")
        user_ids.append(stored["id"])
    print(f"seeded {len(user_ids)} users")

    crew_ids: list[str] = []
    for i, (name, emoji, color, tagline, points, wins, losses) in enumerate(CREWS):
        existing = await db.crews.find_one({"name": name})
        if existing:
            crew_ids.append(existing["id"])
            continue
        # founders: alternating seeded users
        founder = user_ids[i]
        members = [founder, user_ids[(i + 3) % len(user_ids)]]
        doc = {
            "id": _stable_id(f"crew:{name.lower()}"),
            "name": name,
            "emoji": emoji,
            "tagline": tagline,
            "color": color,
            "creator_id": founder,
            "member_ids": members,
            "wins": wins,
            "losses": losses,
            "burn_points": points,
            "created_at": _ago(days=20),
        }
        await db.crews.update_one({"id": doc["id"]}, {"$setOnInsert": doc}, upsert=True)
        crew_ids.append(doc["id"])
    print(f"seeded {len(crew_ids)} crews")

    # Crew war: Toast Armada vs Charcoal Court (open), seeded roasts on both sides.
    crew_battle = {
        "id": _stable_id("battle:crew-war"),
        "mode": "crew",
        "theme": "genz",
        "challenger": {"kind": "crew", "id": crew_ids[0], "name": CREWS[0][0], "emoji": CREWS[0][1]},
        "defender": {"kind": "crew", "id": crew_ids[1], "name": CREWS[1][0], "emoji": CREWS[1][1]},
        "challenger_member_ids": [user_ids[0], user_ids[3]],
        "defender_member_ids": [user_ids[1], user_ids[4]],
        "status": "open",
        "winner_id": None,
        "verdict": None,
        "challenger_score": None,
        "defender_score": None,
        "created_at": _ago(days=3),
        "closed_at": None,
    }
    await db.battles.update_one(
        {"id": crew_battle["id"]}, {"$setOnInsert": crew_battle}, upsert=True
    )

    # Solo duel: GrilledCheese challenged EmberQueen, nobody has roasted yet.
    solo_battle = {
        "id": _stable_id("battle:solo-duel"),
        "mode": "solo",
        "theme": "shakespearean",
        "challenger": {"kind": "user", "id": user_ids[4], "name": "GrilledCheese", "emoji": "🧀"},
        "defender": {"kind": "user", "id": user_ids[2], "name": "EmberQueen", "emoji": "👑"},
        "challenger_member_ids": [user_ids[4]],
        "defender_member_ids": [user_ids[2]],
        "status": "open",
        "winner_id": None,
        "verdict": None,
        "challenger_score": None,
        "defender_score": None,
        "created_at": _ago(hours=6),
        "closed_at": None,
    }
    await db.battles.update_one(
        {"id": solo_battle["id"]}, {"$setOnInsert": solo_battle}, upsert=True
    )
    print("seeded 2 open battles (1 crew war, 1 duel)")

    battle_roasts = [
        # side, author_idx, battle, theme, text, score, critique, fires, voters, hours_ago
        ("challenger", 0, crew_battle["id"], "genz", "Charcoal Court, you're the human version of a 2am infomercial — loud, dated, and nobody bought in", 87, "Crisp, quick, mildly devastating.", 7, [2, 4], 20),
        ("defender", 1, crew_battle["id"], "genz", "Toast Armada, your whole crew is a group project where the bread did all the work", 84, "The group project reference lands hard.", 5, [0], 18),
        ("challenger", 3, crew_battle["id"], "genz", "Charcoal Court has the energy of a fireplace decoration: looks warm, delivers nothing", 76, "Solid hit — decorative damage.", 3, [], 12),
    ]
    for roast_index, (side, author_idx, battle_id, theme, text, score, critique, fires, voters, hours) in enumerate(battle_roasts):
        author = {"id": user_ids[author_idx], "username": USERS[author_idx][0], "avatar": USERS[author_idx][1]}
        voter_ids = [user_ids[i] for i in voters]
        roast_doc = {
            "id": _stable_id(f"battle-roast:{roast_index}"),
            "author_id": author["id"],
            "author_name": author["username"],
            "author_avatar": author["avatar"],
            "text": text,
            "theme": theme,
            "ai_generated": True,
            "battle_id": battle_id,
            "side": side,
            "ai_score": score,
            "critique": critique,
            "fires": fires,
            "fired_by": voter_ids[:fires],
            "voters": voter_ids,
            "created_at": _ago(hours=hours),
        }
        await db.roasts.update_one(
            {"id": roast_doc["id"]}, {"$setOnInsert": roast_doc}, upsert=True
        )
        
    for roast_index, (author_idx, target_idx, theme, text, score, critique, fires, voters, days) in enumerate(SEED_ROASTS):
        author = {"id": user_ids[author_idx], "username": USERS[author_idx][0], "avatar": USERS[author_idx][1]}
        target = {"id": user_ids[target_idx], "username": USERS[target_idx][0], "avatar": USERS[target_idx][1]}
        voter_ids = [user_ids[i] for i in voters]
        roast_doc = {
            "id": _stable_id(f"wall-roast:{roast_index}"),
            "author_id": author["id"],
            "author_name": author["username"],
            "author_avatar": author["avatar"],
            "text": text,
            "theme": theme,
            "ai_generated": True,
            "target_user_id": target["id"],
            "target_name": target["username"],
            "target_avatar": target["avatar"],
            "battle_id": None,
            "side": None,
            "ai_score": score,
            "critique": critique,
            "fires": fires,
            "fired_by": voter_ids[:fires],
            "voters": voter_ids,
            "created_at": _ago(days=days),
        }
        await db.roasts.update_one(
            {"id": roast_doc["id"]}, {"$setOnInsert": roast_doc}, upsert=True
        )
    print("seeded roasts (wall + arena)")

    notifications = [
        (0, "roast_received", "SirBurnsALot", "SirBurnsALot roasted you: even thine shadow exiteth early. The Judge gave it 88/100 — roast back!", "/?target=" + user_ids[1], False, 5),
        (0, "battle_challenge", "GrilledCheese", "GrilledCheese challenged EmberQueen — wait, that's not you. Still: an arena is lit!", f"/battles/{solo_battle['id']}", False, 4),
        (0, "fire", "CaptainCringe", "CaptainCringe dropped a 🔥 on your roast", "/u/" + user_ids[0], True, 30),
        (3, "roast_received", "Nova Blaze", "Nova Blaze roasted you. The Judge gave it 91/100 — the toast is burnt, roast back!", "/?target=" + user_ids[0], False, 2),
    ]
    for notification_index, (user_idx, type_, actor, message, link, read, hours) in enumerate(notifications):
        notification_doc = {
            "id": _stable_id(f"notification:{notification_index}"),
            "user_id": user_ids[user_idx],
            "type": type_,
            "actor_name": actor,
            "message": message,
            "link": link,
            "read": read,
            "created_at": _ago(hours=hours),
        }
        await db.notifications.update_one(
            {"id": notification_doc["id"]},
            {"$setOnInsert": notification_doc},
            upsert=True,
        )
    print("seeded notifications")

    print("BurnHub seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
