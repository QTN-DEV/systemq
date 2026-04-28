from dataclasses import dataclass
from typing import Optional, TypedDict

@dataclass(frozen=True)
class RequestContextUser:
    id: str
    name: str
    permissions: list[str]

@dataclass(frozen=True)
class RequestContext:
    request_id: str