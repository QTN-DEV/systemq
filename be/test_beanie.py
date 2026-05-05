import asyncio
from app.db.beanie import _motor_client
from app.submodules.drive.documents import Documents

async def main():
    try:
        docs = [doc async for doc in Documents.aggregate([{"$limit": 1}])]
        print(docs)
    except Exception as e:
        print("ERROR:", repr(e))

