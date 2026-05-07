import logging
import time
from typing import Any, Dict, Optional, Generic, TypeVar, TypedDict, Union
from bullmq import Queue, Job
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

T = TypeVar('T', bound=Any)

class BackoffOptions(TypedDict, total=False):
    type: str
    delay: int

class KeepJobs(TypedDict, total=False):
    age: int
    count: int

class RepeatOptions(TypedDict, total=False):
    pattern: str
    every: int
    jobId: str
    limit: int

class JobOptions(TypedDict, total=False):
    backoff: Union[int, BackoffOptions]
    jobId: str
    timestamp: int
    delay: int
    attempts: int
    removeOnComplete: Union[bool, int, KeepJobs]
    removeOnFail: Union[bool, int, KeepJobs]
    stackTraceLimit: int
    repeat: RepeatOptions
    priority: int

class BaseQueue(Generic[T]):
    _global_redis: Optional[str] = None
    _instances: Dict[str, Queue] = {}
    _scheduler = AsyncIOScheduler()

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
        if not cls._scheduler.running:
            cls._scheduler.start()
    
    async def add(self, job_model: T, opts: Optional[JobOptions] = None) -> Optional[Job]:
        data = job_model.model_dump(mode="json") if hasattr(job_model, "model_dump") else job_model
        job_name = data.get("name")
        
        if not job_name:
            raise ValueError("Job data must contain a 'name' key.")

        if opts and "repeat" in opts:
            repeat = opts["repeat"]
            job_id = repeat.get("jobId") or opts.get("jobId") or f"{self.name}_{job_name}"
            
            if "pattern" in repeat:
                trigger = CronTrigger.from_crontab(repeat["pattern"])
            elif "every" in repeat:
                trigger = IntervalTrigger(seconds=repeat["every"] / 1000)
            else:
                raise ValueError("Repeat option must contain 'pattern' or 'every'.")

            clean_opts = opts.copy()
            clean_opts.pop("repeat", None)

            self._scheduler.add_job(
                self._execute_scheduled_job,
                trigger=trigger,
                id=job_id,
                replace_existing=True,
                args=[job_name, data, clean_opts]
            )
            return None

        return await self.instance.add(job_name, data, opts)

    async def _execute_scheduled_job(self, job_name: str, data: dict, opts: dict):
        logger = logging.getLogger("apscheduler")
        try:
            base_id = opts.get("jobId", job_name)
            unique_id = f"{base_id}-{int(time.time())}"
            
            exec_opts = opts.copy()
            exec_opts["jobId"] = unique_id
            
            logger.info(f"🚀 Pushing unique job instance: {unique_id}")
            await self.instance.add(job_name, data, exec_opts)
            
        except Exception as e:
            logger.error(f"❌ Failed to push scheduled job: {e}")