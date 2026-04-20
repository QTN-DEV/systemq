import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions
from dotenv import load_dotenv
load_dotenv()

async def main():
    agent_opts = ClaudeAgentOptions(
        model="claude-3-5-sonnet-20241022",
    )
    try:
        async for chunk in query(prompt="Say hi", options=agent_opts):
            print("TYPE:", type(chunk))
            if hasattr(chunk, 'model_dump'):
                print("DUMP:", chunk.model_dump())
            elif hasattr(chunk, 'dict'):
                print("DICT METHOD:", chunk.dict())
            elif hasattr(chunk, '__dict__'):
                print("DICT ATTR:", chunk.__dict__)
            else:
                print("RAW:", chunk)
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
