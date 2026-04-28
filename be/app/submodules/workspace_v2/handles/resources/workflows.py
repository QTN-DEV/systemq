from __future__ import annotations

import asyncio
from pathlib import Path
from typing import TYPE_CHECKING, Any

import yaml

if TYPE_CHECKING:
    from ..workspace import WorkspaceHandle

_WORKFLOWS_DIR = "workflows"


class WorkflowHandle:
    """A parsed YAML workflow file."""

    def __init__(self, path: Path, data: dict[str, Any]) -> None:
        self.path = path
        self.data = data

    @property
    def name(self) -> str:
        return self.path.stem

    @property
    def id(self) -> str:
        return str(self.data.get("id", self.name))

    @property
    def display_name(self) -> str:
        return str(self.data.get("name", self.name))

    @property
    def description(self) -> str:
        return str(self.data.get("description", ""))

    @property
    def version(self) -> Any:
        return self.data.get("version", 1)

    @property
    def inputs(self) -> list[dict[str, Any]]:
        return list(self.data.get("inputs") or [])

    @property
    def prompt_template(self) -> str:
        return str(self.data.get("prompt_template", ""))

    @property
    def allowed_tools(self) -> list[str]:
        return list(self.data.get("allowed_tools") or [])

    @property
    def disallowed_tools(self) -> list[str]:
        return list(self.data.get("disallowed_tools") or [])

    @property
    def max_turns(self) -> Any:
        return self.data.get("max_turns")

    @property
    def max_budget_usd(self) -> Any:
        return self.data.get("max_budget_usd")

    @property
    def model(self) -> str:
        return str(self.data.get("model", ""))

    @property
    def mcp_servers(self) -> dict[str, Any]:
        return dict(self.data.get("mcp_servers") or {})

    def to_dict(self) -> dict[str, Any]:
        """Return the full raw YAML data dict."""
        return dict(self.data)


class WorkflowsResource:
    """File-system resource for YAML workflow definitions inside a workspace."""

    def __init__(self, workspace: "WorkspaceHandle") -> None:
        self.workspace = workspace

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _workflows_dir(self) -> Path:
        return (self.workspace.root_path / _WORKFLOWS_DIR).resolve()

    def _workflow_path(self, name: str) -> Path:
        safe = name.strip().lstrip("/")
        if not safe or any(c in safe for c in ("/", "\\", "..")):
            raise ValueError(f"Invalid workflow name: {name!r}")
        # Accept names with or without .yaml extension
        stem = safe[:-5] if safe.lower().endswith(".yaml") else safe
        return self._workflows_dir() / f"{stem}.yaml"

    def _stem(self, name: str) -> str:
        s = name.strip().lstrip("/")
        return s[:-5] if s.lower().endswith(".yaml") else s

    def _load_file(self, path: Path) -> WorkflowHandle:
        raw = path.read_text(encoding="utf-8")
        data = yaml.safe_load(raw) or {}
        if not isinstance(data, dict):
            data = {}
        return WorkflowHandle(path, data)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def list(self) -> list[WorkflowHandle]:
        def _list() -> list[WorkflowHandle]:
            d = self._workflows_dir()
            if not d.exists():
                return []
            results: list[WorkflowHandle] = []
            for p in sorted(d.glob("*.yaml"), key=lambda x: x.name.lower()):
                try:
                    results.append(self._load_file(p))
                except Exception:
                    pass
            return results

        return await asyncio.to_thread(_list)

    async def get(self, name: str) -> WorkflowHandle:
        def _get() -> WorkflowHandle:
            path = self._workflow_path(name)
            if not path.exists():
                raise FileNotFoundError(name)
            return self._load_file(path)

        return await asyncio.to_thread(_get)

    async def create(self, name: str, data: dict[str, Any]) -> WorkflowHandle:
        def _create() -> WorkflowHandle:
            path = self._workflow_path(name)
            if path.exists():
                raise FileExistsError(name)
            path.parent.mkdir(parents=True, exist_ok=True)
            raw = yaml.dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False)
            path.write_text(raw, encoding="utf-8")
            return WorkflowHandle(path, data)

        return await asyncio.to_thread(_create)

    async def update(self, name: str, data: dict[str, Any]) -> WorkflowHandle:
        def _update() -> WorkflowHandle:
            path = self._workflow_path(name)
            if not path.exists():
                raise FileNotFoundError(name)
            raw = yaml.dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False)
            path.write_text(raw, encoding="utf-8")
            return WorkflowHandle(path, data)

        return await asyncio.to_thread(_update)

    async def delete(self, name: str) -> None:
        def _delete() -> None:
            path = self._workflow_path(name)
            if not path.exists():
                raise FileNotFoundError(name)
            path.unlink()

        await asyncio.to_thread(_delete)
