from typing import Generic, Literal, NotRequired, TypedDict, Optional, Any, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


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


class WorkspaceFileUploadResponse(BaseModel):
    filename: str
    relative_url: str


class WorkspaceAiContextCreate(BaseModel):
    content: str = Field(..., description="The context content to save.")


class WorkspaceAiContextResponse(BaseModel):
    id: str = Field(..., description="Context document id.")
    workspace_id: str = Field(..., description="Owning workspace id.")
    content: str = Field(..., description="The context content.")
    created_at: Optional[Any] = Field(None, description="Creation timestamp.")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool


class WorkspaceChatRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=256, description="New title for the chat.")