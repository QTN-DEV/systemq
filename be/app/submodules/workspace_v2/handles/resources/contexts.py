from __future__ import annotations

from typing import TYPE_CHECKING

from beanie import PydanticObjectId

from app.submodules.workspace_v2.documents import WorkspaceAiContext
from app.submodules.workspace_v2.schemas import WorkspaceAiContextResponse

if TYPE_CHECKING:
    from ..workspace import WorkspaceHandle


class ContextsResource:
    """Persisted AI context entries for a v2 workspace (MongoDB ``workspace_ai_contexts``)."""

    def __init__(self, workspace: "WorkspaceHandle"):
        self.workspace = workspace

    def _workspace_oid(self) -> PydanticObjectId:
        return PydanticObjectId(self.workspace.id)

    def _to_response(self, doc: WorkspaceAiContext) -> WorkspaceAiContextResponse:
        return WorkspaceAiContextResponse(
            id=str(doc.id),
            workspace_id=str(doc.workspace_id),
            content=doc.content,
            created_at=doc.created_at,
        )

    async def list(self, *, skip: int = 0, limit: int = 20) -> list[WorkspaceAiContextResponse]:
        """All context entries for this workspace, newest first, with pagination."""
        wid = self._workspace_oid()
        docs = (
            await WorkspaceAiContext.find(WorkspaceAiContext.workspace_id == wid)
            .sort(-WorkspaceAiContext.id)
            .skip(skip)
            .limit(limit)
            .to_list()
        )
        return [self._to_response(d) for d in docs]

    async def count(self) -> int:
        """Total number of context entries in this workspace."""
        wid = self._workspace_oid()
        return await WorkspaceAiContext.find(WorkspaceAiContext.workspace_id == wid).count()

    async def create(self, content: str) -> WorkspaceAiContextResponse:
        """Insert a new AI context entry for this workspace."""
        doc = WorkspaceAiContext(
            workspace_id=self._workspace_oid(),
            content=content,
        )
        await doc.insert()
        return self._to_response(doc)

    async def get(self, context_id: str) -> WorkspaceAiContextResponse:
        """Load a single context entry by id; must belong to this workspace."""
        try:
            cid = PydanticObjectId(context_id)
        except Exception as exc:
            raise ValueError("Invalid context id") from exc
        doc = await WorkspaceAiContext.get(cid)
        if doc is None or doc.workspace_id != self._workspace_oid():
            raise FileNotFoundError("Context not found")
        return self._to_response(doc)

    async def delete(self, context_id: str) -> None:
        """Delete a context entry by id."""
        try:
            cid = PydanticObjectId(context_id)
        except Exception as exc:
            raise ValueError("Invalid context id") from exc
        doc = await WorkspaceAiContext.get(cid)
        if doc is None or doc.workspace_id != self._workspace_oid():
            raise FileNotFoundError("Context not found")
        await doc.delete()
