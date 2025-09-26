"""Employee routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas import MessageResponse
from app.schemas.employee import Employee, EmployeeCreate, EmployeeUpdate
from app.services import employee as employee_service
from app.services.employee import (
    EmployeeAlreadyExistsError,
    EmployeeEmailError,
    EmployeeNotFoundError,
)

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get(
    "/inactive",
    response_model=list[Employee],
    summary="List inactive employees",
    response_description="Inactive employees matching the optional search criteria.",
)
async def list_employees(
    search: str | None = Query(None),
) -> list[Employee]:
    """Return inactive employees, optionally filtered by a search string."""
    employees = await employee_service.list_employees_nonactive(search)
    return [Employee.model_validate(employee) for employee in employees]

@router.get(
    "/",
    response_model=list[Employee],
    summary="List employees",
    response_description="Active employees matching the optional search criteria.",
)
async def list_employees(
    search: str | None = Query(None),
) -> list[Employee]:
    """Return active employees, optionally filtered by a search string."""
    employees = await employee_service.list_employees(search)
    return [Employee.model_validate(employee) for employee in employees]


@router.get(
    "/{employee_id}",
    response_model=Employee,
    summary="Retrieve an employee",
    response_description="Full employee profile for the given identifier.",
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
)
async def create_employee(payload: EmployeeCreate) -> Employee:
    """Create a new employee, provision a temporary password, and send an invitation email."""
    print("masuk")
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


@router.post(
    "/{employee_id}/activate",
    response_model=MessageResponse,
    summary="Activate an employee",
    response_description="Confirmation that the employee was activated.",
)
async def activate_employee(employee_id: str) -> MessageResponse:
    """Enable an employee by setting is_active to true."""
    try:
        await employee_service.activate_employee(employee_id)
    except EmployeeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return MessageResponse(message="Employee activated successfully.")


@router.put(
    "/{employee_id}",
    response_model=Employee,
    summary="Update an employee",
    response_description="Updated employee profile.",
)
async def update_employee(employee_id: str, payload: EmployeeUpdate) -> Employee:
    """Update basic employee fields by employee_id."""
    try:
        employee = await employee_service.update_employee(
            employee_id,
            payload.model_dump(exclude_unset=True),
        )
    except EmployeeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except EmployeeAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return Employee.model_validate(employee)
