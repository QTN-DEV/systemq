"""User command handlers."""

from __future__ import annotations

from domain.user.entities.user import User
from domain.user.value_objects.user_id import UserId
from infrastructure.repositories.user_repository import UserRepository
from application.commands.user_commands import (
    CreateUserCommand,
    UpdateUserProfileCommand,
    ChangeUserPasswordCommand,
    AddUserToProjectCommand,
    RemoveUserFromProjectCommand,
    ActivateUserCommand,
    DeactivateUserCommand,
)
from application.commands.command_handler import CommandHandler


class CreateUserCommandHandler(CommandHandler[CreateUserCommand]):
    """Handler for creating users."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, command: CreateUserCommand) -> None:
        """Handle the create user command."""
        # Check if user already exists
        existing_user = await self._user_repository.find_by_id(command.user_id.value)
        if existing_user:
            raise ValueError(f"User with ID {command.user_id.value} already exists")

        # Create the user
        user = User.create(
            user_id=command.user_id,
            name=command.name,
            email=command.email,
            hashed_password=command.hashed_password,
            employee_id=command.employee_id,
            title=command.title,
            division=command.division,
            avatar=command.avatar,
        )

        # Save the user (this will save the events)
        await self._user_repository.save(user)


class UpdateUserProfileCommandHandler(CommandHandler[UpdateUserProfileCommand]):
    """Handler for updating user profiles."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, command: UpdateUserProfileCommand) -> None:
        """Handle the update user profile command."""
        # Find the user
        user = await self._user_repository.find_by_id(command.user_id.value)
        if not user:
            raise ValueError(f"User with ID {command.user_id.value} not found")

        # Update the profile
        user.update_profile(
            name=command.name,
            title=command.title,
            division=command.division,
            avatar=command.avatar,
        )

        # Save the user
        await self._user_repository.save(user)


class ChangeUserPasswordCommandHandler(CommandHandler[ChangeUserPasswordCommand]):
    """Handler for changing user passwords."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, command: ChangeUserPasswordCommand) -> None:
        """Handle the change password command."""
        user = await self._user_repository.find_by_id(command.user_id.value)
        if not user:
            raise ValueError(f"User with ID {command.user_id.value} not found")

        user.change_password(command.new_hashed_password)
        await self._user_repository.save(user)


class AddUserToProjectCommandHandler(CommandHandler[AddUserToProjectCommand]):
    """Handler for adding users to projects."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, command: AddUserToProjectCommand) -> None:
        """Handle the add to project command."""
        user = await self._user_repository.find_by_id(command.user_id.value)
        if not user:
            raise ValueError(f"User with ID {command.user_id.value} not found")

        user.add_project(command.project_id)
        await self._user_repository.save(user)


class RemoveUserFromProjectCommandHandler(CommandHandler[RemoveUserFromProjectCommand]):
    """Handler for removing users from projects."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, command: RemoveUserFromProjectCommand) -> None:
        """Handle the remove from project command."""
        user = await self._user_repository.find_by_id(command.user_id.value)
        if not user:
            raise ValueError(f"User with ID {command.user_id.value} not found")

        user.remove_project(command.project_id)
        await self._user_repository.save(user)


class ActivateUserCommandHandler(CommandHandler[ActivateUserCommand]):
    """Handler for activating users."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, command: ActivateUserCommand) -> None:
        """Handle the activate user command."""
        user = await self._user_repository.find_by_id(command.user_id.value)
        if not user:
            raise ValueError(f"User with ID {command.user_id.value} not found")

        user.activate()
        await self._user_repository.save(user)


class DeactivateUserCommandHandler(CommandHandler[DeactivateUserCommand]):
    """Handler for deactivating users."""

    def __init__(self, user_repository: UserRepository):
        """Initialize the handler."""
        self._user_repository = user_repository

    async def handle(self, command: DeactivateUserCommand) -> None:
        """Handle the deactivate user command."""
        user = await self._user_repository.find_by_id(command.user_id.value)
        if not user:
            raise ValueError(f"User with ID {command.user_id.value} not found")

        user.deactivate()
        await self._user_repository.save(user)
