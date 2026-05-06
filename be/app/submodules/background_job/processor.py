from typing import Any, Generic, TypeVar
from bullmq import Job
from .job import BaseJob

T = TypeVar('T', bound=BaseJob)

class BaseProcessor(Generic[T]):
    @property
    def name(self) -> str:
        raise NotImplementedError

    async def handle(self, job: Job) -> Any:
        raise NotImplementedError