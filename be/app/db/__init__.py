"""App database package."""

from .beanie import init_database, close_database, ensure_default_data

__all__ = ["init_database", "close_database", "ensure_default_data"]