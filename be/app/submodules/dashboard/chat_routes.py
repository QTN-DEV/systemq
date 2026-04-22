"""Dashboard AI chat route — streams Claude responses for layout editing."""

import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.api.routes.auth import get_current_user
from app.schemas.auth import UserProfile
from app.services.ai import AnthropicPromptRunner, AnthropicPromptRunnerOptions

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

DASHBOARD_SYSTEM_PROMPT = """You are a Dashboard Layout AI. Your sole job is to help the user build and modify their personal React dashboard by generating or editing React component source code.

## Rules
1. The dashboard is rendered via `react-live` with `noInline` mode. The entry point must call `render(<App />)` at the end.
2. Do NOT include import statements — all React hooks and common UI primitives are globally available.
3. Respond conversationally with a brief explanation of what you changed, then call the `update_dashboard` tool with the complete, updated JSX source as the `content` argument.
4. Always produce a *full* replacement of the source (not a diff).
5. Keep the code simple, readable, and self-contained.
6. You may use `useState`, `useEffect`, and any built-in browser APIs.
7. Style using inline styles or Tailwind class strings (Tailwind is available at runtime).

## Example skeleton
```jsx
function App() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">My Dashboard</h1>
    </div>
  );
}
render(<App />);
```

Always call `update_dashboard` when you produce new code. Never return raw code without calling the tool.
"""


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
