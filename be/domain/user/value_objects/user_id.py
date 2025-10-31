"""User ID value object."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class UserId:
    """User ID value object."""

    value: str

    def __post_init__(self) -> None:
        """Validate User ID format."""
        if not self.value or not self.value.strip():
            raise ValueError("User ID cannot be empty")

        # Normalize whitespace
        object.__setattr__(self, 'value', self.value.strip())

    @classmethod
    def generate(cls) -> UserId:
        """Generate a new User ID."""
        return cls(str(UUID()))

    def __str__(self) -> str:
        """String representation."""
        return self.value
