#!/usr/bin/env python3
"""Run the Slack history crawler from the command line."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.db.beanie import close_database, init_database
from app.services.slack_crawler_service import slack_crawler


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
    args = _parse_args()
    _validate_date(args.start_date, "--start-date")
    if args.end_date:
        _validate_date(args.end_date, "--end-date")
        if args.end_date < args.start_date:
            raise ValueError("--end-date must be greater than or equal to --start-date.")

    await init_database()
    try:
        await slack_crawler.run(args.start_date, args.end_date)
        logging.info(slack_crawler.status_message)
    finally:
        await close_database()

    return 0


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(message)s",
        stream=sys.stdout,
        force=True,
    )
    try:
        raise SystemExit(asyncio.run(_main()))
    except Exception as exc:
        logging.error(str(exc))
        raise SystemExit(1) from exc
