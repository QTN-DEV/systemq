import hashlib

from .documents import SessionToken


class SessionService:
    async def token_for_session(self, token: str) -> SessionToken | None:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        print(f"{SessionToken.__name__} token_for_session: {token_hash}")
        session = await SessionToken.find_one(SessionToken.token_hash == token_hash)

        if session is None or session.revoked or session.is_expired:
            return None
        
        return session