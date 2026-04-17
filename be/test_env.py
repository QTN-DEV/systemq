import os
from dotenv import load_dotenv
load_dotenv()
print("KEY:", os.getenv("ANTHROPIC_API_KEY")[:10] if os.getenv("ANTHROPIC_API_KEY") else "None")
