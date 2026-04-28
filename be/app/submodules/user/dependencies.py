from typing import Annotated
from fastapi import Depends

from .service import UserService


UseUserService = Annotated[UserService, Depends()]