from __future__ import annotations

from typing import Generic, Literal, Optional, Any, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ChatThreadMessageSchema(BaseModel):
    id: Optional[str] = Field(None, description="Unique message ID.")
    parent_id: Optional[str] = Field(None, description="Parent message ID for threaded conversations.")
    role: Literal["user", "assistant", "system"] = Field(
        ...,
        description="Speaker role in the conversation.",
    )
    content: str = Field(
        ...,
        description="Plain-text or JSON-stringified message body.",
    )
    attachments: Optional[list[dict]] = Field(None, description="List of message attachments.")
    created_at: Optional[Any] = Field(None, description="Creation timestamp.")


class ChatThreadListItem(BaseModel):
    id: str = Field(..., description="Chat thread ID.")
    title: str = Field(default="New Chat", description="Display title for the thread.")


class ChatThreadResponse(BaseModel):
    id: str = Field(..., description="Chat thread ID.")
    user_id: str = Field(..., description="Owner user ID.")
    messages: list[ChatThreadMessageSchema] = Field(..., description="Stored messages.")
    title: str = Field(default="New Chat", description="Display title for the thread.")


class ChatThreadCreate(BaseModel):
    messages: list[ChatThreadMessageSchema] = Field(
        default_factory=list,
        description="Initial messages payload.",
    )
    title: str = Field(
        default="New Chat",
        description="Display title for the thread.",
    )


class ChatThreadRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=256, description="New title for the thread.")


class ChatThreadStreamRequest(BaseModel):
    messages: list[ChatThreadMessageSchema] = Field(
        ...,
        description="Conversation history for the AI thread.",
    )


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool


class GenerateTitleRequest(BaseModel):
    messages: list[Any] = Field(..., description="The chat messages to base the title on")


class GenerateTitleResponse(BaseModel):
    title: str = Field(..., description="The generated title")
