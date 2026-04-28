from beanie import PydanticObjectId
from .documents import User

class UserService:
    def __init__(self):
        pass

    async def get_user_by_id(self, user_id: str) -> User | None:
        return await User.get(PydanticObjectId(user_id))