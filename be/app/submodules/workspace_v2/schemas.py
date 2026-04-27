from typing import Literal, NotRequired, TypedDict

from pydantic import BaseModel, Field


class FileNode(TypedDict):
    name: str
    extension: str
    is_folder: bool
    path: str
    relative_path: str
    children: NotRequired[list["FileNode"]]

class WorkspaceListItem(BaseModel):
    id: str = Field(..., description="The ID of the workspace")
    name: str = Field(..., description="The name of the workspace")

class CreateWorkspaceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)

class CreateWorkspaceResponse(BaseModel):
    id: str = Field(..., description="The ID of the created workspace")


class CreateFolderInWorkspaceRequest(BaseModel):
    path: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="Relative path of the new folder (e.g. notes/assets or data/sub)",
    )


class CreateFileInWorkspaceRequest(BaseModel):
    path: str = Field(
        ...,
        min_length=1,
        max_length=4096,
        description="Relative path of the new file, including name (e.g. data/notes.md)",
    )
    content: str = Field(
        default="",
        description="Initial file body; UTF-8. For binary uploads use .../fs/upload instead.",
    )


class CreatedWorkspaceItemResponse(BaseModel):
    relative_path: str = Field(
        ...,
        description="Path of the created item, relative to the workspace root (leading slash, tree-style).",
    )

class WorkspaceChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"] = Field(
        ...,
        description="Speaker role in the conversation.",
    )
    content: str = Field(
        ...,
        description="Plain-text message body.",
    )


class SkillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    content: str = ""


class SkillUpdate(BaseModel):
    content: str


class SkillResponse(BaseModel):
    name: str
    content: str



class WorkspaceChatCreate(BaseModel):
    messages: list[WorkspaceChatMessage] = Field(
        ...,
        description="Conversation history to send to the workspace chat.",
    )


class WorkspaceChatDocumentCreate(BaseModel):
    messages: list[WorkspaceChatMessage] = Field(
        default_factory=list,
        description="Initial messages payload.",
    )
    title: str = Field(
        default="New Chat",
        description="Display title for the thread.",
    )


class WorkspaceChatResponse(BaseModel):
    id: str = Field(..., description="Chat document id.")
    workspace_id: str = Field(..., description="Owning workspace id.")
    messages: list[WorkspaceChatMessage] = Field(..., description="Stored messages.")
    title: str = Field(default="New Chat", description="Display title for the thread.")


class WorkspaceChatListItem(BaseModel):
    id: str = Field(..., description="Chat document id.")
    title: str = Field(default="New Chat", description="Display title for the thread.")