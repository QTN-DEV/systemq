from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parent
_DOTENV_PATH = _BASE_DIR / ".env"
if _DOTENV_PATH.exists():
    # Load environment variables from .env if present
    load_dotenv(_DOTENV_PATH)
else:
    load_dotenv()

APP_NAME: str = os.getenv("APP_NAME", "SystemQ API")
MONGODB_URI: str = os.getenv(
    "MONGODB_URI",
    "mongodb://qops:qops@3.1.94.166:27017/?authSource=admin",
)
MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "systemq")
