from typing import Optional
from datetime import date
from app.submodules.background_job import BaseJob

class SyncDailyStandupJob(BaseJob):
    name: str = "sync-standups-job"
    start_date: date
    end_date: date