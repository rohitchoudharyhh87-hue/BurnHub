"""AI routes: BurnBot roast generation streamed over SSE."""

import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from lib.auth import require_user
from lib.llm import ROAST_THEMES, generate_roast_stream
from models.ai import RoastAssistRequest

router = APIRouter()


@router.post("/ai/roast-assist")
async def roast_assist(body: RoastAssistRequest, request: Request):
    await require_user(request)
    theme = body.theme if body.theme in ROAST_THEMES else "genz"

    async def event_stream():
        try:
            async for delta in generate_roast_stream(body.target_name, theme, body.context, body.intensity):
                yield f'data: {json.dumps({"t": delta})}\n\n'
            yield f'data: {json.dumps({"done": True})}\n\n'
        except Exception as exc:  # never leave the stream hanging mid-flight
            yield f'data: {json.dumps({"error": str(exc)})}\n\n'

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
