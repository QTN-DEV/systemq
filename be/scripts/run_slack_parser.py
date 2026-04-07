#!/usr/bin/env python3
"""Run the Slack parser from the command line until the queue is empty."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.db.beanie import close_database, init_database
from app.services.slack_parser_service import parse_runner


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
    args = _parse_args()
    await init_database()
    try:
        result = await parse_runner.run_until_empty(threads=args.threads)
        logging.info(
            "Slack parser finished. processed=%s errors=%s",
            result["processed_count"],
            result["error_count"],
        )
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
