"""Employee ID value object."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EmployeeId:
    """Employee ID value object."""

    value: str

    def __post_init__(self) -> None:
        """Validate Employee ID format."""
        if not self.value or not self.value.strip():
            raise ValueError("Employee ID cannot be empty")

        # Normalize whitespace
        object.__setattr__(self, 'value', self.value.strip())

    def __str__(self) -> str:
        """String representation."""
        return self.value
