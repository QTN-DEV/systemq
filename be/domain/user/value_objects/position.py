"""Position value object."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Literal


class PositionType(Enum):
    """Position types."""
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"
    SECRETARY = "secretary"


PositionLiteral = Literal["admin", "manager", "employee", "secretary"]


@dataclass(frozen=True)
class Position:
    """Position value object."""

    value: PositionLiteral

    def __post_init__(self) -> None:
        """Validate position value."""
        if self.value not in [p.value for p in PositionType]:
            raise ValueError(f"Invalid position: {self.value}")

    @property
    def is_admin(self) -> bool:
        """Check if position is admin."""
        return self.value == PositionType.ADMIN.value

    @property
    def is_manager(self) -> bool:
        """Check if position is manager."""
        return self.value == PositionType.MANAGER.value

    @property
    def can_manage_users(self) -> bool:
        """Check if position can manage users."""
        return self.value in [PositionType.ADMIN.value, PositionType.MANAGER.value]

    def __str__(self) -> str:
        """String representation."""
        return self.value
