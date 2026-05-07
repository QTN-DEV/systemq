from datetime import date
from app.core.module import BaseModule
from .background_job.queues import DailyStandupQueue
from .background_job.jobs import SyncDailyStandupJob
from fastapi import FastAPI


class DailyStandupModule(BaseModule):
    def __init__(self, app: FastAPI, prefix: str = ""):
        super().__init__(app, prefix)

    def setup_routes(self) -> None:
        pass

    async def on_startup(self) -> None:
        queue = DailyStandupQueue()
        
        job_payload = SyncDailyStandupJob(
            name="sync-daily-standup",
            start_date=date.today(), 
            end_date=date.today()
        )

        try:
            job = await queue.add(
                job_payload, 
                opts={
                    "repeat": {
                        "pattern": "*/1 * * * *",
                        "jobId": "sync-daily-standup"
                    },
                    "jobId": "sync-daily-standup",
                }
            )
            print("🚀 Daily Standup Job scheduled for every 5 minutes ")
        except Exception as e:
            print(f"❌ Failed to schedule Daily Standup Job: {e}")