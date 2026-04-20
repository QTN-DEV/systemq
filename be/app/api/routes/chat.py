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
        system_prompt="Before updating or creating an employee, you must search all available positions, divisions, and employment types from the provided tools first to ensure the provided values are allowed."
    )
    runner = AnthropicPromptRunner(options)

    async def generate():
        async for chunk in runner.run():
            yield f"data: {chunk['data']}\n\n"
            
    return StreamingResponse(generate(), media_type="text/event-stream")
