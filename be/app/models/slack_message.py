"""Slack Message model."""

from typing import Any, Dict, Optional

from beanie import Document


class SlackMessage(Document):
    """Slack Message representing a daily standup update."""

    user_id: str
    name: str
    content: str
    timestamp: int
    slack_ts: Optional[str] = None
    parsed_result: Optional[Dict[str, Any]] = None
    parsed_at: Optional[int] = None

    class Settings:
        name = "slack_messages"
