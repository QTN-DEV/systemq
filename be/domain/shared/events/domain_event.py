"""Domain event base class."""

from __future__ import annotations

from abc import ABC
from dataclasses import dataclass, field
from datetime import datetime, UTC
from typing import Any, Dict
from uuid import uuid4


class DomainEvent(ABC):
    """Base class for all domain events."""

    def __init__(
        self,
        aggregate_id: str,
        occurred_on: datetime | None = None,
        event_id: str | None = None,
        event_version: int = 1
    ):
        """Initialize domain event."""
        self.aggregate_id = aggregate_id
        self.occurred_on = occurred_on or datetime.now(UTC)
        self.event_id = event_id or str(uuid4())
        self.event_version = event_version
        self.event_type = self.__class__.__name__

        # Ensure timestamp is UTC
        if self.occurred_on.tzinfo is None:
            self.occurred_on = self.occurred_on.replace(tzinfo=UTC)

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "aggregate_id": self.aggregate_id,
            "occurred_on": self.occurred_on.isoformat(),
            "event_version": self.event_version,
            **self._get_event_data()
        }

    def _get_event_data(self) -> Dict[str, Any]:
        """Get event-specific data. Override in subclasses."""
        return {}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> DomainEvent:
        """Create event from dictionary. Override in subclasses."""
        return cls(
            event_id=data["event_id"],
            aggregate_id=data["aggregate_id"],
            occurred_on=datetime.fromisoformat(data["occurred_on"]),
            event_version=data.get("event_version", 1)
        )
