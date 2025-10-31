"""Base query class for CQRS."""

from __future__ import annotations

from abc import ABC
from dataclasses import dataclass
from typing import TypeVar

TResult = TypeVar('TResult')


@dataclass
class Query(ABC):
    """Base class for all queries in CQRS."""

    pass
