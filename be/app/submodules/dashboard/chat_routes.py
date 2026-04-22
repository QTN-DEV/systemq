"""Dashboard AI chat route — streams Claude responses for layout editing."""

from pathlib import Path
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.api.routes.auth import get_current_user
from app.schemas.auth import UserProfile
from app.services.ai import AnthropicPromptRunner, AnthropicPromptRunnerOptions

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

_PROMPT_FILE = Path(__file__).parent / "prompts" / "dashboard_system_prompt.md"
DASHBOARD_SYSTEM_PROMPT = _PROMPT_FILE.read_text(encoding="utf-8")


@router.post("/chat/stream")
async def dashboard_chat_stream(
    request: Request,
    current_user: UserProfile = Depends(get_current_user),
):
    body = await request.json()
    messages = body.get("messages", [])
    current_content = body.get("current_content", "")

    # Build a conversation-style prompt from history
    prompt = ""
    if current_content:
        prompt += f"[Current dashboard source]\n```jsx\n{current_content}\n```\n\n"

    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if isinstance(content, list):
            text_parts = [c.get("text", "") for c in content if c.get("type") == "text"]
            content = "".join(text_parts)
        prompt += f"{role.capitalize()}: {content}\n"
    prompt += "Assistant: "

    options = AnthropicPromptRunnerOptions(
        prompt_template="{prompt}",
        data={"prompt": prompt},
        working_directory=".",
        system_prompt=DASHBOARD_SYSTEM_PROMPT,
        max_turns=5,
        tools=["update_dashboard"],
    )

    runner = AnthropicPromptRunner(options)

    async def generate():
        async for chunk in runner.run():
            yield f"data: {chunk['data']}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
