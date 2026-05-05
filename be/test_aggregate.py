import asyncio
from app.db.beanie import init_db
from app.submodules.drive.documents import Documents

async def main():
    await init_db()
    pipeline = [{"$limit": 1}]
    try:
        docs = await Documents.aggregate(pipeline).to_list()
        print(docs)
    except Exception as e:
        print("ERROR:", repr(e))

asyncio.run(main())
