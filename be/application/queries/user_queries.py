"""User-related queries for CQRS."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

from .query import Query
from domain.user.value_objects.user_id import UserId


@dataclass
class GetUserByIdQuery(Query):
    """Query to get a user by ID."""

    user_id: UserId


@dataclass
class GetUserByEmailQuery(Query):
    """Query to get a user by email."""

    email: str


@dataclass
class GetUsersByDivisionQuery(Query):
    """Query to get users by division."""

    division: str
    limit: int = 50
    offset: int = 0


@dataclass
class GetUserSubordinatesQuery(Query):
    """Query to get subordinates of a user."""

    user_id: UserId


@dataclass
class SearchUsersQuery(Query):
    """Query to search users."""

    search_term: str
    division: Optional[str] = None
    limit: int = 50
    offset: int = 0
