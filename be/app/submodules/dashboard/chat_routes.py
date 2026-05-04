"""Dashboard AI chat route — streams Claude responses for layout editing."""

import logging
from collections.abc import AsyncIterable
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.sse import EventSourceResponse
from pydantic import BaseModel

from app.api.routes.auth import get_current_user
from app.schemas.auth import UserProfile
from app.submodules.ai import AnthropicRunner, PromptBlueprint, StreamChunkModel

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

_PROMPT_FILE = Path(__file__).parent / "prompts" / "dashboard_system_prompt.md"
DASHBOARD_SYSTEM_PROMPT = _PROMPT_FILE.read_text(encoding="utf-8")

logger = logging.getLogger(__name__)


class DashboardChatMessage(BaseModel):
    role: str
    content: str | list[Any]


class DashboardChatRequest(BaseModel):
    messages: list[DashboardChatMessage] = []
    current_content: str = ""


@router.post(
    "/chat/stream",
    response_class=EventSourceResponse,
)
async def dashboard_chat_stream(
    payload: DashboardChatRequest,
    current_user: UserProfile = Depends(get_current_user),
) -> AsyncIterable[StreamChunkModel]:

    logger.info(f"Received chat request with {len(payload.messages)} messages")

    # Build a conversation-style prompt from history
    prompt = ""
    if payload.current_content:
        prompt += f"[Current dashboard source]\n```jsx\n{payload.current_content}\n```\n\n"

    for m in payload.messages:
        role = m.role
        content = m.content
        if isinstance(content, list):
            text_parts = [c.get("text", "") for c in content if c.get("type") == "text"]
            content = "".join(text_parts)
        prompt += f"{role.capitalize()}: {content}\n"
    prompt += "Assistant: "

    blueprint = PromptBlueprint(
        template=prompt,
    )
    blueprint.set_system_prompt(DASHBOARD_SYSTEM_PROMPT)
    blueprint.set_model("claude-haiku-4-5-20251001")
    blueprint.configure_tools(allowed=["update_dashboard"])

    runner = AnthropicRunner(blueprint)

    async for chunk in runner.run():
        yield chunk
