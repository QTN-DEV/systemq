"""Workspace API schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)


class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    owner_id: str


class WorkspaceFileEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    is_folder: bool = Field(alias="isFolder", serialization_alias="isFolder")
    name: str
    mime_type: str = Field(alias="mimeType", serialization_alias="mimeType")


class WorkspaceFilesResponse(BaseModel):
    previous: str | None
    result: list[WorkspaceFileEntry]


class WorkspaceFileCreate(BaseModel):
    """Relative path under workspace; ``data/`` is applied when no root prefix is set."""

    path: str = Field(..., min_length=1)
    is_folder: bool = False


class WorkspaceUploadResponse(BaseModel):
    path: str


class WorkspaceFileContentResponse(BaseModel):
    path: str
    content: str


class WorkspaceFileContentUpdate(BaseModel):
    path: str = Field(..., min_length=1)
    content: str = ""


class SkillCreate(BaseModel):
    workspace_id: str
    name: str = Field(..., min_length=1, max_length=128)
    content: str = ""


class SkillUpdate(BaseModel):
    content: str


class SkillResponse(BaseModel):
    name: str
    content: str


class WorkspaceChatCreate(BaseModel):
    """Initial ``messages`` as a single string (e.g. JSON.stringify output). Defaults to ``[]``."""

    messages: str = "[]"


class WorkspaceChatCreatedResponse(BaseModel):
    id: str


class WorkspaceChatResponse(BaseModel):
    id: str
    workspace_id: str
    messages: str
    title: str = "New Chat"


class WorkspaceChatMessagesUpdate(BaseModel):
    messages: str


class WorkspaceChatListItem(BaseModel):
    id: str
    title: str = "New Chat"
