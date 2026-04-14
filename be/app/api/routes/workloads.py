"""Workload endpoints."""

import io
import os
from datetime import UTC, date, datetime, timedelta
from typing import Any, List, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from slack_sdk.errors import SlackApiError

from app.models.project_mapping import ProjectMapping
from app.models.slack_message import SlackMessage
from app.services.slack_crawler_service import slack_crawler
from app.schemas.workload import WorkloadEntriesResponse, WorkloadStandupSummary

router = APIRouter(prefix="/workloads", tags=["Workloads"])


def _normalize_project_name(project_name: str) -> str:
    return project_name.strip().casefold()


def _find_project_mapping(
    project_name: str,
    project_mappings: List[ProjectMapping],
) -> ProjectMapping | None:
    normalized_project_name = _normalize_project_name(project_name)
    if not normalized_project_name:
        return None

    for mapping in project_mappings:
        normalized_mapped_names = {
            _normalize_project_name(mapped_name) for mapped_name in mapping.mapped_names
        }
        if normalized_project_name in normalized_mapped_names:
            return mapping

    return None


def get_mapped_project_name(project_name: str, project_mappings: List[ProjectMapping]) -> str:
    mapping = _find_project_mapping(project_name, project_mappings)
    if mapping is not None:
        return mapping.project_name
    return project_name


async def _load_project_mappings() -> List[ProjectMapping]:
    return await ProjectMapping.find_all().to_list()


async def _fetch_workload_messages(
    user_id: Optional[str] = None,
    excluded_user_ids: Optional[str] = None,
    since_timestamp: Optional[int] = None,
) -> list[SlackMessage]:
    excluded_users = set(excluded_user_ids.split(",")) if excluded_user_ids else set()

    query_params: dict[str, Any] = {
        "parsed_result": {"$ne": None},
    }

    if user_id:
        query_params["user_id"] = user_id

    if excluded_users:
        query_params["user_id"] = {"$nin": list(excluded_users)}

    if since_timestamp is not None:
        query_params["timestamp"] = {"$gte": since_timestamp}

    messages = await SlackMessage.find(query_params).sort(-SlackMessage.timestamp).to_list()
    return messages

def _extract_recent_mapped_project_names(
    messages: list[SlackMessage],
    project_mappings: list[ProjectMapping],
) -> set[str]:
    recent_project_names: set[str] = set()

    for message in messages:
        parsed_result = message.parsed_result or {}
        workload_summary = parsed_result.get("workload_summary", [])

        for summary in workload_summary:
            original_project = (summary.get("project_name") or "").strip()
            mapping = _find_project_mapping(original_project, project_mappings)
            if mapping is not None:
                recent_project_names.add(mapping.project_name)

    return recent_project_names


def _resolve_date_range(
    start_date: Optional[str],
    end_date: Optional[str],
) -> tuple[date, date]:
    if start_date and end_date:
        return (
            datetime.strptime(start_date, "%Y-%m-%d").date(),
            datetime.strptime(end_date, "%Y-%m-%d").date(),
        )

    end_dt = datetime.now().date()
    start_dt = end_dt - timedelta(days=30)
    return start_dt, end_dt


def _parse_entry_date(entry_date: str) -> date:
    return datetime.strptime(entry_date, "%Y-%m-%d").date()


def _classify_work_type(project: str, activity_description: str) -> str:
    work_type = "Development"
    lower_proj = project.lower()
    lower_act = activity_description.lower()

    if any(kw in lower_proj for kw in ["meeting", "standup", "review"]):
        return "Meeting"
    if any(kw in lower_act for kw in ["doc", "documentation", "guide", "readme"]):
        return "Documentation"
    if any(kw in lower_act for kw in ["test", "testing", "qa", "bug"]):
        return "Testing"
    if any(kw in lower_act for kw in ["support", "help", "issue", "troubleshoot"]):
        return "Support"
    return work_type


def _is_billable_project(project: str) -> bool:
    lower_proj = project.lower()
    return not any(kw in lower_proj for kw in ["internal", "admin", "vacation", "sick"])


def _build_workload_entries(
    messages: list[SlackMessage],
    project_mappings: list[ProjectMapping],
    start_dt: date,
    end_dt: date,
    project_name: Optional[str] = None,
) -> list[dict[str, Any]]:
    workload_entries: list[dict[str, Any]] = []
    entry_id = 1

    for msg in messages:
        uid = msg.user_id
        name = msg.name
        timestamp = msg.timestamp
        default_date_str = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")

        parsed_result = msg.parsed_result or {}
        workload_summary = parsed_result.get("workload_summary", [])

        for summary in workload_summary:
            original_project = summary.get("project_name", "")
            mapped_project = get_mapped_project_name(original_project, project_mappings)
            hours = summary.get("project_manhour", 0)
            done_items = summary.get("done_items", [])
            entry_date = summary.get("date") or default_date_str
            try:
                parsed_entry_date = _parse_entry_date(entry_date)
            except ValueError:
                continue

            if not mapped_project or hours <= 0:
                continue

            if parsed_entry_date < start_dt or parsed_entry_date > end_dt:
                continue

            if project_name and mapped_project != project_name:
                continue

            activity_description = (
                "; ".join(done_items) if done_items else "No specific tasks listed"
            )

            overtime_hours = max(0, hours - 8) if hours > 8 else 0
            regular_hours = hours - overtime_hours
            is_billable = _is_billable_project(mapped_project)
            billable_hours = hours if is_billable else 0

            workload_entries.append(
                {
                    "id": entry_id,
                    "date": entry_date,
                    "user_id": uid,
                    "user": name,
                    "project": mapped_project,
                    "activity_description": activity_description,
                    "hours_worked": round(regular_hours, 1),
                    "overtime_hours": round(overtime_hours, 1),
                    "total_hours": round(hours, 1),
                    "work_type": _classify_work_type(mapped_project, activity_description),
                    "is_billable": is_billable,
                    "billable_hours": round(billable_hours, 1),
                    "notes": f"Reported at {datetime.fromtimestamp(timestamp).strftime('%H:%M')}",
                    "timestamp": timestamp,
                }
            )
            entry_id += 1

    return workload_entries


def _autosize_worksheet(worksheet) -> None:
    for column in worksheet.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except Exception:
                pass
        adjusted_width = min(max_length + 2, 50)
        worksheet.column_dimensions[column_letter].width = adjusted_width


def _get_monitored_channels() -> list[str]:
    raw = os.environ.get("MONITORED_CHANNELS", "")
    return [channel_id.strip() for channel_id in raw.split(",") if channel_id.strip()]


def _utc_day_bounds() -> tuple[float, float]:
    now = datetime.now(UTC)
    start_of_day = datetime(now.year, now.month, now.day, tzinfo=UTC)
    return start_of_day.timestamp(), now.timestamp()


async def _fetch_channel_member_ids(channel_id: str) -> set[str]:
    member_ids: set[str] = set()
    cursor: Optional[str] = None

    print("CHANNEL ID")
    print(channel_id)

    while True:
        response = await slack_crawler.client.conversations_members(
            channel=channel_id,
            cursor=cursor,
            limit=200,
        )
        print("RESPONSE")
        print(response)
        member_ids.update(response.get("members", []))

        cursor = response.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break

    return member_ids


async def _fetch_today_submitter_ids(channel_id: str) -> set[str]:
    submitter_ids: set[str] = set()
    cursor: Optional[str] = None
    oldest_ts, latest_ts = _utc_day_bounds()

    while True:
        response = await slack_crawler.client.conversations_history(
            channel=channel_id,
            oldest=str(oldest_ts),
            latest=str(latest_ts),
            limit=200,
            cursor=cursor,
            inclusive=True,
        )

        for message in response.get("messages", []):
            if slack_crawler._should_process_message(message):
                submitter_ids.add(message["user"])

        cursor = response.get("response_metadata", {}).get("next_cursor")
        if not response.get("has_more") or not cursor:
            break

    return submitter_ids


async def _resolve_user_names(user_ids: set[str]) -> list[str]:
    users: list[tuple[str, str]] = []

    for user_id in sorted(user_ids):
        response = await slack_crawler.client.users_info(user=user_id)
        user = response.get("user", {})
        if user.get("deleted") or user.get("is_bot"):
            continue

        profile = user.get("profile", {})
        display_name = (
            profile.get("display_name")
            or profile.get("real_name")
            or user.get("real_name")
            or user.get("name")
            or user_id
        )
        users.append((display_name.casefold(), display_name))

    return [display_name for _, display_name in sorted(users)]



@router.get("/standup-summary", response_model=WorkloadStandupSummary)
async def get_standup_summary() -> WorkloadStandupSummary:
    """Return who has and has not submitted today's standup."""
    channel_ids = _get_monitored_channels()
    if not channel_ids:
        return WorkloadStandupSummary(
            people_has_submitted=[],
            people_not_submitted=[],
        )

    try:
        channel_member_ids: set[str] = set()
        submitted_user_ids: set[str] = set()

        for channel_id in channel_ids:
            channel_member_ids.update(await _fetch_channel_member_ids(channel_id))
            submitted_user_ids.update(await _fetch_today_submitter_ids(channel_id))

        submitted_member_ids = channel_member_ids & submitted_user_ids
        not_submitted_member_ids = channel_member_ids - submitted_member_ids

        print("SUBMITTED MEMBER IDS")
        print(submitted_member_ids)
        print("NOT SUBMITTED MEMBER IDS")
        print(not_submitted_member_ids)

        return WorkloadStandupSummary(
            people_has_submitted=await _resolve_user_names(submitted_member_ids),
            people_not_submitted=await _resolve_user_names(not_submitted_member_ids),
        )
    except SlackApiError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to retrieve standup summary from Slack: {exc.response.get('error', str(exc))}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve standup summary: {exc}",
        ) from exc

@router.get("/ongoing-projects", response_model=list[str])
async def get_ongoing_projects() -> list[str]:
    """Return ongoing projects that had workload activity in the past week."""
    project_mappings = await _load_project_mappings()
    one_week_ago = datetime.now(UTC) - timedelta(days=7)
    recent_messages = await _fetch_workload_messages(
        since_timestamp=int(one_week_ago.timestamp())
    )
    recent_project_names = _extract_recent_mapped_project_names(
        recent_messages,
        project_mappings,
    )

    if not recent_project_names:
        return []

    return sorted(recent_project_names)

@router.get("/entries", response_model=WorkloadEntriesResponse)
async def get_workload_entries(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    user_id: Optional[str] = Query(None, description="Filter by specific user"),
    project_name: Optional[str] = Query(None, description="Filter by specific project"),
    excluded_user_ids: Optional[str] = Query(
        None, description="Comma-separated list of user IDs to exclude"
    ),
    limit: int = Query(100, description="Max number of entries to return"),
    offset: int = Query(0, description="Pagination offset"),
):
    try:
        start_dt, end_dt = _resolve_date_range(start_date, end_date)
        messages = await _fetch_workload_messages(
            user_id=user_id,
            excluded_user_ids=excluded_user_ids,
        )
        project_mappings = await _load_project_mappings()
        workload_entries = _build_workload_entries(
            messages,
            project_mappings,
            start_dt,
            end_dt,
            project_name,
        )

        total_entries = len(workload_entries)
        paginated_entries = workload_entries[offset : offset + limit]

        total_hours = sum(e["total_hours"] for e in workload_entries)
        total_overtime = sum(e["overtime_hours"] for e in workload_entries)
        total_billable = sum(e["billable_hours"] for e in workload_entries)
        unique_projects = len(set(e["project"] for e in workload_entries))

        return {
            "entries": paginated_entries,
            "pagination": {
                "total": total_entries,
                "limit": limit,
                "offset": offset,
                "has_next": offset + limit < total_entries,
                "has_prev": offset > 0,
            },
            "summary": {
                "total_hours": round(total_hours, 1),
                "total_overtime": round(total_overtime, 1),
                "total_billable": round(total_billable, 1),
                "unique_projects": unique_projects,
                "total_entries": total_entries,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve workload entries: {e}")


@router.get("/export-excel")
async def export_workload_excel(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    excluded_user_ids: Optional[str] = Query(
        None, description="Comma-separated list of user IDs to exclude"
    ),
):
    try:
        start_dt, end_dt = _resolve_date_range(start_date, end_date)
        messages = await _fetch_workload_messages(
            excluded_user_ids=excluded_user_ids,
        )
        project_mappings = await _load_project_mappings()
        workload_entries = _build_workload_entries(messages, project_mappings, start_dt, end_dt)

        if not workload_entries:
            raise HTTPException(
                status_code=404, detail="No data found for the specified date range"
            )

        mapped_project_names = sorted(
            {mapping.project_name for mapping in project_mappings}
            | {entry["project"] for entry in workload_entries}
        )
        grouped_rows: dict[tuple[str, str], dict[str, Any]] = {}

        for entry in sorted(
            workload_entries, key=lambda item: (item["date"], item["user"], item["project"])
        ):
            group_key = (entry["date"], entry["user"])
            if group_key not in grouped_rows:
                grouped_rows[group_key] = {
                    "Date": entry["date"],
                    "Name": entry["user"],
                }
                for project in mapped_project_names:
                    grouped_rows[group_key][project] = 0

            if entry["project"] in grouped_rows[group_key]:
                grouped_rows[group_key][entry["project"]] += entry["total_hours"]

        excel_rows = [
            grouped_rows[key]
            for key in sorted(grouped_rows.keys(), key=lambda item: (item[0], item[1]))
        ]

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            pd.DataFrame(excel_rows).to_excel(writer, index=False, sheet_name="Workload Report")
            _autosize_worksheet(writer.sheets["Workload Report"])

        output.seek(0)
        dt_start_str = start_date or start_dt.strftime("%Y-%m-%d")
        dt_end_str = end_date or end_dt.strftime("%Y-%m-%d")
        filename = f"workload_report_{dt_start_str}_to_{dt_end_str}.xlsx"

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export Excel file: {e}")
