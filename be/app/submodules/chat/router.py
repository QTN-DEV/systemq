from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterable

from fastapi import APIRouter, Body, Form, HTTPException, Query, status
from fastapi.sse import EventSourceResponse

from app.submodules.auth import UseAuthContext, allow
from app.core import ResponseEnvelope
from app.submodules.ai import AnthropicRunner, PromptBlueprint, StreamChunkModel

from .dependencies import UseChatService, UseThread
from .schemas import (
    ChatThreadCreate,
    ChatThreadListItem,
    ChatThreadMessageSchema,
    ChatThreadRename,
    ChatThreadResponse,
    ChatThreadStreamRequest,
    GenerateTitleRequest,
    GenerateTitleResponse,
    PaginatedResponse,
)
from .constants import PROMPTS_DIR

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/list",
    response_model=ResponseEnvelope[PaginatedResponse[ChatThreadListItem]],
    summary="List the current user's chat threads (paginated)",
    operation_id="listChatThreads",
)
@allow(["read:all"])
async def list_chats(
    service: UseChatService,
    context: UseAuthContext,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> ResponseEnvelope[PaginatedResponse[ChatThreadListItem]]:
    skip = (page - 1) * page_size
    items = await service.list(context.user.id, skip=skip, limit=page_size)
    total = await service.count(context.user.id)
    return ResponseEnvelope(
        success=True,
        result=PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=(skip + page_size) < total,
        ),
    )


@router.post(
    "/create",
    response_model=ResponseEnvelope[ChatThreadResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat thread",
    operation_id="createChatThread",
)
@allow(["write:all"])
async def create_chat(
    service: UseChatService,
    context: UseAuthContext,
    payload: ChatThreadCreate = Body(default_factory=ChatThreadCreate),
) -> ResponseEnvelope[ChatThreadResponse]:
    handle = await service.create(
        user_id=context.user.id,
        title=payload.title,
        messages=payload.messages,
    )
    result = await handle.get()
    return ResponseEnvelope(success=True, result=result)


@router.get(
    "/{thread_id}",
    response_model=ResponseEnvelope[ChatThreadResponse],
    summary="Get a specific chat thread with messages",
    operation_id="getChatThread",
)
@allow(["read:all"])
async def get_chat(
    context: UseAuthContext,
    thread: UseThread,
) -> ResponseEnvelope[ChatThreadResponse]:
    try:
        result = await thread.get()
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat thread not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ResponseEnvelope(success=True, result=result)


@router.delete(
    "/{thread_id}",
    response_model=ResponseEnvelope[None],
    summary="Delete a chat thread",
    operation_id="deleteChatThread",
)
@allow(["write:all"])
async def delete_chat(
    context: UseAuthContext,
    thread: UseThread,
) -> ResponseEnvelope[None]:
    try:
        await thread.delete()
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat thread not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ResponseEnvelope(success=True, result=None)


@router.patch(
    "/{thread_id}/title",
    response_model=ResponseEnvelope[ChatThreadListItem],
    summary="Rename a chat thread",
    operation_id="updateChatThread",
)
@allow(["write:all"])
async def rename_chat(
    payload: ChatThreadRename,
    thread: UseThread,
    context: UseAuthContext,
) -> ResponseEnvelope[ChatThreadListItem]:
    try:
        result = await thread.update(title=payload.title)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat thread not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ResponseEnvelope(
        success=True,
        result=ChatThreadListItem(id=result.id, title=result.title),
    )


@router.post(
    "/{thread_id}/title",
    response_model=GenerateTitleResponse,
    summary="Generate a title for the chat thread based on messages",
    operation_id="generateChatThreadTitle",
)
@allow(["write:all"])
async def generate_chat_title(
    payload: GenerateTitleRequest,
    thread: UseThread,
    context: UseAuthContext,
) -> GenerateTitleResponse:
    import anthropic
    import json

    if not payload.messages:
        return GenerateTitleResponse(title="New Chat")

    try:
        from app.submodules.ai import PromptBlueprint

        chat_history_str = json.dumps(payload.messages, indent=2)
        blueprint = PromptBlueprint(template="{{chat_history_str}}", working_directory=".")
        blueprint.set_vars(chat_history_str=chat_history_str)
        blueprint.set_system_prompt(
            "Act as a title generator. Summarize the user's intent in 2-5 words. "
            "Use Title Case. Do not use punctuation or quotes. "
            "Output ONLY the title."
        )
        pkg = blueprint.build()

        anthropic_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = await anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=20,
            system=pkg["system_prompt"],
            messages=[{"role": "user", "content": pkg["prompt"]}],
        )

        title = ""
        if hasattr(response, "content") and len(response.content) > 0:
            title = response.content[0].text.strip(' \n\r\t"\'')

        return GenerateTitleResponse(title=title or "New Chat")
    except Exception as exc:
        logger.error("Error generating chat title: %s", exc)
        return GenerateTitleResponse(title="New Chat")


@router.post(
    "/{thread_id}/messages",
    response_model=ResponseEnvelope[ChatThreadResponse],
    summary="Append a message to a chat thread",
    operation_id="appendMessageToChatThread",
)
@allow(["write:all"])
async def append_chat_message(
    payload: ChatThreadMessageSchema,
    context: UseAuthContext,
    thread: UseThread,
) -> ResponseEnvelope[ChatThreadResponse]:
    try:
        result = await thread.append_message(payload)
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chat thread not found")
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ResponseEnvelope(success=True, result=result)


@router.post(
    "/{thread_id}/stream",
    response_class=EventSourceResponse,
    summary="SSE streaming AI chat thread",
    operation_id="streamChatThread",
)
async def chat_stream(
    thread: UseThread,
    payload: ChatThreadStreamRequest,
    context: UseAuthContext,
) -> AsyncIterable[StreamChunkModel]:
    from app.services.ai.tools.daily_standup import daily_standup_tools_server
    from app.services.ai.tools.employee import employee_tools_server
    from app.services.ai.tools.dashboard import dashboard_tools_server
    from app.submodules.drive import drive_documents_mcp

    logger.info("Streaming chat thread %s with %d messages", thread.thread_id, len(payload.messages))

    blueprint = PromptBlueprint(working_directory=".")
    blueprint.set_prompt_from_file(os.path.join(PROMPTS_DIR, "conversation.hbs"))
    blueprint.set_vars(
        messages=[m.model_dump() for m in payload.messages],
        employee_id=context.user.employee_id
    )
    blueprint.set_system_prompt_from_file(os.path.join(PROMPTS_DIR, "system_prompt.hbs"))
    blueprint.set_model("claude-haiku-4-5-20251001")
    blueprint.add_mcp("employee-service", employee_tools_server)
    blueprint.add_mcp("daily-standup-service", daily_standup_tools_server)
    blueprint.add_mcp("dashboard-service", dashboard_tools_server)
    blueprint.add_mcp("drive-documents-service", drive_documents_mcp)

    runner = AnthropicRunner(blueprint)

    async for chunk in runner.run():
        yield chunk
