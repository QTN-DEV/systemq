"""Email value object."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Pattern


@dataclass(frozen=True)
class Email:
    """Email address value object."""

    value: str

    # RFC 5322 compliant email regex (simplified)
    _EMAIL_PATTERN: Pattern[str] = re.compile(
        r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
    )

    def __post_init__(self) -> None:
        """Validate email format."""
        if not self.value or not self.value.strip():
            raise ValueError("Email cannot be empty")

        if not self._EMAIL_PATTERN.match(self.value):
            raise ValueError(f"Invalid email format: {self.value}")

        # Normalize to lowercase
        object.__setattr__(self, 'value', self.value.lower().strip())

    @property
    def domain(self) -> str:
        """Get the domain part of the email."""
        return self.value.split('@')[1]

    @property
    def local_part(self) -> str:
        """Get the local part of the email."""
        return self.value.split('@')[0]

    def __str__(self) -> str:
        """String representation."""
        return self.value
