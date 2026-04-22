"""Daily standup routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from datetime import date
from typing import Optional

from app.submodules.daily_standup.repository import get_daily_standup_repo
from app.submodules.daily_standup.schemas import PaginatedStandUpEntries, SearchStandUpEntryOptions
from app.submodules.daily_standup.service import DailyStandupService, DailyStandupServiceError

router = APIRouter(prefix="/daily-standups", tags=["Daily Standups"])


@router.get(
    "/",
    response_model=PaginatedStandUpEntries,
    summary="Search daily standup entries",
    response_description="Paginated list of standup entries matching the given filters.",
)
async def search_daily_standups(
    content: Optional[str] = Query(None, description="Filter by content (case-insensitive substring match)"),
    start_date: Optional[date] = Query(None, description="Include entries on or after this date"),
    end_date: Optional[date] = Query(None, description="Include entries on or before this date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of results per page"),
) -> PaginatedStandUpEntries:
    service = DailyStandupService(repository=get_daily_standup_repo())
    options = SearchStandUpEntryOptions(
        content=content,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    try:
        return await service.search(options)
    except DailyStandupServiceError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
