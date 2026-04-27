from typing import Annotated
from fastapi import Depends

from .service import SessionService


UseSessionService = Annotated[SessionService, Depends()]