from app.submodules.background_job import BaseProcessor
from ..jobs import SyncDailyStandupJob

# It is used to sync the daily standup from slack to the database
class SyncDailyStandupProcessor(BaseProcessor[SyncDailyStandupJob]):
    name = "sync-daily-standup"

    async def handle(self, job):
        await job.log("Starting sync daily standup")
        data = job.data
        await job.log(f"Sync daily standup data: {data}")
        await job.log("Sync daily standup completed")
        return {"status": "success", "processed_id": data.get("id")}