"""User-related commands for CQRS."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .command import Command
from domain.shared.value_objects.email import Email
from domain.shared.value_objects.name import Name
from domain.shared.value_objects.url import Url
from domain.user.value_objects.user_id import UserId
from domain.user.value_objects.employee_id import EmployeeId


@dataclass
class CreateUserCommand(Command):
    """Command to create a new user."""

    user_id: UserId
    name: Name
    email: Email
    hashed_password: str
    employee_id: Optional[EmployeeId] = None
    title: Optional[str] = None
    division: Optional[str] = None
    avatar: Optional[Url] = None


@dataclass
class UpdateUserProfileCommand(Command):
    """Command to update user profile."""

    user_id: UserId
    name: Optional[Name] = None
    title: Optional[str] = None
    division: Optional[str] = None
    avatar: Optional[Url] = None


@dataclass
class ChangeUserPasswordCommand(Command):
    """Command to change user password."""

    user_id: UserId
    new_hashed_password: str


@dataclass
class AddUserToProjectCommand(Command):
    """Command to add user to a project."""

    user_id: UserId
    project_id: str


@dataclass
class RemoveUserFromProjectCommand(Command):
    """Command to remove user from a project."""

    user_id: UserId
    project_id: str


@dataclass
class ActivateUserCommand(Command):
    """Command to activate a user."""

    user_id: UserId


@dataclass
class DeactivateUserCommand(Command):
    """Command to deactivate a user."""

    user_id: UserId
