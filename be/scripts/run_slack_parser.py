#!/usr/bin/env python3
"""Run the Slack parser from the command line until the queue is empty."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models.slack_message import SlackMessage
from app.services.slack_parser_service import parse_runner
from constants import MONGODB_DATABASE, MONGODB_URI

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Slack parser from the command line."
    )
    parser.add_argument(
        "--threads",
        type=int,
        choices=[1, 2, 4],
        default=1,
        help="Number of parallel parser runners to use. Defaults to 1.",
    )
    return parser.parse_args()


async def _main() -> int:
    from beanie import init_beanie
    from motor.motor_asyncio import AsyncIOMotorClient

    args = _parse_args()
    
    client = AsyncIOMotorClient(MONGODB_URI)
    await init_beanie(
        database=client[MONGODB_DATABASE],
        document_models=[
            SlackMessage
        ]
    )
    
    try:
        logging.info(f"Starting Slack parser with {args.threads} thread(s)...")
        result = await parse_runner.run_until_empty(threads=args.threads)
        logging.info(
            "Slack parser finished. processed=%s errors=%s",
            result["processed_count"],
            result["error_count"],
        )
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
        sys.exit(asyncio.run(_main()))
    except Exception as exc:
        logging.error(f"FATAL ERROR: {exc}")
        sys.exit(1)