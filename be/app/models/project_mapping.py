"""Project Mapping model."""

from datetime import datetime

from beanie import Document
from pydantic import Field


class ProjectMapping(Document):
    """Project grouping mapping."""

    project_name: str
    mapped_names: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "project_mappings"
