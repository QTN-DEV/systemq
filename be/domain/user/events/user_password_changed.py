"""User password changed domain event."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from domain.shared.events.domain_event import DomainEvent
from domain.user.value_objects.user_id import UserId


class UserPasswordChangedEvent(DomainEvent):
    """Event emitted when a user password is changed."""

    def __init__(
        self,
        aggregate_id: str,
        user_id: UserId,
        **kwargs
    ):
        """Initialize the event."""
        super().__init__(aggregate_id, **kwargs)
        self.user_id = user_id

    def _get_event_data(self) -> Dict[str, Any]:
        """Get event-specific data."""
        return {
            "user_id": self.user_id.value,
        }
