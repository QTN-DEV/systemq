"""Slack message parser service and background task runner."""

import asyncio
import logging
import os
from datetime import datetime
from typing import Any, List, Optional, Tuple

from beanie import PydanticObjectId

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_openai import ChatOpenAI

from app.models.slack_message import SlackMessage
from app.schemas.slack import ParsedResult

logger = logging.getLogger(__name__)


def parse_message_content(content: str) -> Tuple[Optional[ParsedResult], int, int, int]:
    """Parse message content and return structured data using LLM."""
    if not content or not content.strip():
        return None, 0, 0, 0

    try:
        chat = ChatOpenAI(
            model="gpt-5.4-nano-2026-03-17", api_key=os.environ.get("OPENAI_API_KEY", "")
        )
        parser = JsonOutputParser(pydantic_object=ParsedResult)
        format_instructions = parser.get_format_instructions()
        current_year = datetime.now().year

        system_prompt = f"""You are a specialized parser for daily stand-up messages from Slack.
Your task is to extract structured data from messages that follow this format:

[Date]
YESTERDAY WORKLOAD
[Project Name] x Jam

DONE
[Project Name] Task

OTW
[Project Name] Task

[Date]
TODO
[Project Name] Task

BLOCKER
{{{{insert blocker}}}}

**Parsing Rules:**

1. **YESTERDAY WORKLOAD Section:**
   - Extract project names and hours from lines like "[Project Name] x Jam"
   - "x" represents the number of hours (e.g., "2 Jam" = 2 hours, "0.5 Jam" = 0.5 hours)
   - Extract done items from the DONE section that follow the workload
   - Group workload entries by project_name
   - Use the date mentioned in the message, or the date from YESTERDAY WORKLOAD section

2. **DONE Section:**
   - Extract tasks/items listed under DONE
   - Each line typically starts with [Project Name] followed by the task description
   - Associate done items with their corresponding project from YESTERDAY WORKLOAD

3. **OTW (On The Way) Section:**
   - Extract tasks/items listed under OTW
   - Each line typically starts with [Project Name] followed by the task description
   - Use the date mentioned in the message for the day_plan

4. **TODO Section:**
   - Extract tasks/items listed under TODO
   - Each line typically starts with [Project Name] followed by the task description
   - Use the date mentioned in the message for the day_plan

5. **BLOCKER Section:**
   - Extract blockers listed under BLOCKER
   - These are typically plain text describing what's blocking progress
   - Associate blockers with projects if mentioned, otherwise use "General"

6. **Date Handling:**
   - Extract dates from the message (format: YYYY-MM-DD)
   - If multiple dates are present, use the appropriate date for each section
   - If no date is found, use today's date
   - If user doesn't provide the year, use {current_year}

7. **Project Name Formatting:**
   - Convert project names to lowercase
   - Replace spaces with hyphens (e.g., "My Project" → "my-project")
   - Preserve the original project name structure

8. **Grouping:**
   - Group all workload_summary entries by project_name
   - Group all day_plan entries by project_name
   - Each project should have its own entry in the respective arrays

**Important:**
- Extract ALL projects mentioned in the message
- Extract ALL hours, done items, OTW items, TODO items, and blockers
- Be thorough and don't miss any information
- If a section is missing, use empty arrays
- If hours are not specified, infer from context or use 0"""

        _prompt = (
            "Parse the following daily stand-up message and extract all structured data "
            f"according to the format instructions.\n\n{format_instructions}\n\n"
            f"Message content:\n{content}\n"
        )

        messages: List[BaseMessage] = [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content=[
                    {"type": "text", "text": _prompt},
                ]
            ),
        ]

        text_result = chat.invoke(messages)
        result = parser.invoke(str(text_result.content))

        usage = getattr(text_result, "usage_metadata", {})
        total_tokens = usage.get("total_tokens", 0)
        prompt_tokens = usage.get("input_tokens", 0)
        completion_tokens = usage.get("output_tokens", 0)

        return (ParsedResult.model_validate(result), total_tokens, prompt_tokens, completion_tokens)
    except Exception as e:
        logger.error(f"Error parsing message content: {e}")
        raise e


class ParseRunner:
    """Background service to continuously parse standup messages."""

    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self, sleep_interval: float = 5.0):
        self.sleep_interval = sleep_interval
        self.is_running = False
        self.processed_count = 0
        self.error_count = 0
        self.task: Optional[asyncio.Task] = None
        self.max_consecutive_errors = 3
        self.consecutive_errors = 0

    def start(self):
        if self.is_running:
            return

        self.is_running = True
        self.consecutive_errors = 0
        self.task = asyncio.create_task(self._run_loop())
        logger.info("Slack message parser started.")

    async def run_until_empty(self, threads: int = 1) -> dict[str, int]:
        if self.is_running:
            raise RuntimeError("Slack parser is already running.")
        if threads not in {1, 2, 4}:
            raise ValueError("--threads must be one of: 1, 2, 4")

        self.is_running = True
        self.processed_count = 0
        self.error_count = 0
        self.consecutive_errors = 0
        self.task = asyncio.current_task()
        unparsed_messages = await SlackMessage.find({"parsed_at": None}).sort("_id").to_list()
        partitions = self._build_partitions(unparsed_messages, threads)
        initial_remaining = len(unparsed_messages)
        logger.info("Starting parser. remaining=%s threads=%s", initial_remaining, threads)
        logger.info("Slack message parser started in CLI mode.")
        try:
            worker_tasks = [
                asyncio.create_task(
                    self._run_partition(worker_name, start_id, end_id, partition_size)
                )
                for worker_name, start_id, end_id, partition_size in partitions
                if partition_size > 0
            ]
            if worker_tasks:
                await asyncio.gather(*worker_tasks)
        finally:
            self.is_running = False
            self.task = None
            logger.info("Slack message parser finished in CLI mode.")

        return {
            "processed_count": self.processed_count,
            "error_count": self.error_count,
        }

    def stop(self):
        self.is_running = False
        if self.task:
            self.task.cancel()
            self.task = None
        logger.info("Slack message parser stopped.")

    async def _run_loop(self):
        while self.is_running:
            try:
                processed, had_error = await self._process_next_message(worker_name="background")
                if not processed:
                    await asyncio.sleep(self.sleep_interval)
                elif had_error:
                    if self.consecutive_errors >= self.max_consecutive_errors:
                        logger.critical("Maximum consecutive errors reached. Stopping parser.")
                        self.stop()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in parse loop: {e}")
                self.error_count += 1
                await asyncio.sleep(self.sleep_interval)

    def _build_partitions(
        self, messages: list[SlackMessage], threads: int
    ) -> list[tuple[str, PydanticObjectId, Optional[PydanticObjectId], int]]:
        total_messages = len(messages)
        partitions: list[tuple[str, PydanticObjectId, Optional[PydanticObjectId], int]] = []

        for index in range(threads):
            start_idx = (index * total_messages) // threads
            end_idx = ((index + 1) * total_messages) // threads
            partition_size = end_idx - start_idx
            if partition_size <= 0:
                continue

            start_id = messages[start_idx].id
            end_id = messages[end_idx].id if end_idx < total_messages else None
            partitions.append((f"worker-{index + 1}", start_id, end_id, partition_size))

        return partitions

    def _build_partition_filter(
        self,
        start_id: PydanticObjectId,
        end_id: Optional[PydanticObjectId] = None,
    ) -> dict[str, Any]:
        query: dict[str, Any] = {
            "parsed_at": None,
            "_id": {"$gte": start_id},
        }
        if end_id is not None:
            query["_id"]["$lt"] = end_id
        return query

    async def _run_partition(
        self,
        worker_name: str,
        start_id: PydanticObjectId,
        end_id: Optional[PydanticObjectId],
        partition_size: int,
    ) -> None:
        logger.info("%s starting. assigned=%s", worker_name, partition_size)
        consecutive_errors = 0

        while self.is_running:
            processed, had_error = await self._process_next_message(
                query=self._build_partition_filter(start_id, end_id),
                worker_name=worker_name,
            )
            if not processed:
                logger.info("%s finished.", worker_name)
                return

            if not had_error:
                consecutive_errors = 0
            else:
                consecutive_errors += 1
                if consecutive_errors >= self.max_consecutive_errors:
                    logger.critical(
                        "%s reached maximum consecutive errors. Stopping parser.",
                        worker_name,
                    )
                    self.is_running = False
                    return

    async def _process_next_message(
        self,
        query: Optional[dict[str, Any]] = None,
        worker_name: str = "parser",
    ) -> tuple[bool, bool]:
        message = await SlackMessage.find(query or {"parsed_at": None}).sort("_id").first_or_none()
        if not message:
            return False, False

        logger.info("%s processing message %s", worker_name, message.id)
        try:
            parsed_result, total_tokens, _, _ = parse_message_content(message.content)

            if parsed_result:
                message.parsed_result = parsed_result.model_dump()
                message.parsed_at = int(datetime.now().timestamp())
                await message.save()

                self.processed_count += 1
                self.consecutive_errors = 0
                remaining_count = await SlackMessage.find({"parsed_at": None}).count()
                logger.info(
                    "%s processed=%s remaining=%s latest=%s tokens=%s",
                    worker_name,
                    self.processed_count,
                    remaining_count,
                    message.id,
                    total_tokens,
                )
            else:
                self.error_count += 1
                logger.error(
                    "%s failed to extract parsed result for message %s. errors=%s",
                    worker_name,
                    message.id,
                    self.error_count,
                )
                self.consecutive_errors += 1
                return True, True

        except Exception as e:
            logger.error("%s ChatGPT parsing failed: %s", worker_name, e)
            self.error_count += 1
            self.consecutive_errors += 1
            logger.error(
                "%s errors=%s consecutive_errors=%s",
                worker_name,
                self.error_count,
                self.consecutive_errors,
            )
            return True, True

        return True, False


parse_runner = ParseRunner.get_instance()
