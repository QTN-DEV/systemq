"""Unit of work pattern for managing transactions."""

from __future__ import annotations

from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from typing import AsyncGenerator, List

from domain.shared.events.domain_event import DomainEvent


class UnitOfWork(ABC):
    """Base unit of work interface."""

    @abstractmethod
    async def commit(self) -> None:
        """Commit the unit of work."""
        pass

    @abstractmethod
    async def rollback(self) -> None:
        """Rollback the unit of work."""
        pass

    @abstractmethod
    def collect_events(self) -> List[DomainEvent]:
        """Collect all domain events from aggregates."""
        pass


class AggregateUnitOfWork(UnitOfWork):
    """Unit of work for aggregates."""

    def __init__(self):
        """Initialize the unit of work."""
        self._aggregates: List[any] = []

    def register_aggregate(self, aggregate: any) -> None:
        """Register an aggregate for tracking."""
        self._aggregates.append(aggregate)

    async def commit(self) -> None:
        """Commit by clearing events."""
        self.collect_events()

    async def rollback(self) -> None:
        """Rollback (no-op for now)."""
        pass

    def collect_events(self) -> List[DomainEvent]:
        """Collect all domain events from aggregates."""
        all_events = []
        for aggregate in self._aggregates:
            events = aggregate.clear_domain_events()
            all_events.extend(events)
        return all_events


@asynccontextmanager
async def aggregate_unit_of_work() -> AsyncGenerator[AggregateUnitOfWork, None]:
    """Context manager for aggregate unit of work."""
    uow = AggregateUnitOfWork()
    try:
        yield uow
        await uow.commit()
    except Exception:
        await uow.rollback()
        raise
