"""Project Mapping endpoints."""

from datetime import datetime
from typing import List

from beanie import PydanticObjectId
from fastapi import APIRouter, HTTPException, status

from app.models.project_mapping import ProjectMapping
from app.models.slack_message import SlackMessage
from app.schemas.project_mapping import (
    CreateProjectMappingRequest,
    ProjectMappingResponse,
    UpdateProjectMappingRequest,
)

router = APIRouter(prefix="/project-mapping", tags=["Project Mappings"])


def serialize_mapping(mapping: ProjectMapping) -> ProjectMappingResponse:
    return ProjectMappingResponse(
        id=str(mapping.id),
        project_name=mapping.project_name,
        mapped_names=mapping.mapped_names,
        created_at=mapping.created_at,
        updated_at=mapping.updated_at,
    )


@router.get("/distinct-names", response_model=List[str])
async def get_distinct_project_names():
    """Get all distinct project names from parsed standup results."""
    try:
        messages = await SlackMessage.find({"parsed_result": {"$ne": None}}).to_list()

        project_names: set[str] = set()
        for message in messages:
            parsed_result = message.parsed_result or {}

            for summary in parsed_result.get("workload_summary", []):
                project_name = (summary.get("project_name") or "").strip()
                if project_name:
                    project_names.add(project_name)

            for day_plan in parsed_result.get("day_plan", []):
                project_name = (day_plan.get("project_name") or "").strip()
                if project_name:
                    project_names.add(project_name)

        return sorted(project_names)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve distinct project names")


@router.get("/mappings", response_model=List[ProjectMappingResponse])
async def get_project_mappings():
    """Get all project mappings."""
    mappings = await ProjectMapping.find_all().sort(+ProjectMapping.created_at).to_list()
    return [serialize_mapping(mapping) for mapping in mappings]


@router.post(
    "/mappings", response_model=ProjectMappingResponse, status_code=status.HTTP_201_CREATED
)
async def create_project_mapping(request: CreateProjectMappingRequest):
    """Create a new project mapping."""
    existing_mappings = await ProjectMapping.find_all().to_list()
    used_names = set()
    for mapping in existing_mappings:
        used_names.update(mapping.mapped_names)

    conflicts = set(request.mapped_names) & used_names
    if conflicts:
        raise HTTPException(
            status_code=400,
            detail=(
                f"These project names are already mapped to other Projects: {', '.join(conflicts)}."
            ),
        )

    mapping = ProjectMapping(
        project_name=request.project_name,
        mapped_names=request.mapped_names,
    )
    await mapping.insert()
    return serialize_mapping(mapping)


@router.get("/mappings/{mapping_id}", response_model=ProjectMappingResponse)
async def get_project_mapping_by_id(mapping_id: PydanticObjectId):
    """Get a specific project mapping by ID."""
    mapping = await ProjectMapping.get(mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Project mapping not found")
    return serialize_mapping(mapping)


@router.put("/mappings/{mapping_id}", response_model=ProjectMappingResponse)
async def update_project_mapping(
    mapping_id: PydanticObjectId, request: UpdateProjectMappingRequest
):
    """Update an existing project mapping."""
    existing_mapping = await ProjectMapping.get(mapping_id)
    if not existing_mapping:
        raise HTTPException(status_code=404, detail="Project mapping not found")

    all_mappings = await ProjectMapping.find_all().to_list()
    used_names = set()
    for mapping in all_mappings:
        if mapping.id != mapping_id:
            used_names.update(mapping.mapped_names)

    conflicts = set(request.mapped_names) & used_names
    if conflicts:
        raise HTTPException(
            status_code=400,
            detail=(
                f"These project names are already mapped to other Projects: {', '.join(conflicts)}."
            ),
        )

    existing_mapping.project_name = request.project_name
    existing_mapping.mapped_names = request.mapped_names
    existing_mapping.updated_at = datetime.utcnow()
    await existing_mapping.save()

    return serialize_mapping(existing_mapping)


@router.delete("/mappings/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_mapping(mapping_id: PydanticObjectId):
    """Delete a project mapping."""
    existing_mapping = await ProjectMapping.get(mapping_id)
    if not existing_mapping:
        raise HTTPException(status_code=404, detail="Project mapping not found")

    await existing_mapping.delete()
