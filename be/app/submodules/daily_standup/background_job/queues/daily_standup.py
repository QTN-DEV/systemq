from app.submodules.background_job import BaseQueue
from ..jobs import SyncStandupsJob

class DailyStandupQueue(BaseQueue[SyncStandupsJob]):
    def __init__(self):
        super().__init__("daily-standup-tasks-queue")