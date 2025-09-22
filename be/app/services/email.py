from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage

from constants import (
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_TLS,
    SMTP_USERNAME,
)


class EmailConfigurationError(RuntimeError):
    pass


def _ensure_smtp_configured() -> None:
    if not SMTP_HOST or not SMTP_FROM_EMAIL:
        raise EmailConfigurationError("SMTP configuration is incomplete")


def _build_message(subject: str, recipient: str, body: str) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = recipient
    message.set_content(body)
    return message


def _send(message: EmailMessage) -> None:
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        if SMTP_USE_TLS:
            server.starttls()
        if SMTP_USERNAME and SMTP_PASSWORD:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(message)


async def send_email(subject: str, recipient: str, body: str) -> None:
    _ensure_smtp_configured()
    message = _build_message(subject, recipient, body)
    await asyncio.to_thread(_send, message)
