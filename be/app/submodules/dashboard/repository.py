"""Repository abstraction for the dynamic_dashboard submodule."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from .models import DynamicDashboard


# ── Abstract Interface ─────────────────────────────────────────────────────

@runtime_checkable
class DashboardRepository(Protocol):
    async def get_by_user(self, user_id: str) -> DynamicDashboard | None: ...
    async def create(self, doc: DynamicDashboard) -> DynamicDashboard: ...
    async def save(self, doc: DynamicDashboard) -> DynamicDashboard: ...


# ── Beanie / MongoDB Implementation ────────────────────────────────────────

class BeanieDashboardRepository:
    async def get_by_user(self, user_id: str) -> DynamicDashboard | None:
        return await DynamicDashboard.find_one(DynamicDashboard.user_id == user_id)

    async def create(self, doc: DynamicDashboard) -> DynamicDashboard:
        await doc.insert()
        return doc

    async def save(self, doc: DynamicDashboard) -> DynamicDashboard:
        await doc.save()
        return doc


# ── Dependency Provider ────────────────────────────────────────────────────

def get_dashboard_repo() -> DashboardRepository:
    return BeanieDashboardRepository()
