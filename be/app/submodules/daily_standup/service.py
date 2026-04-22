import logging
from app.submodules.daily_standup.repository import DailyStandupRepository
from app.submodules.daily_standup.schemas import PaginatedStandUpEntries, SearchStandUpEntryOptions


logger = logging.getLogger("daily-standup-service")

class DailyStandupServiceError(RuntimeError):
    pass


class DailyStandupService:
    def __init__(self, repository: DailyStandupRepository):
        self.repository = repository

    async def search(self, options: SearchStandUpEntryOptions) -> PaginatedStandUpEntries:
        try:
            logger.info(f"Searching daily standups with options: {options}")
            return await self.repository.search(options)
        except Exception as exc:
            logger.error(f"Failed to search daily standups: {exc}")
            raise DailyStandupServiceError("Failed to search daily standups") from exc
