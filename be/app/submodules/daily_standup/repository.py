"""Repository abstraction for querying standups from `slack_messages`."""

from __future__ import annotations

import logging
import re
from datetime import UTC, datetime, time
from typing import Any, Protocol, runtime_checkable

from .models import StandupEntry
from .schemas import PaginatedStandUpEntries, SearchStandUpEntryOptions

logger = logging.getLogger("daily-standup-repository")

@runtime_checkable
class DailyStandupRepository(Protocol):
    async def search(
        self,
        options: SearchStandUpEntryOptions,
    ) -> PaginatedStandUpEntries: ...


class BeanieDailyStandupRepository:
    async def search(
        self,
        options: SearchStandUpEntryOptions,
    ) -> PaginatedStandUpEntries:

        mongo_query: dict[str, Any] = {}
        and_filters: list[dict[str, Any]] = []

        if options.content:
            and_filters.append(
                {
                    "content": {
                        "$regex": re.escape(options.content.strip()),
                        "$options": "i",
                    }
                }
            )

        if options.start_date or options.end_date:
            ts_query: dict[str, Any] = {}
            if options.start_date:
                start_dt = datetime.combine(options.start_date, time.min, tzinfo=UTC)
                ts_query["$gte"] = int(start_dt.timestamp())
            if options.end_date:
                end_dt = datetime.combine(options.end_date, time.max, tzinfo=UTC)
                ts_query["$lte"] = int(end_dt.timestamp())
            and_filters.append({"timestamp": ts_query})

        if and_filters:
            mongo_query["$and"] = and_filters

        skip = (options.page - 1) * options.page_size
        total = await StandupEntry.find(mongo_query).count()
        messages = (
            await StandupEntry.find(mongo_query)
            .sort(-StandupEntry.timestamp)
            .skip(skip)
            .limit(options.page_size)
            .to_list()
        )
        items = [
            StandupEntry.model_validate(message.model_dump(mode="python", by_alias=True))
            for message in messages
        ]
        total_pages = (total + options.page_size - 1) // options.page_size if total else 0

        return PaginatedStandUpEntries(
            items=items,
            total=total,
            page=options.page,
            page_size=options.page_size,
            total_pages=total_pages,
        )


def get_daily_standup_repo() -> DailyStandupRepository:
    return BeanieDailyStandupRepository()
