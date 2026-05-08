import logging
import time
from typing import Any, Dict, Optional, Generic, TypeVar, TypedDict, Union
from bullmq import Queue, Job
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.redis import RedisJobStore
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=Any)


# ─── TypedDicts ───────────────────────────────────────────────────────────────

class BackoffOptions(TypedDict, total=False):
    type: str
    delay: int

class KeepJobs(TypedDict, total=False):
    age: int
    count: int

class RepeatOptions(TypedDict, total=False):
    pattern: str    # cron string e.g. "0 9 * * 1"
    every: int      # interval in ms e.g. 10000 = 10s
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


# ─── Standalone scheduled job executor (module-level for pickle safety) ───────

async def _execute_scheduled_job_standalone(
    redis_url: str,
    queue_name: str,
    job_name: str,
    data: dict,
    opts: dict,
    lock_key_suffix: str,
    lock_ttl: int,
):
    """
    Must be a module-level function — APScheduler pickles the function
    reference + args for RedisJobStore persistence. Instance methods
    drag in `self` which pulls unpicklable objects (aioredis client,
    parser lambdas). Here we only pass plain primitives and reconstruct
    what we need inside.
    """
    import redis.asyncio as aioredis
    from bullmq import Queue as BullQueue

    r = aioredis.from_url(redis_url, decode_responses=True)
    queue = BullQueue(queue_name, {"connection": redis_url})
    lock_key = f"bullmq:scheduler:lock:{lock_key_suffix}"

    try:
        acquired = await r.set(lock_key, "1", nx=True, ex=lock_ttl)
        if not acquired:
            logger.debug(f"Lock held by another pod, skipping: {lock_key_suffix}")
            return

        unique_id = f"{opts.get('jobId', job_name)}-{int(time.time())}"
        exec_opts = {**opts, "jobId": unique_id}
        await queue.add(job_name, data, exec_opts)
        logger.info(f"Pushed scheduled job: {unique_id}")

    except Exception as e:
        logger.error(f"Failed to push scheduled job '{job_name}': {e}", exc_info=True)

    finally:
        await r.aclose()
        await queue.close()


# ─── BaseQueue ────────────────────────────────────────────────────────────────

class BaseQueue(Generic[T]):
    _global_redis: Optional[str] = None
    _instances: Dict[str, Queue] = {}
    _scheduler: Optional[AsyncIOScheduler] = None

    def __init__(self, name: str):
        self.name = name
        if not BaseQueue._global_redis:
            raise RuntimeError("Redis not registered. Call BaseQueue.register(url) first.")

        if name not in BaseQueue._instances:
            BaseQueue._instances[name] = Queue(name, {"connection": BaseQueue._global_redis})

        self.instance = BaseQueue._instances[name]

    @classmethod
    def register(cls, redis_url: str):
        """
        Call once at app startup before any queue is instantiated.
        Sets up persistent RedisJobStore so schedules survive pod restarts.
        """
        cls._global_redis = redis_url

        if cls._scheduler is None:
            parsed = urlparse(redis_url)
            jobstores = {
                "default": RedisJobStore(
                    host=parsed.hostname or "localhost",
                    port=parsed.port or 6379,
                    password=parsed.password or None,
                    db=int(parsed.path.lstrip("/") or 0),
                    jobs_key="apscheduler:jobs",
                    run_times_key="apscheduler:run_times",
                )
            }
            cls._scheduler = AsyncIOScheduler(jobstores=jobstores)

        if not cls._scheduler.running:
            cls._scheduler.start()
            logger.info("APScheduler started with RedisJobStore.")

    @classmethod
    def shutdown(cls):
        """Call on app teardown to gracefully stop the scheduler."""
        if cls._scheduler and cls._scheduler.running:
            cls._scheduler.shutdown(wait=False)
            logger.info("APScheduler shut down.")

    # ─── Public API ───────────────────────────────────────────────────────────

    async def add(self, job_model: T, opts: Optional[JobOptions] = None) -> Optional[Job]:
        data = job_model.model_dump(mode="json") if hasattr(job_model, "model_dump") else job_model
        job_name = data.get("name")

        if not job_name:
            raise ValueError("Job data must contain a 'name' key.")

        if opts and "repeat" in opts:
            return await self._register_repeatable(job_name, data, opts)

        return await self.instance.add(job_name, data, opts)

    # ─── Internals ────────────────────────────────────────────────────────────

    async def _register_repeatable(
        self,
        job_name: str,
        data: dict,
        opts: JobOptions,
    ) -> None:
        if BaseQueue._scheduler is None:
            raise RuntimeError("Scheduler not initialized. Call BaseQueue.register(url) first.")

        repeat: RepeatOptions = opts["repeat"]
        job_id = repeat.get("jobId") or opts.get("jobId") or f"{self.name}:{job_name}"
        lock_ttl = self._lock_ttl(repeat)
        clean_opts = {k: v for k, v in opts.items() if k != "repeat"}

        if "pattern" in repeat:
            trigger = CronTrigger.from_crontab(repeat["pattern"])
        elif "every" in repeat:
            trigger = IntervalTrigger(seconds=repeat["every"] / 1000)
        else:
            raise ValueError("RepeatOptions must contain 'pattern' (cron) or 'every' (ms).")

        BaseQueue._scheduler.add_job(
            _execute_scheduled_job_standalone,  # module-level — picklable
            trigger=trigger,
            id=job_id,
            replace_existing=True,
            args=[
                BaseQueue._global_redis,  # plain string — picklable
                self.name,
                job_name,
                data,
                clean_opts,
                job_id,
                lock_ttl,
            ],
        )

        logger.info(f"Registered repeatable job '{job_id}' on queue '{self.name}'.")
        return None

    @staticmethod
    def _lock_ttl(repeat: RepeatOptions) -> int:
        """
        TTL must expire before the next tick so the lock doesn't
        permanently block. Cron minimum granularity = 1 min → 55s default.
        """
        if "every" in repeat:
            interval_seconds = repeat["every"] / 1000
            return max(int(interval_seconds * 0.8), 5)
        return 55