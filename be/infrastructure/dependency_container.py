"""Dependency injection container for the application."""

from __future__ import annotations

from application.commands.command_bus import CommandBus
from application.queries.query_bus import QueryBus
from application.handlers.user_command_handlers import (
    CreateUserCommandHandler,
    UpdateUserProfileCommandHandler,
    ChangeUserPasswordCommandHandler,
    AddUserToProjectCommandHandler,
    RemoveUserFromProjectCommandHandler,
    ActivateUserCommandHandler,
    DeactivateUserCommandHandler,
)
from application.handlers.user_query_handlers import (
    GetUserByIdQueryHandler,
    GetUserByEmailQueryHandler,
    GetUsersByDivisionQueryHandler,
    GetUserSubordinatesQueryHandler,
    SearchUsersQueryHandler,
)
from application.services.user_application_service import UserApplicationService
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
from application.queries.user_queries import (
    GetUserByIdQuery,
    GetUserByEmailQuery,
    GetUsersByDivisionQuery,
    GetUserSubordinatesQuery,
    SearchUsersQuery,
)


class DependencyContainer:
    """Dependency injection container."""

    def __init__(self) -> None:
        """Initialize the container."""
        # Repositories
        self._user_repository = UserRepository()

        # Command handlers
        self._create_user_handler = CreateUserCommandHandler(self._user_repository)
        self._update_user_profile_handler = UpdateUserProfileCommandHandler(self._user_repository)
        self._change_password_handler = ChangeUserPasswordCommandHandler(self._user_repository)
        self._add_to_project_handler = AddUserToProjectCommandHandler(self._user_repository)
        self._remove_from_project_handler = RemoveUserFromProjectCommandHandler(self._user_repository)
        self._activate_user_handler = ActivateUserCommandHandler(self._user_repository)
        self._deactivate_user_handler = DeactivateUserCommandHandler(self._user_repository)

        # Query handlers
        self._get_user_by_id_handler = GetUserByIdQueryHandler(self._user_repository)
        self._get_user_by_email_handler = GetUserByEmailQueryHandler(self._user_repository)
        self._get_users_by_division_handler = GetUsersByDivisionQueryHandler(self._user_repository)
        self._get_user_subordinates_handler = GetUserSubordinatesQueryHandler(self._user_repository)
        self._search_users_handler = SearchUsersQueryHandler(self._user_repository)

        # Command bus
        self._command_bus = CommandBus()
        self._register_command_handlers()

        # Query bus
        self._query_bus = QueryBus()
        self._register_query_handlers()

        # Application services
        self._user_application_service = UserApplicationService(
            self._command_bus,
            self._query_bus
        )

    def _register_command_handlers(self) -> None:
        """Register all command handlers."""
        self._command_bus.register_handler(CreateUserCommand, self._create_user_handler)
        self._command_bus.register_handler(UpdateUserProfileCommand, self._update_user_profile_handler)
        self._command_bus.register_handler(ChangeUserPasswordCommand, self._change_password_handler)
        self._command_bus.register_handler(AddUserToProjectCommand, self._add_to_project_handler)
        self._command_bus.register_handler(RemoveUserFromProjectCommand, self._remove_from_project_handler)
        self._command_bus.register_handler(ActivateUserCommand, self._activate_user_handler)
        self._command_bus.register_handler(DeactivateUserCommand, self._deactivate_user_handler)

    def _register_query_handlers(self) -> None:
        """Register all query handlers."""
        self._query_bus.register_handler(GetUserByIdQuery, self._get_user_by_id_handler)
        self._query_bus.register_handler(GetUserByEmailQuery, self._get_user_by_email_handler)
        self._query_bus.register_handler(GetUsersByDivisionQuery, self._get_users_by_division_handler)
        self._query_bus.register_handler(GetUserSubordinatesQuery, self._get_user_subordinates_handler)
        self._query_bus.register_handler(SearchUsersQuery, self._search_users_handler)

    @property
    def user_application_service(self) -> UserApplicationService:
        """Get the user application service."""
        return self._user_application_service

    @property
    def command_bus(self) -> CommandBus:
        """Get the command bus."""
        return self._command_bus

    @property
    def query_bus(self) -> QueryBus:
        """Get the query bus."""
        return self._query_bus

    # Event publisher removed for now - can be added later when needed


# Global container instance
_container: DependencyContainer | None = None


def get_container() -> DependencyContainer:
    """Get the global dependency container."""
    global _container
    if _container is None:
        _container = DependencyContainer()
    return _container


def init_container() -> DependencyContainer:
    """Initialize the dependency container."""
    global _container
    _container = DependencyContainer()
    return _container
