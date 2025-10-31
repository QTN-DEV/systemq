"""User repository implementation using direct state storage."""

from __future__ import annotations

from typing import Optional

from .aggregate_repository import AggregateRepository
from ..database.user_document import UserDocument
from domain.user.entities.user import User


class UserRepository(AggregateRepository[User]):
    """Repository for User aggregates using direct state storage."""

    async def save(self, aggregate: User) -> None:
        """Save a user aggregate by storing its current state."""
        # Clear domain events since we're not using event sourcing
        aggregate.clear_domain_events()

        # Convert to document and save
        document = UserDocument.from_user(aggregate)
        await document.save()

    async def find_by_id(self, aggregate_id: str) -> Optional[User]:
        """Find a user by its ID."""
        try:
            document = await UserDocument.find_one(UserDocument.user_id == aggregate_id)
            return document.to_user() if document else None
        except Exception:
            return None

    async def exists(self, aggregate_id: str) -> bool:
        """Check if a user exists."""
        try:
            document = await UserDocument.find_one(UserDocument.user_id == aggregate_id)
            return document is not None
        except Exception:
            return False

    async def delete(self, aggregate_id: str) -> None:
        """Delete a user."""
        try:
            document = await UserDocument.find_one(UserDocument.user_id == aggregate_id)
            if document:
                await document.delete()
        except Exception:
            pass  # User not found, ignore

    async def find_by_email(self, email: str) -> Optional[User]:
        """Find a user by email."""
        try:
            document = await UserDocument.find_one(UserDocument.email == email)
            return document.to_user() if document else None
        except Exception:
            return None

    async def find_by_employee_id(self, employee_id: str) -> Optional[User]:
        """Find a user by employee ID."""
        try:
            document = await UserDocument.find_one(UserDocument.employee_id == employee_id)
            return document.to_user() if document else None
        except Exception:
            return None
