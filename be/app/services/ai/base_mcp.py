from typing import Dict, List, TypedDict, Optional

class MCPConfig(TypedDict):
    command: str
    args: List[str]

class BaseMCP:
    def __init__(self, url: str, headers: Optional[Dict[str, str]] = None):
        self.url = url
        self.headers = headers or {}
        
    def to_config(self) -> MCPConfig:
        header_args = []
        for key, value in self.headers.items():
            header_args.extend(["--header", f"{key}: {value}"])
            
        return {
            "command": "npx",
            "args": ["-y", "mcp-remote", self.url] + header_args
        }

class LinearMCP(BaseMCP):
    def __init__(self, api_key: str):
        super().__init__(
            url="https://mcp.linear.app/mcp",
            headers={"Authorization": f"Bearer {api_key}"}
        )
