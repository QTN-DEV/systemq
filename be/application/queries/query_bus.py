"""Query bus for dispatching queries to handlers."""

from __future__ import annotations

from typing import Dict, Type
from .query import Query
from .query_handler import QueryHandler


class QueryBus:
    """Query bus for dispatching queries to their handlers."""

    def __init__(self) -> None:
        """Initialize the query bus."""
        self._handlers: Dict[Type[Query], QueryHandler] = {}

    def register_handler(self, query_type: Type[Query], handler: QueryHandler) -> None:
        """Register a handler for a query type."""
        self._handlers[query_type] = handler

    async def dispatch(self, query: Query) -> any:
        """Dispatch a query to its handler and return the result."""
        query_type = type(query)
        if query_type not in self._handlers:
            raise ValueError(f"No handler registered for query: {query_type.__name__}")

        handler = self._handlers[query_type]
        return await handler.handle(query)
