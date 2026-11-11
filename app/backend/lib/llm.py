"""BurnBot (roast generation) and The Judge (scoring) — powered by the Emergent
LLM universal key. Every LLM path has a deterministic fallback so the app keeps
working when the model is unreachable."""

import json
import logging
import random
import re
import uuid

from lib.config import EMERGENT_LLM_KEY

logger = logging.getLogger(__name__)

_API_KEY = EMERGENT_LLM_KEY
_MODEL_PROVIDER = "anthropic"
_MODEL_ID = "claude-sonnet-5-5"

ROAST_THEMES: dict[str, dict[str, str]] = {
    "genz": {"label": "Gen-Z", "emoji": "🧢", "style": "internet-brained Gen-Z slang, lowercase chaos, skull-emoji energy"},
    "shakespearean": {"label": "Shakespearean", "emoji": "📜", "style": "Elizabethan verse, thee/thou, theatre-grade dramatic insults"},
    "dad_joke": {"label": "Dad Joke", "emoji": "☕", "style": "groan-worthy dad puns and lawn-observed truths"},
    "corporate": {"label": "Corporate", "emoji": "👔", "style": "passive-aggressive corporate memo / LinkedIn-thought-leader speak"},
    "pirate": {"label": "Pirate", "emoji": "🏴‍☠️", "style": "full pirate dialect, scurvy-riddled insults, arr-heavy"},
    "kindergarten": {"label": "Kindergarten", "emoji": "🧸", "style": "brutal playground rules delivered with kindergarten-teacher sweetness"},
    "victorian": {"label": "Victorian Ghost", "emoji": "👻", "style": "haunted Victorian phantom, fainting-couch melodrama"},
    "noir": {"label": "Film Noir", "emoji": "🕵️", "style": "hard-boiled 1940s detective narration, smoke and rain"},
}
THEME_IDS = list(ROAST_THEMES)

INTENSITY_HINTS = {
    "mild": "playful teasing, a warm slap on the wrist",
    "savage": "sharp, quotable,maximum wit — the crowd goes ooooh",
    "nuclear": "absolutely merciless, scorched-earth wit (still clean)",
}

BURNBOT_SYSTEM = (
    "You are BurnBot on BurnHub, a playful roast-battle app. You write ONE roast at a time. "
    "Rules: savage-but-clean — punch at habits, taste, vibes and life choices; never use slurs, "
    "profanity, sexual content, or jabs at protected traits (race, religion, gender, disability, body). "
    "Maximum 45 words. Output ONLY the roast text — no quotes, no preamble, no emoji spam (at most one)."
)

JUDGE_SYSTEM = (
    "You are The Judge on BurnHub, a playful roast-battle app scoring roasts for wit and savagery. "
    "You have thick skin and zero mercy. Reply with ONLY a JSON object, no markdown fences: "
    '{"score": <int 0-100>, "critique": "<one snarky sentence, max 14 words>"}.'
)

VERDICT_SYSTEM = (
    "You are The Judge closing a roast battle on BurnHub. Reply with ONLY a JSON object, no fences: "
    '{"verdict": "<one spicy sentence crowning the winner or calling the draw, max 24 words>"}.'
)

FALLBACK_ROASTS: dict[str, list[str]] = {
    "genz": [
        "you're the human version of a 2am leftover nugget — technically alive, mostly regret 💀",
        "your vibe? participation trophy with a screen-time problem",
        "you bring the same energy as wifi with one bar: technically here, useless to everyone",
    ],
    "shakespearean": [
        "Thou art the yawn at life's grand play — even thine shadow exiteth early, my dude",
        "Hark! A mind as empty as a0 playhouse on Monday, yet twice as dramatic",
        "Thy wit would freeze in summer; thine honour, already frosted over",
    ],
    "dad_joke": [
        "I'd roast you, kid, but you're already well done — the lawn has better comebacks",
        "You're like my coffee: lukewarm, bitter, and impossible to finish",
        "Son, you're the reason the garage door has a manual override",
    ],
    "corporate": [
        "Per my last observation, your potential remains an unlaunched roadmap item — circling back never",
        "Your performance review is in: you bring synergy the way a printer brings peace",
        "We've rebranded your role from 'teammate' to 'ambient office noise', effective immediately",
    ],
    "pirate": [
        "Ye be the scurvy of this crew — even the bilge rats file complaints about ye, arrr",
        "Yer face could scare the kraken back to the depths, ye landlubbin' plank",
        "I've met bilge water with more charm and twice the utility, arrr",
    ],
    "kindergarten": [
        "Sweetie, we share the crayons AND the talent — you brought neither to craft table today",
        "Bless your heart, you tried so hard at nap time AND at roasting — zero for two",
        "The snack table called: even the juice box has more personality than you, pumpkin",
    ],
    "victorian": [
        "What a spectre of disappointment thou art — even the séance asked you to wait outside",
        "Thy presence doth chill the room like a draft from a purse-funded manor",
        "I have seen finer wits haunting a poorhouse, and better manners in the plague",
    ],
    "noir": [
        "You walked in like a Tuesday with a grudge — and the room got two cents poorer",
        "The city's got problems, pal, but you're the only one that came pre-installed",
        "I've seen cleaner getaways than your logic, and smarter alibis than your face",
    ],
}

FALLBACK_CRITIQUES = [
    "Lukewarm. The flame reported you for impersonation.",
    "Technically words. Technically a roast. Barely.",
    "I have seen toast with more edge.",
    "Solid hit — the crowd flinched, the target shrugged.",
    "Certified burn. Butter-side down.",
    "The judge laughed, then remembered you wrote it.",
]


def _chat(system_message: str):
    if not _API_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY is not configured")
    from emergentintegrations.llm.chat import LlmChat

    return LlmChat(
        api_key=_API_KEY,
        session_id=f"burnhub-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model(_MODEL_PROVIDER, _MODEL_ID)


def _extract_json(raw: str) -> dict:
    """Strip fences / prose and pull out the first JSON object in the reply."""
    text = re.sub(r"```(?:json)?", "", raw or "").strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError(f"no JSON object in reply: {raw[:120]!r}")
    return json.loads(text[start : end + 1])


def _heuristic_score(text: str) -> int:
    score = 45 + min(30, len(text) // 6)
    for word in ("ur ", "you're", "your", "mom", "toast", "trash", "worse", "broke", "clown", "🤡", "💀"):
        if word in text.lower():
            score += 4
    return max(1, min(98, score))


async def generate_roast_stream(
    target_name: str, theme: str, context: str, intensity: str
):
    """Async generator of roast text deltas (BurnBot). Falls back to a canned
    theme roast if the model is unreachable."""
    theme_meta = ROAST_THEMES.get(theme, ROAST_THEMES["genz"])
    prompt = (
        f"Target: {target_name}\n"
        f"Style/theme: {theme_meta['label']} — {theme_meta['style']}\n"
        f"Intensity: {INTENSITY_HINTS.get(intensity, INTENSITY_HINTS['savage'])}\n"
        f"Extra ammo about the target: {context.strip() or 'none — go off vibes alone'}\n"
        "Write the single roast now."
    )
    if not _API_KEY:
        yield random.choice(FALLBACK_ROASTS.get(theme, FALLBACK_ROASTS["genz"]))
        return
    try:
        from emergentintegrations.llm.chat import StreamDone, TextDelta, UserMessage

        chat = _chat(BURNBOT_SYSTEM)
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(event, TextDelta):
                yield event.content
            elif isinstance(event, StreamDone):
                break
    except Exception as exc:
        logger.warning("generate_roast_stream fallback: %s", exc)
        yield random.choice(FALLBACK_ROASTS.get(theme, FALLBACK_ROASTS["genz"]))


async def judge_roast(text: str, target_name: str | None, theme: str) -> tuple[int, str]:
    """The Judge: returns (score 0-100, one-line snarky critique)."""
    if not _API_KEY:
        return _heuristic_score(text), random.choice(FALLBACK_CRITIQUES)
    try:
        from emergentintegrations.llm.chat import UserMessage

        chat = _chat(JUDGE_SYSTEM)
        prompt = (
            f'Roast to judge: "{text}"\n'
            f"Theme: {theme}\n"
            f"Target: {target_name or 'an open-feed victim'}\n"
            'JSON only: {"score": <0-100>, "critique": "..."}'
        )
        reply = await chat.send_message(UserMessage(text=prompt))
        data = _extract_json(reply)
        score = max(1, min(100, int(data.get("score", 0))))
        critique = str(data.get("critique", "")).strip()[:180]
        return score, critique or random.choice(FALLBACK_CRITIQUES)
    except Exception as exc:
        logger.warning("judge_roast fallback: %s", exc)
        return _heuristic_score(text), random.choice(FALLBACK_CRITIQUES)


async def battle_verdict(
    challenger_name: str, defender_name: str, challenger_score: int, defender_score: int
) -> str:
    """A one-line closing verdict for a finished battle."""
    if challenger_score == defender_score:
        return "A draw — the arena asked for a refund and got two."
    winner = challenger_name if challenger_score > defender_score else defender_name
    if not _API_KEY:
        return f"{winner} takes the crown — the smoke says it all."
    try:
        from emergentintegrations.llm.chat import UserMessage

        chat = _chat(VERDICT_SYSTEM)
        prompt = (
            f"Battle result: {challenger_name} scored {challenger_score}, "
            f"{defender_name} scored {defender_score}. Winner: {winner}.\n"
            'JSON only: {"verdict": "..."}'
        )
        reply = await chat.send_message(UserMessage(text=prompt))
        data = _extract_json(reply)
        verdict = str(data.get("verdict", "")).strip()[:220]
        return verdict or f"{winner} takes the crown — the smoke says it all."
    except Exception as exc:
        logger.warning("battle_verdict fallback: %s", exc)
        return f"{winner} takes the crown — the smoke says it all."
