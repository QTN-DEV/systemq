from app.submodules.session import UseSessionService
from app.submodules.user import UseUserService, User

class AuthService:
    def __init__(self, session_service: UseSessionService, user_service: UseUserService):
        self.session_service = session_service
        self.user_service = user_service

    async def user_for_token(self, token: str | None) -> User | None:
        if token is None:
            return None
        
        session = await self.session_service.token_for_session(token)
        
        if session is None:
            return None
        
        return await self.user_service.get_user_by_id(str(session.user_id))
