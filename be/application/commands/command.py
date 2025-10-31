"""Base command class for CQRS."""

from __future__ import annotations

from abc import ABC
from dataclasses import dataclass


@dataclass
class Command(ABC):
    """Base class for all commands in CQRS."""

    pass
