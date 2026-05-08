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

class SkillRename(BaseModel):
    name: str


class SkillResponse(BaseModel):
    name: str
    content: str



class WorkspaceChatStreamRequest(BaseModel):
    model: Optional[str] = Field(None, description="Optional custom model to use for completion.")


class WorkspaceChatCreate(BaseModel):
    messages: list[WorkspaceChatMessage] = Field(
        default_factory=list,
        description="Unused — backend loads history from DB.",
    )
    model: Optional[str] = Field(None, description="Optional custom model to use for completion.")


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


class WorkspaceChatMessagesPage(BaseModel):
    messages: list[WorkspaceChatMessage]
    prev_cursor: Optional[str] = Field(
        None,
        description="Pass as `cursor` to load the next (older) page. Null when no older messages exist.",
    )


class WorkspaceChatListItem(BaseModel):
    id: str = Field(..., description="Chat document id.")
    title: str = Field(default="New Chat", description="Display title for the thread.")


class WorkspaceChatListPage(BaseModel):
    items: list[WorkspaceChatListItem]
    next_cursor: Optional[str] = Field(None, description="Cursor for the next page; null when no more results.")


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


class WorkspaceInstructionResponse(BaseModel):
    content: str = Field(..., description="The markdown content of the CLAUDE.md instruction file.")


class WorkspaceInstructionUpdate(BaseModel):
    content: str = Field(..., description="The new markdown content for the CLAUDE.md instruction file.")


# ---------------------------------------------------------------------------
# Generate Title Schemas
# ---------------------------------------------------------------------------

class GenerateTitleRequest(BaseModel):
    messages: list[Any] = Field(..., description="The chat messages to base the title on")

class GenerateTitleResponse(BaseModel):
    title: str = Field(..., description="The generated title")


# ---------------------------------------------------------------------------
# Workflow schemas
# ---------------------------------------------------------------------------

class WorkflowInput(BaseModel):
    name: str
    label: Optional[str] = None
    type: str = "text"
    placeholder: Optional[str] = None
    default: Optional[Any] = None


class WorkflowCreate(BaseModel):
    id: Optional[str] = Field(None, description="Workflow identifier (slug). Defaults to the file name stem.")
    name: str = Field(..., min_length=1, max_length=256, description="Human-readable workflow name.")
    description: Optional[str] = Field(None, description="Short description of the workflow.")
    version: int = Field(default=1)
    inputs: list[WorkflowInput] = Field(default_factory=list)
    prompt_template: str = Field(default="")
    allowed_tools: list[str] = Field(default_factory=list)
    disallowed_tools: list[str] = Field(default_factory=list)
    max_turns: Optional[int] = None
    max_budget_usd: Optional[float] = None
    model: Optional[str] = None
    mcp_servers: dict[str, Any] = Field(default_factory=dict)


class WorkflowUpdate(BaseModel):
    """Partial update — only provided fields are replaced in the YAML."""
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[int] = None
    inputs: Optional[list[WorkflowInput]] = None
    prompt_template: Optional[str] = None
    allowed_tools: Optional[list[str]] = None
    disallowed_tools: Optional[list[str]] = None
    max_turns: Optional[int] = None
    max_budget_usd: Optional[float] = None
    model: Optional[str] = None
    mcp_servers: Optional[dict[str, Any]] = None


class WorkflowExecuteRequest(BaseModel):
    inputs: dict[str, Any] = Field(default_factory=dict, description="Input variables for the workflow.")


class WorkflowListItem(BaseModel):
    name: str = Field(..., description="File stem (slug) used to address the workflow in the API.")
    id: str
    display_name: str
    description: str


class WorkflowResponse(BaseModel):
    name: str = Field(..., description="File stem (slug).")
    id: str
    display_name: str
    description: str
    version: Any
    inputs: list[WorkflowInput]
    prompt_template: str
    allowed_tools: list[str]
    disallowed_tools: list[str]
    max_turns: Optional[int]
    max_budget_usd: Optional[float]
    model: Optional[str]
    mcp_servers: dict[str, Any]
    raw: dict[str, Any] = Field(..., description="Full raw YAML data as parsed dict.")