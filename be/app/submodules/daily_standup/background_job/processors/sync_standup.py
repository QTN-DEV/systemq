from app.submodules.background_job import BaseProcessor

class SyncStandupProcessor(BaseProcessor):
    name = "sync-daily-standup"

    async def handle(self, job):
        data = job.data
        return {"status": "success", "processed_id": data.get("id")}