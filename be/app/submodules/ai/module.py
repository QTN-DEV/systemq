from app.core import BaseModule

from .router import router

class AIModule(BaseModule):
    def setup_routes(self) -> None:
        self.app.include_router(router, prefix=self.prefix, tags=["AI"])

    def setup_lifecycle(self) -> None:
        pass