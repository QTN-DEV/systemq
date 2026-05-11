
from pydantic import BaseModel


class AuthUserProfile(BaseModel):
    id: str
    name: str
    permissions: list[str]
    email: str
    employee_id: str | None = None