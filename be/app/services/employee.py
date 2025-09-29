"""Employee service."""

from __future__ import annotations

from beanie.operators import In, Or
from beanie import PydanticObjectId
from bson import ObjectId

from app.core.security import generate_random_password, hash_password
from app.models.enums import ALLOWED_EMPLOYMENT_TYPES, ALLOWED_POSITIONS, ALLOWED_DIVISIONS
from app.models.user import User
from app.services.email import EmailConfigurationError, send_email
from constants import APP_NAME, DEFAULT_PASSWORD


class EmployeeAlreadyExistsError(ValueError):
    pass


class EmployeeNotFoundError(ValueError):
    pass


class EmployeeEmailError(RuntimeError):
    pass


def _serialize(user: User) -> dict[str, object]:
    return {
        "id": user.employee_id or str(user.id),
        "name": user.name,
        "email": user.email,
        "title": user.title,
        "division": user.division,
        "level": user.level,
        "position": user.position,
        "subordinates": user.subordinates,
        "projects": user.projects,
        "avatar": user.avatar,
        "employment_type": user.employment_type,
    }


async def list_employees_nonactive(search: str | None = None) -> list[dict[str, object]]:
    users = [user for user in await User.find_all().to_list() if not user.is_active]
    if not search:
        return [_serialize(user) for user in users]

    needle = search.strip().lower()
    filtered: list[dict[str, object]] = []
    for user in users:
        haystack = [
            user.name,
            user.email,
            user.title or "",
            user.employee_id or "",
        ]
        if any(needle in value.lower() for value in haystack):
            filtered.append(_serialize(user))
    return filtered


async def list_employees(search: str | None = None) -> list[dict[str, object]]:
    users = [user for user in await User.find_all().to_list() if user.is_active]
    if not search:
        return [_serialize(user) for user in users]

    needle = search.strip().lower()
    filtered: list[dict[str, object]] = []
    for user in users:
        haystack = [
            user.name,
            user.email,
            user.title or "",
            user.employee_id or "",
        ]
        if any(needle in value.lower() for value in haystack):
            filtered.append(_serialize(user))
    return filtered


async def search_employees(query: str) -> list[dict[str, object]]:
    """Search active employees by name, email, division, or employee ID."""
    users = [user for user in await User.find_all().to_list() if user.is_active]
    
    if not query or not query.strip():
        return [_serialize(user) for user in users]
    
    needle = query.strip().lower()
    filtered: list[dict[str, object]] = []
    
    for user in users:
        haystack = [
            user.name,
            user.email,
            user.employee_id or "",
            user.title or "",
            user.division or "",
            user.level or "",
            user.position or "",
        ]
        
        # Check if query matches any field
        if any(needle in value.lower() for value in haystack if value):
            filtered.append(_serialize(user))
    
    return filtered


async def get_employee(employee_id: str) -> dict[str, object]:
    user = await User.find_one(User.employee_id == employee_id)
    if user is None:
        raise EmployeeNotFoundError(f"Employee '{employee_id}' not found")
    return _serialize(user)


async def get_subordinates(employee_id: str) -> list[dict[str, object]]:
    user = await User.find_one(User.employee_id == employee_id)
    if user is None:
        raise EmployeeNotFoundError(f"Employee '{employee_id}' not found")

    subordinate_ids = user.subordinates
    if not subordinate_ids:
        return []

    subordinates = await User.find(In(User.employee_id, subordinate_ids)).to_list()
    return [_serialize(subordinate) for subordinate in subordinates if subordinate.is_active]


async def _send_invitation_email(user: User, password: str) -> None:
    subject = f"{APP_NAME} account invitation"
    body = (
        f"Hello {user.name},\n\n"
        f"An account has been created for you on {APP_NAME}.\n"
        f"Email: {user.email}\nPassword: {password}\n\n"
        "Please log in and change your password after signing in."
    )
    await send_email(subject=subject, recipient=user.email, body=body)


async def _send_deactivation_email(user: User) -> None:
    subject = f"{APP_NAME} account deactivated"
    body = (
        f"Hello {user.name},\n\n"
        "Your access to the platform has been deactivated. If this is unexpected, "
        "please contact the system administrator for assistance."
    )
    await send_email(subject=subject, recipient=user.email, body=body)


async def create_employee(payload: dict[str, object]) -> dict[str, object]:
    employee_id = str(payload.get("id", "")).strip()
    if not employee_id:
        raise ValueError("Employee identifier is required")

    email = str(payload.get("email", "")).strip().lower()
    if not email:
        raise ValueError("Employee email is required")

    existing = await User.find_one(
        Or(User.employee_id == employee_id, User.email == email),
    )
    if existing is not None:
        raise EmployeeAlreadyExistsError("Employee with given id or email already exists")

    password = DEFAULT_PASSWORD
    hashed_password = hash_password(password)

    position = payload.get("position")
    if position is not None and position not in ALLOWED_POSITIONS:
        raise ValueError("Position must be one of the supported values")

    division = payload.get("division")
    print("MASUK DIVISION")
    if division is not None and division not in ALLOWED_DIVISIONS:
        print("MASUK GAGAL DIVISION")
        raise ValueError("Division must be one of the supported values")    

    employment_type = str(payload.get("employment_type", "full-time"))
    if employment_type not in ALLOWED_EMPLOYMENT_TYPES:
        raise ValueError("Employment type must be one of the supported values")

    user = User(
        employee_id=employee_id,
        name=str(payload.get("name", "")).strip(),
        email=email,
        title=payload.get("title"),
        division=payload.get("division"),
        level=payload.get("level"),
        position=position,
        subordinates=list(payload.get("subordinates", []) or []),
        projects=list(payload.get("projects", []) or []),
        avatar=payload.get("avatar"),
        employment_type=employment_type,
        hashed_password=hashed_password,
        is_active=True,
    )
    await user.insert()

    try:
        print("SEND_INVITATION_EMAIL STILL DOESN'T WORK")
        # await _send_invitation_email(user, password)
    except (EmailConfigurationError, Exception) as exc:
        await user.delete()
        raise EmployeeEmailError(str(exc)) from exc

    return _serialize(user)


async def deactivate_employee(employee_id: str) -> dict[str, object]:
    user = await User.find_one(User.employee_id == employee_id)
    if user is None:
        raise EmployeeNotFoundError(f"Employee '{employee_id}' not found")
    if not user.is_active:
        return _serialize(user)

    # Clear subordinates list of the deactivated employee
    user.subordinates = []

    # Find all employees who have this employee as a subordinate and remove it
    employees_with_subordinate = await User.find(
        In(User.subordinates, [employee_id])
    ).to_list()
    
    for emp in employees_with_subordinate:
        if employee_id in emp.subordinates:
            emp.subordinates.remove(employee_id)
            await emp.touch()

    user.is_active = False
    await user.touch()

    try:
        print("SEND DEACTIVATE EMAIL MASIH GAK JALAN")
        # await _send_deactivation_email(user)
    except (EmailConfigurationError, Exception) as exc:
        raise EmployeeEmailError(str(exc)) from exc

    return _serialize(user)


async def activate_employee(employee_id: str) -> dict[str, object]:
    user = await User.find_one(User.employee_id == employee_id)
    if user is None:
        raise EmployeeNotFoundError(f"Employee '{employee_id}' not found")
    if user.is_active:
        return _serialize(user)

    user.is_active = True
    await user.touch()

    return _serialize(user)


async def update_employee(employee_id: str, payload: dict[str, object]) -> dict[str, object]:
    user = await User.find_one(User.employee_id == employee_id)
    if user is None:
        raise EmployeeNotFoundError(f"Employee '{employee_id}' not found")

    data = dict(payload)

    # Email: normalize and enforce uniqueness
    if "email" in data and data["email"]:
        new_email = str(data["email"]).strip().lower()
        if new_email != user.email:
            existing = await User.find_one(User.email == new_email)
            if existing is not None and str(existing.id) != str(user.id):
                raise EmployeeAlreadyExistsError("Employee with given email already exists")
            user.email = new_email
        data.pop("email", None)

    # Employment type: validate allowed values
    if "employment_type" in data and data["employment_type"] is not None:
        employment_type = str(data["employment_type"])
        if employment_type not in ALLOWED_EMPLOYMENT_TYPES:
            raise ValueError("Employment type must be one of the supported values")
        user.employment_type = employment_type
        data.pop("employment_type", None)

    # Apply remaining simple fields succinctly; skip None values
    for field, value in data.items():
        if value is None:
            continue
        setattr(user, field, value)

    await user.touch()
    return _serialize(user)
