import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.environ["MONGODB_URI"])
db = client[os.environ["MONGODB_DATABASE"]]

projection = {
    "_id": 0,
    "email": 1,
    "name": 1,
    "level": 1,
    "position": 1,
    "division": 1,
    "title": 1,
}

print("Users and their roles:")
for user in db.users.find({}, projection).sort("email"):
    email = user.get("email") or "<no email>"
    name = user.get("name") or "<no name>"
    level = user.get("level") or "-"
    position = user.get("position") or "-"
    division = user.get("division") or "-"
    title = user.get("title") or "-"
    print(f"- {email:30s} | name={name} | level={level} | position={position} | division={division} | title={title}")
