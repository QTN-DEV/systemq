"""Workload endpoints."""

import io
from datetime import datetime, timedelta
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.models.project_mapping import ProjectMapping
from app.models.slack_message import SlackMessage
from app.schemas.workload import WorkloadEntriesResponse

router = APIRouter(prefix="/workloads", tags=["Workloads"])


def get_mapped_project_name(project_name: str, project_mappings: List[ProjectMapping]) -> str:
    if not project_name:
        return project_name
    for mapping in project_mappings:
        if project_name in mapping.mapped_names:
            return mapping.project_name
    return project_name


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
        if start_date and end_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        else:
            end_dt = datetime.now()
            start_dt = end_dt - timedelta(days=30)

        start_timestamp = int(start_dt.timestamp())
        end_timestamp = int(end_dt.timestamp())

        excluded_users = set(excluded_user_ids.split(",")) if excluded_user_ids else set()

        query_params = {
            "timestamp": {"$gte": start_timestamp, "$lt": end_timestamp},
            "parsed_result": {"$ne": None},
        }

        if user_id:
            query_params["user_id"] = user_id

        if excluded_users:
            query_params["user_id"] = {"$nin": list(excluded_users)}

        messages = await SlackMessage.find(query_params).sort(-SlackMessage.timestamp).to_list()

        workload_entries = []
        entry_id = 1

        for msg in messages:
            uid = msg.user_id
            name = msg.name
            timestamp = msg.timestamp
            date_str = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")

            parsed_result = msg.parsed_result or {}
            workload_summary = parsed_result.get("workload_summary", [])

            for summary in workload_summary:
                project = summary.get("project_name", "")
                hours = summary.get("project_manhour", 0)
                done_items = summary.get("done_items", [])

                if not project or hours <= 0:
                    continue

                if project_name and project != project_name:
                    continue

                activity_description = (
                    "; ".join(done_items) if done_items else "No specific tasks listed"
                )

                work_type = "Development"
                lower_proj = project.lower()
                lower_act = activity_description.lower()

                if any(kw in lower_proj for kw in ["meeting", "standup", "review"]):
                    work_type = "Meeting"
                elif any(kw in lower_act for kw in ["doc", "documentation", "guide", "readme"]):
                    work_type = "Documentation"
                elif any(kw in lower_act for kw in ["test", "testing", "qa", "bug"]):
                    work_type = "Testing"
                elif any(kw in lower_act for kw in ["support", "help", "issue", "troubleshoot"]):
                    work_type = "Support"

                overtime_hours = max(0, hours - 8) if hours > 8 else 0
                regular_hours = hours - overtime_hours

                is_billable = not any(
                    kw in lower_proj for kw in ["internal", "admin", "vacation", "sick"]
                )
                billable_hours = hours if is_billable else 0

                workload_entries.append(
                    {
                        "id": entry_id,
                        "date": date_str,
                        "user_id": uid,
                        "user": name,
                        "project": project,
                        "activity_description": activity_description,
                        "hours_worked": round(regular_hours, 1),
                        "overtime_hours": round(overtime_hours, 1),
                        "total_hours": round(hours, 1),
                        "work_type": work_type,
                        "is_billable": is_billable,
                        "billable_hours": round(billable_hours, 1),
                        "notes": (
                            f"Reported at {datetime.fromtimestamp(timestamp).strftime('%H:%M')}"
                        ),
                        "timestamp": timestamp,
                    }
                )
                entry_id += 1

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
        if start_date and end_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        else:
            end_dt = datetime.now()
            start_dt = end_dt - timedelta(days=30)

        date_list = []
        current_date = start_dt
        while current_date <= end_dt:
            date_list.append(current_date.strftime("%Y-%m-%d"))
            current_date += timedelta(days=1)

        excluded_users = set(excluded_user_ids.split(",")) if excluded_user_ids else set()
        project_mappings = await ProjectMapping.find_all().to_list()

        query_params: dict = {"parsed_result.workload_summary.date": {"$in": date_list}}

        if excluded_users:
            query_params["user_id"] = {"$nin": list(excluded_users)}

        messages = await SlackMessage.find(query_params).sort(+SlackMessage.timestamp).to_list()

        if not messages:
            raise HTTPException(
                status_code=404, detail="No data found for the specified date range"
            )

        aggregated_data: dict = {}
        all_projects = set()

        for msg in messages:
            uid = msg.user_id
            user_name = msg.name
            parsed_result = msg.parsed_result or {}
            workload_summary = parsed_result.get("workload_summary", [])

            for summary in workload_summary:
                date = summary.get("date", "")
                original_project = summary.get("project_name", "")
                hours = summary.get("project_manhour", 0)

                if date not in date_list or not original_project or hours <= 0:
                    continue

                key = f"{date}-{uid}"
                if key not in aggregated_data:
                    aggregated_data[key] = {
                        "date": date,
                        "user_name": user_name,
                        "user_id": uid,
                        "project_hours": {},
                        "total_hours": 0,
                    }

                mapped_project = get_mapped_project_name(original_project, project_mappings)
                all_projects.add(mapped_project)

                if mapped_project not in aggregated_data[key]["project_hours"]:
                    aggregated_data[key]["project_hours"][mapped_project] = 0

                aggregated_data[key]["project_hours"][mapped_project] += hours
                aggregated_data[key]["total_hours"] += hours

        sorted_projects = sorted(all_projects)
        excel_data = []

        sorted_items = sorted(
            aggregated_data.items(), key=lambda x: (x[1]["date"], x[1]["user_name"])
        )
        for idx, (key, data) in enumerate(sorted_items, 1):
            row = {"No": idx, "Tanggal": data["date"], "Nama": data["user_name"]}
            for project in sorted_projects:
                phours = data["project_hours"].get(project, 0)
                ppercent = (phours / data["total_hours"] * 100) if data["total_hours"] > 0 else 0
                row[f"{project} Hour"] = round(phours, 1) if phours > 0 else 0
                row[f"{project} %"] = f"{ppercent:.1f}%" if phours > 0 else "0.0%"

            row["Total Hour"] = round(data["total_hours"], 1)
            excel_data.append(row)

        df = pd.DataFrame(excel_data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Workload Report")
            worksheet = writer.sheets["Workload Report"]
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
