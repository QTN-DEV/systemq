#!/usr/bin/env python3
"""Run the Slack history crawler from the command line."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Import ONLY the specific model and the service
from app.models.slack_message import SlackMessage
from app.services.slack_crawler_service import slack_crawler
from constants import MONGODB_DATABASE, MONGODB_URI

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Slack history crawler for a date range."
    )
    parser.add_argument(
        "--start-date",
        required=True,
        help="Start date in YYYY-MM-DD format.",
    )
    parser.add_argument(
        "--end-date",
        help="End date in YYYY-MM-DD format. Defaults to the current time if omitted.",
    )
    return parser.parse_args()


def _validate_date(date_str: str, arg_name: str) -> None:
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(f"{arg_name} must use YYYY-MM-DD format.") from exc


async def _main() -> int:
    # Delayed imports to prevent any top-level circular triggers
    from beanie import init_beanie
    from motor.motor_asyncio import AsyncIOMotorClient

    args = _parse_args()
    _validate_date(args.start_date, "--start-date")
    if args.end_date:
        _validate_date(args.end_date, "--end-date")
        if args.end_date < args.start_date:
            raise ValueError("--end-date must be greater than or equal to --start-date.")

    # Initialize specifically for SlackMessage only
    client = AsyncIOMotorClient(MONGODB_URI)
    await init_beanie(
        database=client[MONGODB_DATABASE],
        document_models=[SlackMessage]
    )
    
    try:
        logging.info(f"Starting crawler for {args.start_date} to {args.end_date or 'now'}...")
        await slack_crawler.run(args.start_date, args.end_date)
        logging.info(slack_crawler.status_message)
    finally:
        client.close()

    return 0


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(message)s",
        stream=sys.stdout,
        force=True,
    )
    try:
        # Use sys.exit directly instead of raising SystemExit for cleaner tracebacks
        sys.exit(asyncio.run(_main()))
    except Exception as exc:
        logging.error(f"Execution failed: {exc}")
        sys.exit(1)