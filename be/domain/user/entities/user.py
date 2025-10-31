"""User aggregate root."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from pydantic import BaseModel, Field
from typing import Optional, List
from domain.shared.value_objects.email import Email
from domain.shared.value_objects.name import Name
from domain.shared.value_objects.url import Url
from domain.user.value_objects.user_id import UserId
from domain.user.value_objects.employee_id import EmployeeId
from domain.user.value_objects.position import Position
from domain.user.value_objects.employment_type import EmploymentType
from domain.user.events.user_created import UserCreatedEvent
from domain.user.events.user_updated import UserUpdatedEvent
from domain.user.events.user_password_changed import UserPasswordChangedEvent


class User(BaseModel):
    """User aggregate root."""

    user_id: str
    name: Name
    email: Email
    hashed_password: str
    employee_id: Optional[str] = None
    title: Optional[str] = None
    division: Optional[str] = None
    level: Optional[str] = None
    position: Optional[str] = None
    employment_type: str = "full-time"
    subordinates: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    avatar: Optional[str] = None
    is_active: bool = True

    # Domain events storage
    domain_events: List = Field(default_factory=list, exclude=True)

    def __init__(
        self,
        user_id: UserId,
        name: Name,
        email: Email,
        hashed_password: str,
        employee_id: Optional[EmployeeId] = None,
        title: Optional[str] = None,
        division: Optional[str] = None,
        avatar: Optional[Url] = None,
        **data
    ):
        """Initialize the user."""
        # Call parent constructor first
        super().__init__(
            user_id=user_id.value,
            name=name,
            email=email,
            hashed_password=hashed_password,
            employee_id=employee_id.value if employee_id else None,
            title=title,
            division=division,
            avatar=avatar.value if avatar else None,
            **data
        )

        # Initialize domain events after parent constructor
        object.__setattr__(self, 'domain_events', [])

    def add_domain_event(self, event):
        """Add a domain event."""
        self.domain_events.append(event)

    def clear_domain_events(self):
        """Clear and return all domain events."""
        events = self.domain_events.copy()
        self.domain_events.clear()
        return events

    def get_domain_events(self):
        """Get all domain events without clearing them."""
        return self.domain_events.copy()

    def touch(self):
        """Update the last modified timestamp (no-op for now)."""
        pass  # In a real implementation, this would update a timestamp field

    @classmethod
    def create(
        cls,
        user_id: UserId,
        name: Name,
        email: Email,
        hashed_password: str,
        employee_id: Optional[EmployeeId] = None,
        title: Optional[str] = None,
        division: Optional[str] = None,
        avatar: Optional[Url] = None,
    ) -> User:
        """Create a new user."""
        user = cls(
            user_id=user_id,
            name=name,
            email=email,
            hashed_password=hashed_password,
            employee_id=employee_id,
            title=title,
            division=division,
            avatar=avatar,
        )

        # Add domain event
        user.add_domain_event(UserCreatedEvent(
            aggregate_id=user.user_id,
            user_id=user_id,
            email=user.email,
            name=user.name
        ))

        return user

    def update_profile(
        self,
        name: Optional[Name] = None,
        title: Optional[str] = None,
        division: Optional[str] = None,
        avatar: Optional[Url] = None
    ) -> None:
        """Update user profile information."""
        changes = {}

        if name is not None and name != self.name:
            changes["name"] = {"old": self.name.full_name, "new": name.full_name}
            self.name = name

        if title is not None and title != self.title:
            changes["title"] = {"old": self.title, "new": title}
            self.title = title

        if division is not None and division != self.division:
            changes["division"] = {"old": self.division, "new": division}
            self.division = division

        if avatar != self.avatar:
            changes["avatar"] = {"old": str(self.avatar) if self.avatar else None, "new": str(avatar) if avatar else None}
            self.avatar = avatar

        if changes:
            self.touch()
            self.add_domain_event(UserUpdatedEvent(
                aggregate_id=self.user_id,
                user_id=UserId(self.user_id),
                changes=changes
            ))

    def change_password(self, new_hashed_password: str) -> None:
        """Change user password."""
        if new_hashed_password == self.hashed_password:
            return  # No change needed

        self.hashed_password = new_hashed_password
        self.touch()

        self.add_domain_event(UserPasswordChangedEvent(
            aggregate_id=self.user_id,
            user_id=UserId(self.user_id)
        ))

    def add_subordinate(self, subordinate_id: UserId) -> None:
        """Add a subordinate user."""
        if subordinate_id not in self.subordinates:
            self.subordinates.append(subordinate_id)
            self.touch()

    def remove_subordinate(self, subordinate_id: UserId) -> None:
        """Remove a subordinate user."""
        if subordinate_id in self.subordinates:
            self.subordinates.remove(subordinate_id)
            self.touch()

    def add_project(self, project_id: str) -> None:
        """Add user to a project."""
        if project_id not in self.projects:
            self.projects.append(project_id)
            self.touch()

    def remove_project(self, project_id: str) -> None:
        """Remove user from a project."""
        if project_id in self.projects:
            self.projects.remove(project_id)
            self.touch()

    def activate(self) -> None:
        """Activate the user."""
        if not self.is_active:
            self.is_active = True
            self.touch()

    def deactivate(self) -> None:
        """Deactivate the user."""
        if self.is_active:
            self.is_active = False
            self.touch()

    @property
    def can_manage_users(self) -> bool:
        """Check if user can manage other users."""
        return self.position is not None and self.position.can_manage_users

    @property
    def is_admin(self) -> bool:
        """Check if user is admin."""
        return self.position is not None and self.position.is_admin

    @property
    def is_manager(self) -> bool:
        """Check if user is manager."""
        return self.position is not None and self.position.is_manager

    class Settings:
        """Beanie settings for User collection."""
        name = "users"
