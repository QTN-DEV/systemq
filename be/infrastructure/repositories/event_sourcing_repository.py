"""Repository base class for aggregates."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional

from domain.shared.entities.aggregate_root import AggregateRoot

TAggregate = TypeVar('TAggregate', bound=AggregateRoot)


class AggregateRepository(ABC, Generic[TAggregate]):
    """Base repository for aggregates with direct state storage."""

    @abstractmethod
    async def save(self, aggregate: TAggregate) -> None:
        """Save an aggregate by storing its current state."""
        pass

    @abstractmethod
    async def find_by_id(self, aggregate_id: str) -> Optional[TAggregate]:
        """Find an aggregate by its ID."""
        pass

    @abstractmethod
    async def exists(self, aggregate_id: str) -> bool:
        """Check if an aggregate exists."""
        pass

    @abstractmethod
    async def delete(self, aggregate_id: str) -> None:
        """Delete an aggregate."""
        pass
