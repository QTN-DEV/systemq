import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions
import os

async def main():
    agent_opts = ClaudeAgentOptions(
        model="claude-3-7-sonnet-20250219",
        debug_stderr=True,
    )
    print("Running query...")
    try:
        async for chunk in query(prompt="Hello", options=agent_opts):
            pass
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
