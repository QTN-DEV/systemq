"""Application constants."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parent
_DOTENV_PATH = _BASE_DIR / ".env"
if _DOTENV_PATH.exists():
    load_dotenv(_DOTENV_PATH)
else:
    load_dotenv()


def _get_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


APP_NAME: str = os.getenv("APP_NAME", "SystemQ API")
MONGODB_URI: str = os.getenv(
    "MONGODB_URI",
    "mongodb://qops:qops@3.1.94.166:27017/?authSource=admin",
)
MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "systemq")

SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
RESET_TOKEN_EXPIRE_MINUTES: int = _get_int("RESET_TOKEN_EXPIRE_MINUTES", 30)

SMTP_HOST: str = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT: int = _get_int("SMTP_PORT", 1025)
SMTP_USERNAME: str | None = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "admin@quantumteknologi.com")
print("SMTP_FROM_EMAIL:", SMTP_FROM_EMAIL)
SMTP_USE_TLS: bool = _get_bool("SMTP_USE_TLS", False)
