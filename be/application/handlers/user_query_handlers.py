"""User query handlers."""

from __future__ import annotations

from typing import Optional

from domain.user.entities.user import User
from infrastructure.repositories.user_repository import UserRepository
from application.queries.user_queries import (
    GetUserByIdQuery,
    GetUserByEmailQuery,
    GetUsersByDivisionQuery,
    GetUserSubordinatesQuery,
    SearchUsersQuery,
)
from application.queries.query_handler import QueryHandler


class GetUserByIdQueryHandler(QueryHandler[GetUserByIdQuery, Optional[User]]):
    """Handler for getting users by ID."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, query: GetUserByIdQuery) -> Optional[User]:
        """Handle the get user by ID query."""
        return await self._user_repository.find_by_id(query.user_id.value)


class GetUserByEmailQueryHandler(QueryHandler[GetUserByEmailQuery, Optional[User]]):
    """Handler for getting users by email."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, query: GetUserByEmailQuery) -> Optional[User]:
        """Handle the get user by email query."""
        # This would typically use a read model for performance
        # For now, we can't efficiently search by email with event sourcing alone
        return await self._user_repository.find_by_email(query.email)


class GetUsersByDivisionQueryHandler(QueryHandler[GetUsersByDivisionQuery, list]):
    """Handler for getting users by division."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, query: GetUsersByDivisionQuery) -> list:
        """Handle the get users by division query."""
        # This would typically use a read model
        # For demonstration, we'll return an empty list
        # In a real system, we'd have a separate read database
        return []


class GetUserSubordinatesQueryHandler(QueryHandler[GetUserSubordinatesQuery, list]):
    """Handler for getting user subordinates."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, query: GetUserSubordinatesQuery) -> list:
        """Handle the get user subordinates query."""
        user = await self._user_repository.find_by_id(query.user_id.value)
        if not user:
            return []

        # Get subordinates
        subordinates = []
        for subordinate_id in user.subordinates:
            subordinate = await self._user_repository.find_by_id(subordinate_id.value)
            if subordinate:
                subordinates.append(subordinate)

        return subordinates


class SearchUsersQueryHandler(QueryHandler[SearchUsersQuery, list]):
    """Handler for searching users."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, query: SearchUsersQuery) -> list:
        """Handle the search users query."""
        # This would typically use a read model with full-text search
        # For demonstration, we'll return an empty list
        return []
