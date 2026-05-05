import asyncio
from pathlib import Path
from typing import Optional, TYPE_CHECKING, List

from app.submodules.workspace_v2.schemas import FileNode
from ..folder import FolderHandle
from ..file import FileHandle
from ..document import DocumentHandle

if TYPE_CHECKING:
    from ..workspace import WorkspaceHandle, WorkspaceHandleGetItemByPathOptions

class FilesResource:
    def __init__(self, workspace: "WorkspaceHandle"):
        self.workspace = workspace

    async def list(self, in_path: Optional[str] = None) -> List[FileNode]:
        def _list() -> list[FileNode]:
            target = self.workspace.get_safe_target_path(in_path)
            safe_path = (in_path or "").strip().lstrip("/")

            if not target.exists():
                if safe_path == "":
                    return []
                raise FileNotFoundError(safe_path)
            if not target.is_dir():
                raise NotADirectoryError(safe_path)

            nodes: list[FileNode] = []
            items = sorted(
                target.iterdir(),
                key=lambda p: (not p.is_dir(), p.name.lower()),
            )
            for item in items:
                is_folder = item.is_dir()
                rel_path = f"/{item.relative_to(self.workspace.options.root_path.resolve()).as_posix()}"
                nodes.append({
                    "name": item.name,
                    "extension": item.suffix,
                    "is_folder": is_folder,
                    "path": item.as_posix(),
                    "relative_path": rel_path,
                })
            return nodes

        return await asyncio.to_thread(_list)

    async def get(
        self, options: "WorkspaceHandleGetItemByPathOptions"
    ) -> FolderHandle | FileHandle | DocumentHandle:
        def _resolve() -> FolderHandle | FileHandle | DocumentHandle:
            target = self.workspace.get_safe_target_path(options.path)
            safe_path = (options.path or "").strip().lstrip("/")

            if not target.exists():
                if not options.allow_missing_file:
                    raise FileNotFoundError(safe_path)
                if target.suffix.lower() == ".md":
                    return DocumentHandle(target)
                return FileHandle(target)
            
            if target.is_dir():
                return FolderHandle(target)
            if target.suffix.lower() == ".md":
                return DocumentHandle(target)
            return FileHandle(target)

        return await asyncio.to_thread(_resolve)

    async def write(
        self,
        relative_path: str,
        content: bytes,
        *,
        must_not_exist: bool = False,
    ) -> Path:
        def _write() -> Path:
            if not relative_path.strip().lstrip("/"):
                raise ValueError("Path must not be empty")
                
            target = self.workspace.get_safe_target_path(relative_path)
            
            if target.exists():
                if must_not_exist:
                    raise FileExistsError(relative_path.strip().lstrip("/"))
                if target.is_dir():
                    raise IsADirectoryError(relative_path)
                
            target.parent.mkdir(parents=True, exist_ok=True)

            if target.suffix.lower() == ".md":
                try:
                    text = content.decode("utf-8")
                except UnicodeDecodeError as e:
                    raise ValueError("Markdown file body must be valid UTF-8") from e
                
                handle = DocumentHandle(target)
                handle.update(text)
                return handle.path

            handle = FileHandle(target)
            handle.update(content)
            return handle.path

        return await asyncio.to_thread(_write)

    async def create(self, relative_path: str, content: bytes) -> Path:
        """Create a new file; raise FileExistsError if the path already exists."""
        return await self.write(relative_path, content, must_not_exist=True)

    async def make_directory(self, relative_path: str) -> Path:
        """Create a new directory (including parents). Fails if the path already exists."""
        def _mkdir() -> Path:
            s = (relative_path or "").strip().lstrip("/")
            if not s:
                raise ValueError("Path must not be empty")
            target = self.workspace.get_safe_target_path(s)
            if target.exists():
                raise FileExistsError(s)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.mkdir(parents=False, exist_ok=False)
            return target

        return await asyncio.to_thread(_mkdir)

    def to_tree_relative_path(self, path: Path) -> str:
        root = self.workspace.options.root_path.resolve()
        return f"/{path.resolve().relative_to(root).as_posix()}"

    async def delete(self, relative_path: str) -> None:
        def _delete() -> None:
            safe_path = relative_path.strip().lstrip("/")
            if not safe_path:
                raise ValueError("Cannot delete workspace root")
                
            target = self.workspace.get_safe_target_path(safe_path)
            
            if not target.exists():
                raise FileNotFoundError(safe_path)
                
            if target.is_dir():
                FolderHandle(target).delete()
            elif target.suffix.lower() == ".md":
                DocumentHandle(target).delete()
            else:
                FileHandle(target).delete()

        await asyncio.to_thread(_delete)

    async def move(self, source_path: str, destination_path: str) -> None:
        def _move() -> None:
            source = self.workspace.get_safe_target_path(source_path)
            dest = self.workspace.get_safe_target_path(destination_path)
            if not source.exists():
                raise FileNotFoundError(source_path)
            if dest.exists():
                raise FileExistsError(destination_path)
            dest.parent.mkdir(parents=True, exist_ok=True)
            source.rename(dest)

        await asyncio.to_thread(_move)

    async def get_tree(self) -> List[FileNode]:
        return await asyncio.to_thread(self._scan_workspace)

    def _scan_workspace(self) -> List[FileNode]:
        root_path = self.workspace.options.root_path
        if not root_path.exists():
            return []
        return self._build_tree(root_path)
    
    def _build_tree(self, current_dir: Path) -> List[FileNode]:
        nodes: list[FileNode] = []
        root_path = self.workspace.options.root_path
        
        items = sorted(
            current_dir.iterdir(), 
            key=lambda p: (not p.is_dir(), p.name.lower())
        )

        for item in items:
            is_folder = item.is_dir()
            rel_path = f"/{item.relative_to(root_path).as_posix()}"

            node: FileNode = {
                "name": item.name,
                "extension": item.suffix,
                "is_folder": is_folder,
                "path": item.as_posix(),
                "relative_path": rel_path
            }
            
            if is_folder:
                node["children"] = self._build_tree(item)
            
            nodes.append(node)
            
        return nodes