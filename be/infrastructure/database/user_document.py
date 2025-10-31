"""Database document for User entity."""

from beanie import Document
from pydantic import Field
from typing import Optional, List


class UserDocument(Document):
    """MongoDB document for User."""

    user_id: str
    name_first: str
    name_last: str
    email: str
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

    class Settings:
        """Beanie settings for User collection."""
        name = "users"

    @classmethod
    def from_user(cls, user):
        """Create document from User entity."""
        from domain.shared.value_objects.name import Name
        from domain.shared.value_objects.email import Email

        return cls(
            user_id=user.user_id,
            name_first=user.name.first_name,
            name_last=user.name.last_name,
            email=user.email.value,
            hashed_password=user.hashed_password,
            employee_id=user.employee_id,
            title=user.title,
            division=user.division,
            level=user.level,
            position=user.position,
            employment_type=user.employment_type,
            subordinates=user.subordinates,
            projects=user.projects,
            avatar=user.avatar,
            is_active=user.is_active,
        )

    def to_user(self):
        """Convert document to User entity."""
        from domain.user.entities.user import User
        from domain.shared.value_objects.name import Name
        from domain.shared.value_objects.email import Email
        from domain.user.value_objects.user_id import UserId
        from domain.user.value_objects.employee_id import EmployeeId

        return User(
            user_id=UserId(self.user_id),
            name=Name(self.name_first, self.name_last),
            email=Email(self.email),
            hashed_password=self.hashed_password,
            employee_id=EmployeeId(self.employee_id) if self.employee_id else None,
            title=self.title,
            division=self.division,
            level=self.level,
            position=self.position,
            employment_type=self.employment_type,
            subordinates=self.subordinates,
            projects=self.projects,
            avatar=self.avatar,
            is_active=self.is_active,
        )
