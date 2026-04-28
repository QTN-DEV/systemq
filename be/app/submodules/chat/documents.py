"""Chat module — Beanie document models for user-scoped chat threads."""

from __future__ import annotations

from typing import Literal, Optional, Any
from datetime import datetime, timezone

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    id: Optional[str] = Field(None, description="Unique message ID.")
    role: Literal["user", "assistant", "system"] = Field(..., description="Speaker role.")
    content: str = Field(..., description="Plain-text or JSON-stringified message body.")
    attachments: Optional[list[dict]] = Field(None, description="List of message attachments.")
    created_at: Optional[Any] = Field(None, description="Creation timestamp.")


class Chat(Document):
    id: PydanticObjectId = Field(
        default_factory=PydanticObjectId,
        description="Chat document id (MongoDB ObjectId).",
    )
    user_id: PydanticObjectId = Field(
        ...,
        description="Owner user id (MongoDB ObjectId).",
    )
    messages: list[ChatMessage] = Field(
        default_factory=list,
        description="List of messages in this chat thread.",
    )
    title: str = Field(
        default="New Chat",
        description="Display title for the chat thread.",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Thread creation timestamp (UTC).",
    )

    class Settings:
        name = "chats"
        indexes = ["user_id"]
