"""User application service."""

from __future__ import annotations

from typing import Optional

from application.commands.user_commands import (
    CreateUserCommand,
    UpdateUserProfileCommand,
    ChangeUserPasswordCommand,
)
from application.queries.user_queries import GetUserByIdQuery
from application.commands.command_bus import CommandBus
from application.queries.query_bus import QueryBus
from domain.user.entities.user import User
from domain.user.value_objects.user_id import UserId
from domain.shared.value_objects.email import Email
from domain.shared.value_objects.name import Name
from domain.shared.value_objects.url import Url
from domain.user.value_objects.employee_id import EmployeeId


class UserApplicationService:
    """Application service for user operations."""

    def __init__(self, command_bus: CommandBus, query_bus: QueryBus):
        """Initialize the service."""
        self._command_bus = command_bus
        self._query_bus = query_bus

    async def create_user(
        self,
        user_id: str,
        name: str,
        email: str,
        hashed_password: str,
        employee_id: Optional[str] = None,
        title: Optional[str] = None,
        division: Optional[str] = None,
        avatar: Optional[str] = None,
    ) -> None:
        """Create a new user."""
        command = CreateUserCommand(
            user_id=UserId(user_id),
            name=Name(name.split()[0], " ".join(name.split()[1:]) if len(name.split()) > 1 else ""),
            email=Email(email),
            hashed_password=hashed_password,
            employee_id=EmployeeId(employee_id) if employee_id else None,
            title=title,
            division=division,
            avatar=Url(avatar) if avatar else None,
        )
        await self._command_bus.dispatch(command)

    async def get_user(self, user_id: str) -> Optional[User]:
        """Get a user by ID."""
        query = GetUserByIdQuery(user_id=UserId(user_id))
        return await self._query_bus.dispatch(query)

    async def update_user_profile(
        self,
        user_id: str,
        name: Optional[str] = None,
        title: Optional[str] = None,
        division: Optional[str] = None,
        avatar: Optional[str] = None,
    ) -> None:
        """Update user profile."""
        parsed_name = None
        if name:
            name_parts = name.split()
            parsed_name = Name(name_parts[0], " ".join(name_parts[1:]) if len(name_parts) > 1 else "")

        command = UpdateUserProfileCommand(
            user_id=UserId(user_id),
            name=parsed_name,
            title=title,
            division=division,
            avatar=Url(avatar) if avatar else None,
        )
        await self._command_bus.dispatch(command)

    async def change_password(self, user_id: str, new_hashed_password: str) -> None:
        """Change user password."""
        command = ChangeUserPasswordCommand(
            user_id=UserId(user_id),
            new_hashed_password=new_hashed_password,
        )
        await self._command_bus.dispatch(command)
