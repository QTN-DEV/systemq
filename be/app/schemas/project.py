from __future__ import annotations

from pydantic import BaseModel, Field, HttpUrl


class ProjectBase(BaseModel):
    name: str = Field(min_length=1)
    avatar: HttpUrl | None = None


class ProjectCreate(ProjectBase):
    id: str = Field(min_length=1)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    avatar: HttpUrl | None = None


class Project(ProjectBase):
    id: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "proj-001",
                "name": "QuantumByte",
                "avatar": "https://example.com/logo.png",
            }
        }
    }
