"""User created domain event."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from domain.shared.events.domain_event import DomainEvent
from domain.shared.value_objects.email import Email
from domain.shared.value_objects.name import Name
from domain.user.value_objects.user_id import UserId


class UserCreatedEvent(DomainEvent):
    """Event emitted when a user is created."""

    def __init__(
        self,
        aggregate_id: str,
        user_id: UserId,
        email: Email,
        name: Name,
        **kwargs
    ):
        """Initialize the event."""
        super().__init__(aggregate_id, **kwargs)
        self.user_id = user_id
        self.email = email
        self.name = name

    def _get_event_data(self) -> Dict[str, Any]:
        """Get event-specific data."""
        return {
            "user_id": self.user_id.value,
            "email": str(self.email),
            "name": self.name.full_name,
        }
