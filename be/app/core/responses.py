from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")

class ResponseEnvelope(BaseModel, Generic[T]):
    success: bool
    result: Optional[T] = None
    message: Optional[str] = None
    meta: Optional[dict] = None