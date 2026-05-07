from abc import ABC, abstractmethod
from fastapi import FastAPI

class BaseModule(ABC):
    def __init__(self, app: FastAPI, prefix: str = ""):
        self.app = app
        self.prefix = prefix
        self.setup_routes()
        self.setup_lifecycle()

    @abstractmethod
    def setup_routes(self) -> None:
        pass

    def setup_lifecycle(self) -> None:
        pass

    async def on_startup(self) -> None:
        pass

    async def on_shutdown(self) -> None:
        pass