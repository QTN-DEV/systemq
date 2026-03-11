"""Project Mapping schemas."""

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field


class CreateProjectMappingRequest(BaseModel):
    project_name: str = Field(description="The main project name")
    mapped_names: List[str] = Field(
        description="List of project_name values to map to this project"
    )


class UpdateProjectMappingRequest(BaseModel):
    project_name: str = Field(description="The main project name")
    mapped_names: List[str] = Field(
        description="List of project_name values to map to this project"
    )


class ProjectMappingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str | None = Field(None, description="Unique identifier for the mapping", alias="_id")
    project_name: str = Field(description="The main project name")
    mapped_names: List[str] = Field(
        description="List of project_name values that map to this project"
    )
    created_at: datetime = Field(description="Timestamp when mapping was created")
    updated_at: datetime = Field(description="Timestamp when mapping was last updated")
