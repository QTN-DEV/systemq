"""
Migration script to update old position values to new valid positions.

This script updates users with old position values (like 'HR') to valid ones.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

# Position mapping from old to new
POSITION_MAPPING = {
    "HR": "Internal Ops",  # Map HR to Internal Ops
    "Div. Lead": "Div Lead",  # Map "Div. Lead" to "Div Lead" (remove dot and space)
    "Developer": "Team Member",  # Map Developer to Team Member if exists
    "Designer": "Team Member",  # Map Designer to Team Member if exists
    "Manager": "Div Lead",  # Map Manager to Div Lead
    # Add more mappings as needed based on your old data
}


async def migrate_positions():
    """Migrate old position values to new valid positions."""
    
    # Get MongoDB URI from environment
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        print("Error: MONGODB_URI environment variable not set")
        print("Please set it in your .env file or export it")
        return
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(mongodb_uri)
    
    # Get database name from MONGODB_DATABASE env var or extract from URI
    db_name = os.getenv("MONGODB_DATABASE")
    if not db_name:
        db_name = mongodb_uri.split("/")[-1].split("?")[0] or "systemq"
    
    db = client[db_name]
    users_collection = db["users"]
    
    print(f"Connected to database: {db_name}")
    print("Checking for users with invalid positions...\n")
    
    # Valid positions
    valid_positions = ["Admin", "CEO", "Internal Ops", "Div Lead", "PM", "Team Member"]
    
    # Find all users with invalid positions
    invalid_users = []
    async for user in users_collection.find({
        "position": {"$exists": True, "$nin": valid_positions + [None]}
    }):
        invalid_users.append(user)
    
    if not invalid_users:
        print("✅ No users found with invalid positions. Database is up to date!")
        client.close()
        return
    
    print(f"Found {len(invalid_users)} user(s) with invalid positions:\n")
    
    # Display users that will be updated
    for user in invalid_users:
        old_position = user.get("position")
        new_position = POSITION_MAPPING.get(old_position, "Team Member")
        print(f"  • {user.get('name')} ({user.get('email')})")
        print(f"    Old position: '{old_position}' → New position: '{new_position}'")
    
    print("\n" + "="*60)
    response = input("Do you want to proceed with the migration? (yes/no): ")
    
    if response.lower() not in ["yes", "y"]:
        print("Migration cancelled.")
        client.close()
        return
    
    # Prepare bulk update operations
    bulk_operations = []
    for user in invalid_users:
        old_position = user.get("position")
        new_position = POSITION_MAPPING.get(old_position, "Team Member")
        
        bulk_operations.append(
            UpdateOne(
                {"_id": user["_id"]},
                {"$set": {"position": new_position}}
            )
        )
    
    # Execute bulk update
    if bulk_operations:
        result = await users_collection.bulk_write(bulk_operations)
        print(f"\n✅ Migration completed!")
        print(f"   Modified {result.modified_count} user(s)")
    
    client.close()
    print("\n🎉 Database migration finished successfully!")


if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)
    
    asyncio.run(migrate_positions())
