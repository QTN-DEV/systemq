from __future__ import annotations

import json
from beanie import Document, PydanticObjectId
from pydantic import Field, field_validator


class WorkspaceMetadata(Document):
    id: PydanticObjectId = Field(
        default_factory=PydanticObjectId,
        description="Workspace document id (MongoDB ObjectId).",
    )
    name: str
    owner_id: PydanticObjectId = Field(
        ..., 
        description="Matches auth profile id (stored as ObjectId)."
    )

    class Settings:
        name = "workspaces"
        indexes = ["owner_id"]


from app.submodules.workspace_v2.schemas import WorkspaceChatMessage

class WorkspaceChat(Document):
    id: PydanticObjectId = Field(
        default_factory=PydanticObjectId,
        description="Chat id (MongoDB ObjectId).",
    )
    workspace_id: PydanticObjectId = Field(
        ...,
        description="Owning workspace document id (MongoDB ObjectId).",
    )
    messages: list[WorkspaceChatMessage] = Field(
        default_factory=list,
        description="List of messages in the chat.",
    )
    title: str = Field(
        default="New Chat",
        description="Title of the chat.",
    )

    class Settings:
        name = "workspace_chats"
        indexes = ["workspace_id"]

