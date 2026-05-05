import json
import os
import time
from pathlib import Path
from typing import Any, AsyncGenerator
from claude_agent_sdk import query, ClaudeAgentOptions

from ..mappers import AnthropicResponseMapper
from ..blueprint import PromptBlueprint

class AnthropicRunner:
    def __init__(self, blueprint: PromptBlueprint):
        self.package = blueprint.build()
        self.mapper = AnthropicResponseMapper()

    async def _initialize_debug_log(self) -> str:
        debug_dir = Path(self.package["cwd"]) / ".debug"
        debug_dir.mkdir(parents=True, exist_ok=True)
        file_path = debug_dir / f"anthropic-{int(time.time() * 1000)}.ndjson"
        
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(json.dumps({"type": "init", "model": self.package["model"]}) + "\n")
            
        return str(file_path)

    async def _log_chunk(self, path: str, chunk: Any):
        def json_default(obj):
            if hasattr(obj, "model_dump"): return obj.model_dump(mode="json")
            if hasattr(obj, "dict"): return obj.dict()
            return str(obj)

        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(chunk, default=json_default) + "\n")

    async def run(self) -> AsyncGenerator[dict, None]:
        debug_path = await self._initialize_debug_log()
        raw_debug_path = debug_path.replace("anthropic-", "raw-anthropic-")

        try:
            if self.package["api_key"]:
                os.environ["ANTHROPIC_API_KEY"] = self.package["api_key"]

            agent_opts_dict = {
                "cwd": self.package["cwd"],
                "model": self.package["model"],
                "max_budget_usd": self.package["max_budget_usd"],
                "permission_mode": "bypassPermissions",
                "max_turns": self.package["max_turns"],
                "allowed_tools": self.package["allowed_tools"],
                "disallowed_tools": self.package["disallowed_tools"],
                "setting_sources": ["project"],
                "include_partial_messages": True,
                "mcp_servers": self.package["mcp_servers"]
            }

            print("self.package", self.package)
            
            if self.package["system_prompt"]:
                agent_opts_dict["system_prompt"] = self.package["system_prompt"]

            agent_opts = ClaudeAgentOptions(**agent_opts_dict)

            stream = query(prompt=self.package["prompt"], options=agent_opts)

            async for stream_chunk in stream:
                raw_data = {"_class": type(stream_chunk).__name__}
                try:
                    if hasattr(stream_chunk, "model_dump"):
                        raw_data.update(stream_chunk.model_dump(mode="json"))
                    elif hasattr(stream_chunk, "dict"):
                        raw_data.update(stream_chunk.dict())
                    else:
                        raw_data.update(getattr(stream_chunk, "__dict__", {}))
                except Exception as log_err:
                    raw_data.update({"error": str(log_err), "raw_str": str(stream_chunk)})
                
                await self._log_chunk(raw_debug_path, raw_data)

                chunk = self.mapper.map(stream_chunk)
                if chunk:
                    await self._log_chunk(debug_path, chunk)
                    yield {"data": json.dumps(chunk)}

        except Exception as err:
            print(f"❌ Prompt Runner Error: {err}")
            raise