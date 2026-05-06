from app.submodules.background_job import BaseJob

class SyncStandupsJob(BaseJob):
    name: str = "sync-standups-job"