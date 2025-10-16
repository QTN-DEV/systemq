"""Shared logging helpers."""

from __future__ import annotations

import logging
from typing import Any, Mapping


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced logger."""
    return logging.getLogger(name)


def log_debug(logger: logging.Logger, message: str, **extra: Any) -> None:
    """Emit a debug log with structured extra data."""
    logger.debug(message, extra=_prepare_extra(extra))


def log_info(logger: logging.Logger, message: str, **extra: Any) -> None:
    """Emit an info log with structured extra data."""
    logger.info(message, extra=_prepare_extra(extra))


def log_warning(logger: logging.Logger, message: str, **extra: Any) -> None:
    """Emit a warning log with structured extra data."""
    logger.warning(message, extra=_prepare_extra(extra))


def log_error(logger: logging.Logger, message: str, **extra: Any) -> None:
    """Emit an error log with structured extra data."""
    logger.error(message, extra=_prepare_extra(extra))


def _prepare_extra(extra: Mapping[str, Any] | None) -> Mapping[str, Any]:
    if not extra:
        return {}
    # logging module expects 'extra' to be a mapping; return copy to avoid side effects
    return dict(extra)
