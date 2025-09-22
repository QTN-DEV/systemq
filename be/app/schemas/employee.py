from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, HttpUrl


class EmployeeBase(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    title: str | None = None
    division: str | None = None
    level: str | None = None
    position: str | None = None
    subordinates: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    avatar: HttpUrl | None = None


class EmployeeCreate(EmployeeBase):
    id: str = Field(min_length=1)


class Employee(EmployeeBase):
    id: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "QTN-001",
                "name": "Kevin Daniel P.",
                "email": "kevin@quantumtechnologi.com",
                "title": "CEO",
                "division": "Management",
                "level": "Executive",
                "position": "CEO",
                "subordinates": ["QTN-002", "QTN-003"],
                "projects": ["proj-001", "proj-002"],
                "avatar": "https://example.com/avatar.png",
            }
        }
    }
