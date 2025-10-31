"""Command handler interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TypeVar, Generic

from .command import Command

TCommand = TypeVar('TCommand', bound=Command)


class CommandHandler(ABC, Generic[TCommand]):
    """Interface for command handlers."""

    @abstractmethod
    async def handle(self, command: TCommand) -> None:
        """Handle the command."""
        pass
