import json
from typing import List, Dict, Any
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.services.ai import AnthropicPromptRunner, AnthropicPromptRunnerOptions

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/stream")
async def chat_stream(request: Request):
    body = await request.json()
    messages = body.get("messages", [])
    
    prompt = ""
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
        system_prompt=(
            "1. **Validation:** Before updating or creating an employee, search all positions, "
            "divisions, and employment types using the tools to ensure values are allowed.\n"
            "2. **Summarization Strategy (Map-Reduce):** When asked to summarize large ranges "
            "of standup data (e.g., a month), DO NOT fetch all data at once. Instead:\n"
            "   - Call the tool to fetch data in smaller, logical increments (e.g., 5-day windows).\n"
            "   - Synthesize the findings of each window internally.\n"
            "   - Only after processing all windows, provide a final, high-level consolidated summary.\n"
            "   - Focus on persistent blockers, major milestones, and team trajectory."
        )
    )
    
    runner = AnthropicPromptRunner(options)

    async def generate():
        async for chunk in runner.run():
            yield f"data: {chunk['data']}\n\n"
            
    return StreamingResponse(generate(), media_type="text/event-stream")
