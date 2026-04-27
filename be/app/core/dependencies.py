from typing import Annotated
import uuid

from fastapi import Depends, Request

from .request_context import RequestContext

async def get_request_context(request: Request) -> RequestContext:
    return RequestContext(
        request_id=request.headers.get("X-Request-ID", str(uuid.uuid4()))
    )

UseRequestContext = Annotated[RequestContext, Depends(get_request_context)]
