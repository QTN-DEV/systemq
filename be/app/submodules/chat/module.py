from app.core import BaseModule
from .router import router

class ChatModule(BaseModule):
    def setup_routes(self) -> None:
        self.app.include_router(router, prefix=self.prefix, tags=["Chat"])