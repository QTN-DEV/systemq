"""URL value object."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True)
class Url:
    """URL value object."""

    value: str

    def __post_init__(self) -> None:
        """Validate URL format."""
        if not self.value or not self.value.strip():
            raise ValueError("URL cannot be empty")

        # Normalize whitespace
        normalized_url = self.value.strip()

        # Basic URL validation
        try:
            parsed = urlparse(normalized_url)
            if not parsed.scheme or not parsed.netloc:
                raise ValueError("Invalid URL format")
        except Exception as e:
            raise ValueError(f"Invalid URL: {normalized_url}") from e

        object.__setattr__(self, 'value', normalized_url)

    @property
    def scheme(self) -> str:
        """Get URL scheme (http, https, etc.)."""
        return urlparse(self.value).scheme

    @property
    def domain(self) -> str:
        """Get URL domain."""
        return urlparse(self.value).netloc

    @property
    def path(self) -> str:
        """Get URL path."""
        return urlparse(self.value).path

    def __str__(self) -> str:
        """String representation."""
        return self.value
