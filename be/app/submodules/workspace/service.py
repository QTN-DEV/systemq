"""Filesystem-backed workspace storage with Beanie metadata."""

from __future__ import annotations

import mimetypes
import shutil
from pathlib import Path

from fastapi import UploadFile

_WORKSPACE_TOP_LEVEL = frozenset({"data", "outputs", "workflows", ".claude"})


class WorkspacePathError(PermissionError):
    """Raised when a path escapes the workspace root or uses forbidden segments."""


class WorkspaceNotFoundError(FileNotFoundError):
    """No workspace directory or metadata mismatch."""


def apply_default_data_prefix(relative_path: str) -> str:
    """Prepend ``data/`` when no explicit workspace root prefix is given."""
    rel = relative_path.strip().lstrip("/")
    if not rel:
        return "data"
    first = rel.split("/")[0]
    if first in _WORKSPACE_TOP_LEVEL:
        return rel
    return f"data/{rel}"


def _reject_traversal(rel: str) -> None:
    parts = Path(rel.replace("\\", "/")).parts
    if ".." in parts or any(p.startswith("..") for p in parts):
        raise WorkspacePathError("Path traversal detected")


def compute_previous(in_path: str) -> str | None:
    """Navigation parent for listing API (see workspace plan)."""
    if in_path == "":
        return None
    normalized = in_path.rstrip("/")
    if "/" not in normalized:
        return ""
    return normalized.rsplit("/", 1)[0]


class WorkspaceService:
    def __init__(self, storage_path: str | Path):
        self.base_path = Path(storage_path).resolve()

    def workspace_root(self, workspace_id: str) -> Path:
        return (self.base_path / workspace_id).resolve()

    def create_workspace_scaffold(self, workspace_id: str) -> None:
        """Create the standard directory tree for a new workspace."""
        ws_path = self.workspace_root(workspace_id)
        folders = [
            "data",
            "outputs",
            "workflows",
            ".claude/skills",
        ]
        for folder in folders:
            (ws_path / folder).mkdir(parents=True, exist_ok=True)

    def delete_workspace_tree(self, workspace_id: str) -> None:
        ws_path = self.workspace_root(workspace_id)
        if ws_path.is_dir():
            shutil.rmtree(ws_path)

    def _resolve_safe_path(self, workspace_id: str, sub_path: str) -> Path:
        ws_root = self.workspace_root(workspace_id)
        if not ws_root.is_dir():
            raise WorkspaceNotFoundError(f"Workspace '{workspace_id}' not found on disk")
        clean = sub_path.lstrip("/")
        _reject_traversal(clean)
        target = (ws_root / clean).resolve()
        if not str(target).startswith(str(ws_root)):
            raise WorkspacePathError("Path traversal detected")
        return target

    def list_directory(
        self,
        workspace_id: str,
        in_path: str,
    ) -> list[dict[str, str | bool]]:
        """Return entries under ``in_path`` relative to workspace root."""
        target = self._resolve_safe_path(workspace_id, in_path)
        if not target.exists():
            raise FileNotFoundError(f"Path not found: {in_path}")
        if not target.is_dir():
            raise NotADirectoryError(f"Not a directory: {in_path}")

        entries: list[dict[str, str | bool]] = []
        rel_base = in_path.rstrip("/")
        for child in sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
            rel_id = f"{rel_base}/{child.name}" if rel_base else child.name
            if child.is_dir():
                entries.append(
                    {
                        "id": rel_id,
                        "isFolder": True,
                        "name": child.name,
                        "mimeType": "folder",
                    }
                )
            else:
                mime, _ = mimetypes.guess_type(child.name)
                entries.append(
                    {
                        "id": rel_id,
                        "isFolder": False,
                        "name": child.name,
                        "mimeType": mime or "application/octet-stream",
                    }
                )
        return entries

    def create_file_or_folder(
        self,
        workspace_id: str,
        relative_path: str,
        *,
        is_folder: bool,
    ) -> Path:
        rel = apply_default_data_prefix(relative_path)
        _reject_traversal(rel)
        target = self._resolve_safe_path(workspace_id, rel)
        if target.exists():
            raise FileExistsError(str(target))
        if is_folder:
            target.mkdir(parents=True, exist_ok=False)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.touch(exist_ok=False)
        return target

    async def save_upload(
        self,
        workspace_id: str,
        file: UploadFile,
        relative_path: str | None,
    ) -> Path:
        filename = file.filename or "upload"
        raw = (relative_path or "").strip().lstrip("/")
        if not raw:
            rel = f"data/{filename}"
        elif raw.endswith("/"):
            dir_part = apply_default_data_prefix(raw[:-1] or "data")
            rel = f"{dir_part}/{filename}"
        else:
            base = Path(raw)
            if base.suffix:
                rel = apply_default_data_prefix(raw)
            else:
                rel = f"{apply_default_data_prefix(raw)}/{filename}"
        _reject_traversal(rel)
        dest = self._resolve_safe_path(workspace_id, rel)
        if dest.is_dir():
            raise IsADirectoryError(str(dest))
        dest.parent.mkdir(parents=True, exist_ok=True)
        chunk_size = 1024 * 1024
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                out.write(chunk)
        await file.close()
        return dest

    def skills_dir(self, workspace_id: str) -> Path:
        return self._resolve_safe_path(workspace_id, ".claude/skills")

    def skill_file_path(self, workspace_id: str, skill_name: str) -> Path:
        safe = _sanitize_skill_name(skill_name)
        skills = self.skills_dir(workspace_id)
        return skills / f"{safe}.md"

    def write_skill(self, workspace_id: str, skill_name: str, content: str, *, overwrite: bool) -> Path:
        path = self.skill_file_path(workspace_id, skill_name)
        if path.exists() and not overwrite:
            raise FileExistsError(path.name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def read_skill(self, workspace_id: str, skill_name: str) -> str:
        path = self.skill_file_path(workspace_id, skill_name)
        if not path.is_file():
            raise FileNotFoundError(path.name)
        return path.read_text(encoding="utf-8")

    def delete_skill(self, workspace_id: str, skill_name: str) -> None:
        path = self.skill_file_path(workspace_id, skill_name)
        if not path.is_file():
            raise FileNotFoundError(path.name)
        path.unlink()


def _sanitize_skill_name(name: str) -> str:
    base = name.strip()
    if base.lower().endswith(".md"):
        base = base[:-3]
    if not base or any(c in base for c in ("/", "\\", "..")):
        raise ValueError("Invalid skill name")
    return base


def get_workspace_service() -> WorkspaceService:
    from constants import WORKSPACE_STORAGE_ROOT

    return WorkspaceService(WORKSPACE_STORAGE_ROOT)
