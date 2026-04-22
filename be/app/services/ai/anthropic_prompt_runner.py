import json
import os
import time
import re
from pathlib import Path
from typing import List, Optional, Dict, Any, AsyncGenerator
from claude_agent_sdk import query, ClaudeAgentOptions

from .base_prompt_runner import BasePromptRunner, PromptRunnerOptions, PromptRunnerRunResult
from .mappers import AnthropicMapper
from .base_mcp import LinearMCP

class AnthropicPromptRunnerOptions(PromptRunnerOptions):
    working_directory: str
    api_key: Optional[str] = None
    model: Optional[str] = None
    tools: Optional[List[str]] = None
    disallowed_tools: Optional[List[str]] = None
    max_budget_usd: Optional[float] = None
    max_turns: Optional[int] = None
    system_prompt: Optional[str] = None

class AnthropicPromptRunner(BasePromptRunner):
    def __init__(self, options: AnthropicPromptRunnerOptions):
        super().__init__(options)
        self.options = options
        self.model = getattr(options, "model", None) or "claude-sonnet-4-20250514"
        self.tools = getattr(options, "tools", None) or []
        self.disallowed_tools = getattr(options, "disallowed_tools", None) or []
        self.max_budget_usd = getattr(options, "max_budget_usd", None) or 2.0
        self.max_turns = getattr(options, "max_turns", None) or 40
        self.working_directory = options.working_directory
        self.system_prompt = getattr(options, "system_prompt", None)
        
        self.mapper = AnthropicMapper()
        self.api_key = getattr(options, "api_key", None) or os.getenv("ANTHROPIC_API_KEY")

    def _interpolate_prompt(self, template: str, data: Optional[Dict[str, Any]] = None) -> str:
        if not data:
            return template
        
        def replace_match(match):
            key = match.group(1)
            return str(data.get(key, match.group(0)))
            
        return re.sub(r"\{(\w+)\}", replace_match, template)

    async def _initialize_debug_log(self) -> str:
        debug_dir = Path(self.working_directory) / ".debug"
        debug_dir.mkdir(parents=True, exist_ok=True)
        file_path = debug_dir / f"anthropic-{int(time.time() * 1000)}.ndjson"
        
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(json.dumps({"type": "init", "model": self.model}) + "\n")
            
        return str(file_path)

    async def _log_chunk(self, path: str, chunk: Any):
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(chunk) + "\n")

    async def run(self) -> PromptRunnerRunResult:
        prompt_template = self.options.prompt_template
        data = getattr(self.options, "data", None)
        prompt = self._interpolate_prompt(prompt_template, data)

        # Print MCP Config just like in the original code for debugging
        if os.getenv("LINEAR_API_KEY"):
            print(LinearMCP(api_key=os.getenv("LINEAR_API_KEY")).to_config())
            
        # Optional: InstagramMCP config check if needed here

        debug_path = await self._initialize_debug_log()

        try:
            # We set ANTHROPIC_API_KEY env var if it's explicitly passed so the SDK picks it up
            if self.api_key:
                os.environ["ANTHROPIC_API_KEY"] = self.api_key

            from .tools.daily_standup import daily_standup_tools_server
            from .tools.employee import employee_tools_server
            from .tools.dashboard import dashboard_tools_server
            
            agent_opts_dict = {
                "cwd": self.working_directory,
                "model": self.model,
                "max_budget_usd": self.max_budget_usd,
                "permission_mode": "bypassPermissions",
                "max_turns": self.max_turns,
                "allowed_tools": self.tools,
                "disallowed_tools": self.disallowed_tools,
                "setting_sources": ["project"],
                "include_partial_messages": True,
                "mcp_servers": {
                    "employee-service": employee_tools_server,
                    "daily-standup-service": daily_standup_tools_server,
                    "dashboard-service": dashboard_tools_server,
                }
            }
            if self.system_prompt:
                agent_opts_dict["system_prompt"] = self.system_prompt
                
            agent_opts = ClaudeAgentOptions(**agent_opts_dict)

            stream = query(
                prompt=prompt,
                options=agent_opts
            )

            # Iterating through async generator stream
            async for stream_chunk in stream:
                chunk = self.mapper.map(stream_chunk)
                if chunk:
                    await self._log_chunk(debug_path, chunk)
                    yield {"data": json.dumps(chunk)}
                    
        except Exception as err:
            print(f"❌ Prompt Runner Error: {err}")
