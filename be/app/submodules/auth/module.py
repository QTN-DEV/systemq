from app.core.module import BaseModule

from .router import router

class AuthModule(BaseModule):
    def setup_routes(self) -> None:
        self.app.include_router(router, prefix=self.prefix, tags=["Auth V2"])