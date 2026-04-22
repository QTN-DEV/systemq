"""Service layer for the dynamic_dashboard submodule.

Business logic:
  - ``get_dashboard``    — fetch (or auto-create) a user's dashboard document.
  - ``update_dashboard`` — apply OCC-validated content update.
"""

from __future__ import annotations


class DashboardConflictError(Exception):
    """Raised when the client's target_version doesn't match the stored version."""


class DashboardService:
    def __init__(self, repo) -> None:
        self._repo = repo

    # ── Public API ─────────────────────────────────────────────────────────

    async def get_dashboard(self, user_id: str):
        """Return the dashboard document for *user_id*, creating one if absent."""
        from .models import DynamicDashboard

        doc = await self._repo.get_by_user(user_id)
        if doc is None:
            doc = DynamicDashboard(user_id=user_id, content="", version=1)
            doc = await self._repo.create(doc)
        return doc

    async def update_dashboard(self, user_id: str, content: str, target_version: int):
        """Update dashboard content with Optimistic Concurrency Control.

        Args:
            user_id:        Owner of the dashboard document.
            content:        New source content to persist.
            target_version: Version the client last read; must match DB version.

        Returns:
            The updated ``DynamicDashboard`` document.

        Raises:
            DashboardConflictError: When ``target_version`` != stored version.
        """
        doc = await self.get_dashboard(user_id)

        if doc.version != target_version:
            raise DashboardConflictError(
                f"Version conflict: expected {doc.version}, got {target_version}."
            )

        doc.content = content
        doc.version = doc.version + 1
        return await self._repo.save(doc)
