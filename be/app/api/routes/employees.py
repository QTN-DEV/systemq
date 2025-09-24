"""Employee routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas import MessageResponse
from app.schemas.employee import Employee, EmployeeCreate
from app.services import employee as employee_service
from app.services.employee import (
    EmployeeAlreadyExistsError,
    EmployeeEmailError,
    EmployeeNotFoundError,
)

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get(
    "/",
    response_model=list[Employee],
    summary="List employees",
    response_description="Active employees matching the optional search criteria.",
)
async def list_employees(
    search: Query(
        description="Filter by id, name, title, or email.",
    ),
) -> list[Employee]:
    """Return active employees, optionally filtered by a search string."""
    employees = await employee_service.list_employees(search)
    return [Employee.model_validate(employee) for employee in employees]


@router.get(
    "/{employee_id}",
    response_model=Employee,
    summary="Retrieve an employee",
    response_description="Full employee profile for the given identifier.",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Employee not found."},
    },
)
async def get_employee(employee_id: str) -> Employee:
    """Fetch a single employee by identifier."""
    try:
        employee = await employee_service.get_employee(employee_id)
    except EmployeeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Employee.model_validate(employee)


@router.get(
    "/{employee_id}/subordinates",
    response_model=list[Employee],
    summary="List employee subordinates",
    response_description="Active subordinates assigned to the employee.",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Employee not found."},
    },
)
async def get_subordinates(employee_id: str) -> list[Employee]:
    """Return the active subordinates for the specified employee."""
    try:
        employees = await employee_service.get_subordinates(employee_id)
    except EmployeeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return [Employee.model_validate(employee) for employee in employees]


@router.post(
    "/",
    response_model=Employee,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employee",
    response_description="Freshly created employee profile.",
    responses={
        status.HTTP_409_CONFLICT: {
            "description": "Employee with given id or email already exists.",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Failed to dispatch the invitation email.",
        },
    },
)
async def create_employee(payload: EmployeeCreate) -> Employee:
    """Create a new employee, provision a temporary password, and send an invitation email."""
    try:
        employee = await employee_service.create_employee(payload.model_dump())
    except EmployeeAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except EmployeeEmailError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    return Employee.model_validate(employee)


@router.post(
    "/{employee_id}/deactivate",
    response_model=MessageResponse,
    summary="Deactivate an employee",
    response_description="Confirmation that the employee was deactivated.",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Employee not found."},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Failed to send deactivation notice.",
        },
    },
)
async def deactivate_employee(employee_id: str) -> MessageResponse:
    """Disable an employee and send a deactivation notice."""
    try:
        await employee_service.deactivate_employee(employee_id)
    except EmployeeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except EmployeeEmailError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    return MessageResponse(message="Employee deactivated successfully.")
