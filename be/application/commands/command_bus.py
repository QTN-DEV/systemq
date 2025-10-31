"""Command bus for dispatching commands to handlers."""

from __future__ import annotations

from typing import Dict, Type
from .command import Command
from .command_handler import CommandHandler


class CommandBus:
    """Command bus for dispatching commands to their handlers."""

    def __init__(self) -> None:
        """Initialize the command bus."""
        self._handlers: Dict[Type[Command], CommandHandler] = {}

    def register_handler(self, command_type: Type[Command], handler: CommandHandler) -> None:
        """Register a handler for a command type."""
        self._handlers[command_type] = handler

    async def dispatch(self, command: Command) -> None:
        """Dispatch a command to its handler."""
        command_type = type(command)
        if command_type not in self._handlers:
            raise ValueError(f"No handler registered for command: {command_type.__name__}")

        handler = self._handlers[command_type]
        await handler.handle(command)
