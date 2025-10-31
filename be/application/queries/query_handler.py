"""Query handler interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TypeVar, Generic

from .query import Query

TQuery = TypeVar('TQuery', bound=Query)
TResult = TypeVar('TResult')


class QueryHandler(ABC, Generic[TQuery, TResult]):
    """Interface for query handlers."""

    @abstractmethod
    async def handle(self, query: TQuery) -> TResult:
        """Handle the query and return the result."""
        pass
