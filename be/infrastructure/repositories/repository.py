"""Base repository interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, Optional

TEntity = TypeVar('TEntity')
TId = TypeVar('TId')


class Repository(ABC, Generic[TEntity, TId]):
    """Base repository interface."""

    @abstractmethod
    async def save(self, entity: TEntity) -> None:
        """Save an entity."""
        pass

    @abstractmethod
    async def find_by_id(self, entity_id: TId) -> Optional[TEntity]:
        """Find an entity by ID."""
        pass

    @abstractmethod
    async def exists(self, entity_id: TId) -> bool:
        """Check if an entity exists."""
        pass

    @abstractmethod
    async def delete(self, entity_id: TId) -> None:
        """Delete an entity."""
        pass
