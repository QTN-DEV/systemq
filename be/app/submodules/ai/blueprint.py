import os
import chevron
from typing import Any, Dict, List, Optional

class PromptBlueprint:
    def __init__(self, template: str, working_directory: str):
        self._template = template
        self._working_directory = working_directory
        self._vars: Dict[str, Any] = {}
        
        self._mcp_servers: Dict[str, Any] = {}
        self._allowed_tools: List[str] = []
        self._disallowed_tools: List[str] = []
        
        self._model: str = "claude-haiku-4-5-20251001"
        self._max_budget_usd: float = 2.0
        self._max_turns: int = 120
        self._system_prompt: Optional[str] = None
        self._api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY")

    def set_vars(self, **kwargs):
        self._vars.update(kwargs)
        return self

    def use_model(self, model: str):
        self._model = model
        return self

    def add_mcp(self, name: str, server_instance: Any):
        """Attaches an external MCP server to this blueprint execution."""
        self._mcp_servers[name] = server_instance
        return self

    def configure_tools(self, allowed: List[str] = None, disallowed: List[str] = None):
        if allowed: self._allowed_tools.extend(allowed)
        if disallowed: self._disallowed_tools.extend(disallowed)
        return self

    def set_system_prompt(self, prompt: str):
        self._system_prompt = prompt
        return self

    def render(self) -> str:
        """Returns ONLY the compiled prompt string."""
        return chevron.render(self._template, self._vars)

    def build(self) -> dict:
        """Compiles the blueprint into a final Execution Package."""
        rendered_prompt = chevron.render(self._template, self._vars)

        return {
            "prompt": rendered_prompt,
            "cwd": self._working_directory,
            "model": self._model,
            "api_key": self._api_key,
            "max_budget_usd": self._max_budget_usd,
            "max_turns": self._max_turns,
            "allowed_tools": self._allowed_tools,
            "disallowed_tools": self._disallowed_tools,
            "mcp_servers": self._mcp_servers,
            "system_prompt": self._system_prompt,
        }