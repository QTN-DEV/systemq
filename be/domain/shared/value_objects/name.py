"""Name value object."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Name:
    """Person name value object."""

    first_name: str
    last_name: str

    def __post_init__(self) -> None:
        """Validate name components."""
        if not self.first_name or not self.first_name.strip():
            raise ValueError("First name cannot be empty")

        if not self.last_name or not self.last_name.strip():
            raise ValueError("Last name cannot be empty")

        # Normalize whitespace
        object.__setattr__(self, 'first_name', self.first_name.strip())
        object.__setattr__(self, 'last_name', self.last_name.strip())

    @property
    def full_name(self) -> str:
        """Get the full name."""
        return f"{self.first_name} {self.last_name}"

    @property
    def display_name(self) -> str:
        """Get display name (first name + last initial)."""
        return f"{self.first_name} {self.last_name[0]}."

    def __str__(self) -> str:
        """String representation."""
        return self.full_name