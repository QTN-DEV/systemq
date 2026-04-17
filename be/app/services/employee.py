"""Employee service."""

from __future__ import annotations

from beanie.operators import In, Or

from app.core.security import hash_password
from app.models.enums import ALLOWED_DIVISIONS, ALLOWED_EMPLOYMENT_TYPES, ALLOWED_POSITIONS
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


def _coerce_position(value: object) -> str | None:
    """Return the position only if it is one of the allowed literals, else None."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text if text in ALLOWED_POSITIONS else None


def _coerce_division(value: object) -> str | None:
    """Return the division only if it is one of the allowed values, else None."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text if text in ALLOWED_DIVISIONS else None


def _placeholder_email(employee_id: str) -> str:
    """Build a deterministic placeholder email for employees created from the
    chart view that don't have an email yet. Uses example.com so it passes
    pydantic's EmailStr validation.
    """
    safe = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "-" for ch in employee_id)
    return f"pending-{safe}@placeholder.example.com"


async def save_chart(employees_payload: list[dict[str, object]]) -> dict[str, int]:
    """Persist a full chart snapshot into the ``users`` collection.

    Reconciliation rules:
      * If a payload employee matches an existing user by ``employee_id`` →
        update the editable fields and re-activate if needed.
      * If the payload introduces a brand new ``employee_id`` → insert a new
        user with a default password and (if blank) a placeholder email.
      * If an existing active user is missing from the payload → soft-delete
        by setting ``is_active = False`` and clearing their ``subordinates``.

    Returns a summary dict with counts.
    """

    stats = {"created": 0, "updated": 0, "deactivated": 0, "skipped": 0}

    # Snapshot of existing users keyed by employee_id for O(1) lookup.
    existing_users = await User.find_all().to_list()
    existing_by_id: dict[str, User] = {
        str(u.employee_id): u for u in existing_users if u.employee_id
    }

    payload_ids: set[str] = set()

    for raw in employees_payload:
        emp_id = str(raw.get("id") or "").strip()
        if not emp_id:
            stats["skipped"] += 1
            continue
        payload_ids.add(emp_id)

        name = str(raw.get("name") or "").strip() or "New Employee"
        title = raw.get("title") or None
        division = _coerce_division(raw.get("division"))
        position = _coerce_position(raw.get("position"))
        level = raw.get("level") or None
        subordinates = [str(s) for s in (raw.get("subordinates") or []) if s]
        projects = [str(p) for p in (raw.get("projects") or []) if p]
        avatar = raw.get("avatar") or None

        user = existing_by_id.get(emp_id)

        if user is not None:
            # --- Update path --------------------------------------------------
            user.name = name
            user.title = title if title is not None else user.title
            user.division = division if division is not None else user.division
            user.position = position if position is not None else user.position
            user.level = level if level is not None else user.level
            user.subordinates = subordinates
            user.projects = projects
            if avatar:
                # Avatar on the User model is HttpUrl | None; only overwrite
                # when we have a real value so we don't drop existing avatars
                # that weren't part of the chart payload.
                user.avatar = avatar  # type: ignore[assignment]
            if not user.is_active:
                user.is_active = True
            await user.touch()
            stats["updated"] += 1
            continue

        # --- Create path ------------------------------------------------------
        email_raw = str(raw.get("email") or "").strip().lower()
        email = email_raw or _placeholder_email(emp_id)

        # Make sure the email we pick doesn't collide with another user.
        conflict = await User.find_one(User.email == email)
        if conflict is not None:
            email = _placeholder_email(f"{emp_id}-{len(existing_by_id)}")

        new_user = User(
            employee_id=emp_id,
            name=name,
            email=email,
            title=title,
            division=division,
            level=level,
            position=position,
            subordinates=subordinates,
            projects=projects,
            avatar=avatar if avatar else None,  # type: ignore[arg-type]
            hashed_password=hash_password(DEFAULT_PASSWORD),
            is_active=True,
        )
        await new_user.insert()
        stats["created"] += 1

    # Soft-delete users that disappeared from the chart.
    for emp_id, user in existing_by_id.items():
        if emp_id in payload_ids:
            continue
        if not user.is_active:
            continue

        # Also prune the vanished id from every other user's subordinates.
        other_supervisors = await User.find(
            In(User.subordinates, [emp_id])
        ).to_list()
        for sup in other_supervisors:
            if emp_id in sup.subordinates:
                sup.subordinates.remove(emp_id)
                await sup.touch()

        user.subordinates = []
        user.is_active = False
        await user.touch()
        stats["deactivated"] += 1

    return stats
