"""Background tasks API endpoints."""

from fastapi import APIRouter

from app.schemas.slack import (
    CrawlerStartRequest,
    CrawlerStatusResponse,
    ParserStatusResponse,
)
from app.services.slack_crawler_service import slack_crawler
from app.services.slack_parser_service import parse_runner

router = APIRouter(prefix="/background-tasks", tags=["Background Tasks"])


@router.get("/parser/status", response_model=ParserStatusResponse)
async def get_parser_status():
    """Get the current status of the Slack message parser."""
    return {
        "is_running": parse_runner.is_running,
        "processed_count": parse_runner.processed_count,
        "error_count": parse_runner.error_count,
        "sleep_interval": parse_runner.sleep_interval,
    }


@router.post("/parser/start", response_model=ParserStatusResponse)
async def start_parser():
    """Start the Slack message parser."""
    parse_runner.start()
    return await get_parser_status()


@router.post("/parser/stop", response_model=ParserStatusResponse)
async def stop_parser():
    """Stop the Slack message parser."""
    parse_runner.stop()
    return await get_parser_status()


@router.get("/crawler/status", response_model=CrawlerStatusResponse)
async def get_crawler_status():
    """Get the current status of the Slack crawler."""
    return {
        "is_running": slack_crawler.is_running,
        "status_message": slack_crawler.status_message,
    }


@router.post("/crawler/start", response_model=CrawlerStatusResponse)
async def start_crawler(request: CrawlerStartRequest):
    """Start the Slack crawler to fetch historical messages."""
    slack_crawler.start(request.start_date, request.end_date)
    return await get_crawler_status()


@router.post("/crawler/stop", response_model=CrawlerStatusResponse)
async def stop_crawler():
    """Stop the Slack crawler."""
    slack_crawler.stop()
    return await get_crawler_status()
