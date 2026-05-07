from app.submodules.background_job import BaseQueue
from ..jobs import SyncDailyStandupJob

class DailyStandupQueue(BaseQueue[SyncDailyStandupJob]):
    def __init__(self):
        super().__init__("daily-standup-queue")