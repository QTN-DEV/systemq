"""Aggregate root base class."""

from __future__ import annotations

from abc import ABC
from typing import List
from dataclasses import dataclass, field

from .entity import Entity
from ..events.domain_event import DomainEvent


@dataclass
class AggregateRoot(Entity, ABC):
    """Base class for aggregate roots in Domain-Driven Design."""

    _domain_events: List[DomainEvent] = field(default_factory=list, init=False)

    def add_domain_event(self, event: DomainEvent) -> None:
        """Add a domain event to be published."""
        self._domain_events.append(event)

    def clear_domain_events(self) -> List[DomainEvent]:
        """Clear and return all domain events."""
        events = self._domain_events.copy()
        self._domain_events.clear()
        return events

    def get_domain_events(self) -> List[DomainEvent]:
        """Get all domain events without clearing them."""
        return self._domain_events.copy()
