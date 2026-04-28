"""User-scoped AI chat — CRUD threads + SSE streaming."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterable
from typing import Literal, Optional, Any

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.sse import EventSourceResponse
from pydantic import BaseModel, Field

from app.api.routes.auth import get_current_user
from app.schemas.auth import UserProfile
from app.submodules.ai import AnthropicRunner, PromptBlueprint, StreamChunkModel
from app.submodules.chat.documents import Chat, ChatMessage
from app.core import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chats", tags=["Chat"])

SYSTEM_PROMPT = (
    "1. **Validation:** Before updating or creating an employee, search all positions, "
    "divisions, and employment types using the tools to ensure values are allowed.\n"
    "2. **Summarization Strategy (Map-Reduce):** When asked to summarize large ranges "
    "of standup data (e.g., a month), DO NOT fetch all data at once. Instead:\n"
    "   - Call the tool to fetch data in smaller, logical increments (e.g., 5-day windows).\n"
    "   - Synthesize the findings of each window internally.\n"
    "   - Only after processing all windows, provide a final, high-level consolidated summary.\n"
    "   - Focus on persistent blockers, major milestones, and team trajectory."
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ChatMessageSchema(BaseModel):
    id: Optional[str] = None
    role: Literal["user", "assistant", "system"]
    content: str
    attachments: Optional[list[dict]] = None
    created_at: Optional[Any] = None


class ChatListItem(BaseModel):
    id: str
    title: str


class ChatResponse(BaseModel):
    id: str
    user_id: str
    title: str
    messages: list[ChatMessageSchema]


class ChatCreate(BaseModel):
    title: str = Field(default="New Chat", max_length=256)
    messages: list[ChatMessageSchema] = Field(default_factory=list)


class ChatRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)


class ChatAppendMessages(BaseModel):
    messages: list[ChatMessageSchema] = Field(...)


class ChatStreamRequest(BaseModel):
    messages: list[ChatMessageSchema] = Field(...)


class PaginatedChats(BaseModel):
    items: list[ChatListItem]
    total: int
    page: int
    page_size: int
    has_next: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_oid(user: UserProfile) -> PydanticObjectId:
    return PydanticObjectId(user.id)


def _to_response(chat: Chat) -> ChatResponse:
    return ChatResponse(
        id=str(chat.id),
        user_id=str(chat.user_id),
        title=chat.title,
        messages=[ChatMessageSchema(**m.model_dump()) for m in chat.messages],
    )


async def _get_owned_chat(chat_id: str, user: UserProfile) -> Chat:
    try:
        cid = PydanticObjectId(chat_id)
    except Exception:
        raise HTTPException(400, "Invalid chat id")
    chat = await Chat.get(cid)
    if chat is None or chat.user_id != _user_oid(user):
        raise HTTPException(404, "Chat not found")
    return chat


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=ResponseEnvelope[PaginatedChats])
async def list_chats(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserProfile = Depends(get_current_user),
):
    uid = _user_oid(current_user)
    skip = (page - 1) * page_size
    total = await Chat.find(Chat.user_id == uid).count()
    chats = (
        await Chat.find(Chat.user_id == uid)
        .sort(-Chat.id)
        .skip(skip)
        .limit(page_size)
        .to_list()
    )
    return ResponseEnvelope(
        result=PaginatedChats(
            items=[ChatListItem(id=str(c.id), title=c.title) for c in chats],
            total=total,
            page=page,
            page_size=page_size,
            has_next=(skip + page_size) < total,
        )
    )


@router.post("", response_model=ResponseEnvelope[ChatResponse])
async def create_chat(
    payload: ChatCreate,
    current_user: UserProfile = Depends(get_current_user),
):
    chat = Chat(
        user_id=_user_oid(current_user),
        title=(payload.title or "New Chat").strip() or "New Chat",
        messages=[ChatMessage(**m.model_dump()) for m in payload.messages],
    )
    await chat.insert()
    return ResponseEnvelope(result=_to_response(chat))


@router.get("/{chat_id}", response_model=ResponseEnvelope[ChatResponse])
async def get_chat(
    chat_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    chat = await _get_owned_chat(chat_id, current_user)
    return ResponseEnvelope(result=_to_response(chat))


@router.patch("/{chat_id}/title", response_model=ResponseEnvelope[ChatListItem])
async def rename_chat(
    chat_id: str,
    payload: ChatRename,
    current_user: UserProfile = Depends(get_current_user),
):
    chat = await _get_owned_chat(chat_id, current_user)
    chat.title = payload.title.strip()
    await chat.save()
    return ResponseEnvelope(result=ChatListItem(id=str(chat.id), title=chat.title))


@router.post("/{chat_id}/messages", response_model=ResponseEnvelope[ChatResponse])
async def append_messages(
    chat_id: str,
    payload: ChatAppendMessages,
    current_user: UserProfile = Depends(get_current_user),
):
    chat = await _get_owned_chat(chat_id, current_user)
    chat.messages.extend([ChatMessage(**m.model_dump()) for m in payload.messages])
    await chat.save()
    return ResponseEnvelope(result=_to_response(chat))


@router.delete("/{chat_id}", response_model=ResponseEnvelope[None])
async def delete_chat(
    chat_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    chat = await _get_owned_chat(chat_id, current_user)
    await chat.delete()
    return ResponseEnvelope(result=None)


@router.post(
    "/{chat_id}/stream",
    response_class=EventSourceResponse,
)
async def chat_stream(
    chat_id: str,
    payload: ChatStreamRequest,
    current_user: UserProfile = Depends(get_current_user),
) -> AsyncIterable[StreamChunkModel]:
    chat = await _get_owned_chat(chat_id, current_user)

    # Build conversation from stored history + incoming messages
    all_messages = chat.messages + [ChatMessage(**m.model_dump()) for m in payload.messages]
    conversation = "\n".join(
        f"{m.role.capitalize()}: {m.content}" for m in all_messages
    )
    conversation += "\nAssistant: "

    logger.info(f"Streaming chat {chat_id} with {len(all_messages)} messages")

    blueprint = PromptBlueprint(
        template=conversation,
        working_directory=".",
    )
    blueprint.set_system_prompt(SYSTEM_PROMPT)
    blueprint.set_model("claude-haiku-4-5-20251001")

    runner = AnthropicRunner(blueprint)

    async for chunk in runner.run():
        yield chunk
