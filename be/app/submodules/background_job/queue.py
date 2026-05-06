import logging
from typing import Any, Dict, Optional, Generic, TypeVar, Union
from bullmq import Queue, Job
from .job import BaseJob

logger = logging.getLogger("bullmq_base")
T = TypeVar('T', bound=Dict[str, Any])

class BaseQueue(Generic[T]):
    _global_redis: Optional[str] = None
    _instances: Dict[str, Queue] = {}

    def __init__(self, name: str):
        self.name = name
        if not BaseQueue._global_redis:
            raise RuntimeError("Redis connection not registered. Call BaseQueue.register(url) first.")

        if name in BaseQueue._instances:
            self.instance = BaseQueue._instances[name]
        else:
            self.instance = Queue(name, {"connection": BaseQueue._global_redis})
            BaseQueue._instances[name] = self.instance

    @classmethod
    def register(cls, redis_url: str):
        cls._global_redis = redis_url

    async def add(self, data: T, opts: Optional[Dict[str, Any]] = None) -> Job:
        job_name = data.get("name")
        if not job_name:
            raise ValueError("Job data must contain a 'name' key.")
        return await self.instance.add(job_name, data, opts)