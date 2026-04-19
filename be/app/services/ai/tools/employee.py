import json
from claude_agent_sdk import tool, create_sdk_mcp_server
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, Dict, Any

from app.services.employee import (
    search_employees,
    list_employees,
    create_employee,
    update_employee,
    deactivate_employee
)

class EmployeeSearchArgs(BaseModel):
    query: str = Field(description="Search active employees by name, email, division, or employee ID. Pass an empty string to get all active employees.")

class ListEmployeesArgs(BaseModel):
    search: Optional[str] = Field(default=None, description="Optional search term to filter employees by name, email, title, or ID")

class CreateEmployeeArgs(BaseModel):
    payload: Dict[str, Any] = Field(description="Dictionary containing employee details (e.g. name, email, division, position, level, title)")

class UpdateEmployeeArgs(BaseModel):
    employee_id: str = Field(description="The ID of the employee to update")
    payload: Dict[str, Any] = Field(description="Dictionary containing fields to update")

class DeactivateEmployeeArgs(BaseModel):
    employee_id: str = Field(description="The ID of the employee to deactivate")

def format_error(e: Exception) -> dict:
    return {
        "is_error": True,
        "content": [{"type": "text", "text": f"Error: {str(e)}"}]
    }

def format_success(result: Any) -> dict:
    return {
        "content": [{"type": "text", "text": str(result)}]
    }

@tool(
    name="search_employees",
    description="Search for employees in the company directory",
    input_schema=EmployeeSearchArgs.model_json_schema()
)
async def search_employees_tool(args: dict) -> dict:
    try:
        validated = EmployeeSearchArgs(**args)
        results = await search_employees(validated.query)
        return format_success(results)
    except Exception as e:
        return format_error(e)

@tool(
    name="list_employees",
    description="List active employees, optionally filtered by a search term",
    input_schema=ListEmployeesArgs.model_json_schema()
)
async def list_employees_tool(args: dict) -> dict:
    try:
        validated = ListEmployeesArgs(**args)
        results = await list_employees(validated.search)
        return format_success(results)
    except Exception as e:
        return format_error(e)

@tool(
    name="create_employee",
    description="Create a new employee in the directory",
    input_schema=CreateEmployeeArgs.model_json_schema()
)
async def create_employee_tool(args: dict) -> dict:
    try:
        validated = CreateEmployeeArgs(**args)
        result = await create_employee(validated.payload)
        return format_success(result)
    except Exception as e:
        return format_error(e)

@tool(
    name="update_employee",
    description="Update an existing employee's details",
    input_schema=UpdateEmployeeArgs.model_json_schema()
)
async def update_employee_tool(args: dict) -> dict:
    try:
        validated = UpdateEmployeeArgs(**args)
        result = await update_employee(validated.employee_id, validated.payload)
        return format_success(result)
    except Exception as e:
        return format_error(e)

@tool(
    name="deactivate_employee",
    description="Deactivate an employee from the directory",
    input_schema=DeactivateEmployeeArgs.model_json_schema()
)
async def deactivate_employee_tool(args: dict) -> dict:
    try:
        validated = DeactivateEmployeeArgs(**args)
        result = await deactivate_employee(validated.employee_id)
        return format_success(result)
    except Exception as e:
        return format_error(e)

employee_tools_server = create_sdk_mcp_server(
    name="employee-service",
    tools=[
        search_employees_tool,
        list_employees_tool,
        create_employee_tool,
        update_employee_tool,
        deactivate_employee_tool
    ]
)