"""Employee service."""

from __future__ import annotations

from beanie.operators import In, Or

from app.core.security import generate_random_password, hash_password
from app.models.enums import ALLOWED_EMPLOYMENT_TYPES, ALLOWED_POSITIONS
from app.models.user import User
from app.services.email import EmailConfigurationError, send_email
from constants import APP_NAME


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

    password = generate_random_password()
    hashed_password = hash_password(password)

    position = payload.get("position")
    if position is not None and position not in ALLOWED_POSITIONS:
        raise ValueError("Position must be one of the supported values")

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
        await _send_invitation_email(user, password)
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

    user.is_active = False
    await user.touch()

    try:
        await _send_deactivation_email(user)
    except (EmailConfigurationError, Exception) as exc:
        raise EmployeeEmailError(str(exc)) from exc

    return _serialize(user)
