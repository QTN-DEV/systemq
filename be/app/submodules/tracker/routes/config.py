"""Tracker config routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.submodules.tracker.schemas.config import TrackerConfigResponse, TrackerConfigUpdate
from app.submodules.tracker.services import config as config_service

router = APIRouter(prefix="/config", tags=["Tracker"])

_PLANNING = "planning_status"
_ISSUE = "issue_status"


@router.get("/planning-statuses", response_model=TrackerConfigResponse)
async def get_planning_statuses() -> TrackerConfigResponse:
    cfg = await config_service.get_config(_PLANNING)
    return TrackerConfigResponse.model_validate(cfg)


@router.put("/planning-statuses", response_model=TrackerConfigResponse)
async def update_planning_statuses(payload: TrackerConfigUpdate) -> TrackerConfigResponse:
    cfg = await config_service.update_config(_PLANNING, payload.values)
    return TrackerConfigResponse.model_validate(cfg)


@router.get("/issue-statuses", response_model=TrackerConfigResponse)
async def get_issue_statuses() -> TrackerConfigResponse:
    cfg = await config_service.get_config(_ISSUE)
    return TrackerConfigResponse.model_validate(cfg)


@router.put("/issue-statuses", response_model=TrackerConfigResponse)
async def update_issue_statuses(payload: TrackerConfigUpdate) -> TrackerConfigResponse:
    cfg = await config_service.update_config(_ISSUE, payload.values)
    return TrackerConfigResponse.model_validate(cfg)
