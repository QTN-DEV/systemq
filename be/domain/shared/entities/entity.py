"""Base entity class for domain entities."""

from __future__ import annotations

from abc import ABC
from typing import Any
from dataclasses import dataclass, field
from datetime import datetime, UTC


@dataclass
class Entity(ABC):
    """Base class for all domain entities."""

    id: str
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __post_init__(self) -> None:
        """Ensure timestamps are UTC."""
        if self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=UTC)
        if self.updated_at.tzinfo is None:
            self.updated_at = self.updated_at.replace(tzinfo=UTC)

    def __eq__(self, other: object) -> bool:
        """Entities are equal if they have the same ID."""
        if not isinstance(other, Entity):
            return NotImplemented
        return self.id == other.id

    def __hash__(self) -> int:
        """Hash based on entity ID."""
        return hash(self.id)

    def touch(self) -> None:
        """Update the last modified timestamp."""
        self.updated_at = datetime.now(UTC)
