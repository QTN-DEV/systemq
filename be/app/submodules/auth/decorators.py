import inspect
from functools import wraps
from typing import Callable, Any, Literal
from fastapi import HTTPException, status

from app.submodules.auth.dependencies import AuthContext

PermissionLiteral = Literal["write:all", "read:all", "read:employees", "write:employees"]

def allow(required_permissions: list[PermissionLiteral]) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            auth_context: AuthContext | None = next(
                (arg for arg in kwargs.values() if isinstance(arg, AuthContext)), 
                None
            )

            if not auth_context:
                raise RuntimeError(
                    f"Route '{func.__name__}' is protected by @allow "
                    "but is missing the AuthContext dependency."
                )

            user_permissions = getattr(auth_context.user, "permissions", [])
            missing_permissions = [
                perm for perm in required_permissions 
                if perm not in user_permissions
            ]

            if missing_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Forbidden: Missing permissions {missing_permissions}"
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator