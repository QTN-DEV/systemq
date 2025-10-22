import os

from dotenv import load_dotenv
from pymongo import MongoClient

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
