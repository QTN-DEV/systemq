from dataclasses import dataclass
from fastapi import Depends, HTTPException, Request
from typing import Annotated
import uuid

from app.core import RequestContext, RequestContextUser

from .service import AuthService

@dataclass(frozen=True)
class AuthContext(RequestContext):
    user: RequestContextUser

async def get_auth_context(request: Request, auth_service: Annotated[AuthService, Depends()]) -> AuthContext:
    token = request.headers.get("Authorization")

    user = await auth_service.user_for_token(token.split(" ")[1] if token else None)

    if user is None:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    permissions: list[str] = []

    if user.position == "Internal Ops":
        permissions.append("read:all")
        permissions.append("write:all")
        permissions.append("read:employees")
        permissions.append("write:employees")
    
    return AuthContext(
        request_id=request.headers.get("X-Request-ID", str(uuid.uuid4())),
        user=RequestContextUser(id=str(user.id), name=user.name, email=user.email, permissions=permissions, employee_id=user.employee_id)
    )

UseAuthService = Annotated[AuthService, Depends()]
UseAuthContext = Annotated[AuthContext, Depends(get_auth_context)]

