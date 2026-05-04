import asyncio
from pathlib import Path
from typing import Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, ConfigDict
import shutil

from .resources.chats import ChatsResource
from .resources.files import FilesResource
from .resources.contexts import ContextsResource
from .resources.workflows import WorkflowsResource
from ..documents import WorkspaceMetadata


class WorkspaceHandleOptions(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    root_path: Path
    owner_id: str


class WorkspaceHandleGetItemByPathOptions(BaseModel):
    model_config = ConfigDict(frozen=True)

    path: Optional[str] = None
    query: str = ""
    allow_missing_file: bool = False


class WorkspaceHandle:
    def __init__(self, options: WorkspaceHandleOptions):
        self.options = options
        self.files = FilesResource(self)
        self.chats = ChatsResource(self)
        self.contexts = ContextsResource(self)
        self.workflows = WorkflowsResource(self)
    
    @property
    def root_path(self) -> Path:
        return self.options.root_path.resolve()

    @property
    def owner_id(self) -> str:
        return self.options.owner_id

    @property
    def id(self) -> str:
        return self.options.id

    def get_safe_target_path(self, relative_path: Optional[str]) -> Path:
        safe_path = (relative_path or "").strip().lstrip("/")
        root = self.options.root_path.resolve()
        target = (root / safe_path).resolve()
        
        try:
            target.relative_to(root)
        except ValueError:
            raise PermissionError("Path outside workspace boundaries") from None
            
        return target
    
    async def delete(self) -> None:
        shutil.rmtree(self.options.root_path)
        await WorkspaceMetadata.find(WorkspaceMetadata.id == PydanticObjectId(self.options.id)).delete()

    async def scaffold(self) -> None:
        def _create() -> None:
            root = self.options.root_path.resolve()
            for folder in ("data", "outputs", "workflows", "uploads", ".claude/skills"):
                (root / folder).mkdir(parents=True, exist_ok=True)
            claude_md = root / "CLAUDE.md"
            if not claude_md.exists():
                claude_md.write_text(
                    "# Workspace\n\nContext and instructions for Claude in this workspace.\n",
                    encoding="utf-8",
                )

        await asyncio.to_thread(_create)