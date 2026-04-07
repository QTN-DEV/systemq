"""Slack history fetcher crawler service."""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from slack_sdk.errors import SlackApiError
from slack_sdk.web.async_client import AsyncWebClient

from app.models.slack_message import SlackMessage

logger = logging.getLogger(__name__)


class SlackCrawler:
    """Service to crawl slack channel histories."""

    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        token = os.environ.get("SLACK_BOT_TOKEN", "")
        self.client = AsyncWebClient(token=token)
        self.api_delay = 2.0
        self.user_info_delay = 1.0
        self.retry_delay = 10.0
        self.max_retries = 5
        self.user_name_cache: Dict[str, str] = {}

        self.is_running = False
        self.status_message = "Idle"
        self.task: Optional[asyncio.Task] = None

    def start(self, start_date: str, end_date: Optional[str] = None):
        if self.is_running:
            return

        self.is_running = True
        self.status_message = f"Starting fetch from {start_date} to {end_date or 'latest'}"
        self.task = asyncio.create_task(self._run_crawler(start_date, end_date))

    async def run(self, start_date: str, end_date: Optional[str] = None):
        if self.is_running:
            raise RuntimeError("Slack crawler is already running.")

        self.is_running = True
        self.status_message = f"Starting fetch from {start_date} to {end_date or 'latest'}"
        self.task = asyncio.current_task()
        try:
            await self._run_crawler(start_date, end_date)
        finally:
            self.task = None

    def stop(self):
        if self.is_running:
            self.is_running = False
            self.status_message = "Stopped by user"
            if self.task:
                self.task.cancel()
                self.task = None

    async def _run_crawler(self, start_date: str, end_date: Optional[str]):
        try:
            start_ts = self._parse_date_to_timestamp(start_date)
            end_ts = (
                self._parse_date_to_timestamp(end_date, True)
                if end_date
                else datetime.now(timezone.utc).timestamp()
            )

            channels = self._get_monitored_channels()
            if not channels:
                self.status_message = "No monitored channels found."
                logger.warning(self.status_message)
                self.is_running = False
                return

            logger.info(
                "Starting Slack history crawl from %s to %s across %s channel(s).",
                start_date,
                end_date or "latest",
                len(channels),
            )
            total_messages = 0

            for i, channel_id in enumerate(channels, 1):
                if not self.is_running:
                    break

                self.status_message = f"Fetching channel {i}/{len(channels)}: {channel_id}"
                logger.info(self.status_message)
                new_count, updated_count = await self._fetch_channel_messages(
                    channel_id, start_ts, end_ts
                )
                total_messages += new_count + updated_count
                logger.info(
                    "Finished channel %s: new=%s updated=%s total_processed=%s",
                    channel_id,
                    new_count,
                    updated_count,
                    total_messages,
                )

            if self.is_running:
                self.status_message = f"Completed. Processed {total_messages} messages."
                logger.info(self.status_message)

        except asyncio.CancelledError:
            self.status_message = "Crawler cancelled."
            logger.warning(self.status_message)
        except Exception as e:
            logger.error(f"Crawler error: {e}")
            self.status_message = f"Error: {str(e)}"
        finally:
            self.is_running = False

    def _parse_date_to_timestamp(self, date_str: str, end_of_day: bool = False) -> float:
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if end_of_day:
                date_obj = date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
            return date_obj.timestamp()
        except ValueError:
            raise ValueError(f"Invalid date format '{date_str}'. Please use YYYY-MM-DD format.")

    def _get_monitored_channels(self) -> List[str]:
        raw = os.environ.get("MONITORED_CHANNELS", "")
        if raw:
            return [c.strip() for c in raw.split(",") if c.strip()]
        return []

    async def _fetch_channel_messages(
        self, channel_id: str, start_ts: float, end_ts: float
    ) -> tuple[int, int]:
        new_count = 0
        updated_count = 0
        cursor = None
        page = 0

        while self.is_running:
            try:
                await asyncio.sleep(self.api_delay)
                page += 1
                logger.info("Requesting page %s for channel %s", page, channel_id)
                response = await self.client.conversations_history(
                    channel=channel_id,
                    oldest=str(start_ts),
                    latest=str(end_ts),
                    limit=200,
                    cursor=cursor,
                )

                if not response.get("ok"):
                    break

                messages = response.get("messages", [])
                if not messages:
                    logger.info("No more messages for channel %s", channel_id)
                    break

                logger.info(
                    "Received %s messages on page %s for channel %s",
                    len(messages),
                    page,
                    channel_id,
                )

                for message in messages:
                    if not self.is_running:
                        break

                    if self._should_process_message(message):
                        saved = await self._process_message(message, channel_id)
                        if saved:
                            new_count += 1
                        else:
                            updated_count += 1

                logger.info(
                    "Progress channel %s: page=%s new=%s updated=%s",
                    channel_id,
                    page,
                    new_count,
                    updated_count,
                )

                if not response.get("has_more", False):
                    break
                cursor = response.get("response_metadata", {}).get("next_cursor")
                if not cursor:
                    break

            except SlackApiError as e:
                logger.error(f"API Error fetching messages: {e}")
                if e.response.get("error") in ["rate_limited", "ratelimited"]:
                    retry_after = float(e.response.headers.get("Retry-After", self.retry_delay))
                    await asyncio.sleep(retry_after)
                else:
                    break
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                break

        return new_count, updated_count

    def _should_process_message(self, message: Dict[str, Any]) -> bool:
        if not message.get("user") or not message.get("text") or message.get("bot_id"):
            return False

        skip_subtypes = {"bot_message", "channel_join", "channel_leave"}
        if message.get("subtype") in skip_subtypes:
            return False

        return True

    async def _process_message(self, message: Dict[str, Any], channel_id: str) -> bool:
        slack_ts = message.get("ts", "")
        try:
            timestamp = int(float(slack_ts))
        except ValueError:
            return False

        user_id = message["user"]
        text = message["text"]
        user_name = await self._get_user_name(user_id)

        existing = await SlackMessage.find_one({"timestamp": timestamp})

        if existing:
            if existing.content != text:
                existing.content = text
                existing.name = user_name
                existing.slack_ts = slack_ts
                existing.parsed_result = None
                existing.parsed_at = None
                await existing.save()
            elif not existing.slack_ts and slack_ts:
                existing.slack_ts = slack_ts
                await existing.save()
            return False
        else:
            new_msg = SlackMessage(
                user_id=user_id,
                name=user_name,
                content=text,
                timestamp=timestamp,
                slack_ts=slack_ts,
            )
            await new_msg.insert()
            return True

    async def _get_user_name(self, user_id: str) -> str:
        if user_id in self.user_name_cache:
            return self.user_name_cache[user_id]

        try:
            await asyncio.sleep(self.user_info_delay)
            res = await self.client.users_info(user=user_id)
            if res.get("ok"):
                user_info = res["user"]
                name = (
                    user_info.get("profile", {}).get("display_name")
                    or user_info.get("real_name")
                    or user_info.get("name")
                    or f"User_{user_id}"
                )
                self.user_name_cache[user_id] = name
                return name
        except Exception:
            pass

        name = f"User_{user_id}"
        self.user_name_cache[user_id] = name
        return name


slack_crawler = SlackCrawler.get_instance()
