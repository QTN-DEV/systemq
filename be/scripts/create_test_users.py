"""Script to create test users for development and testing."""

from __future__ import annotations

import asyncio
import os
from datetime import UTC, datetime

from beanie import init_beanie
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from app.models import User
from app.services.auth import hash_password

# Load environment variables
load_dotenv()


async def create_test_users():
    """Create test users with different roles and divisions."""
    # Connect to MongoDB using environment variables
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_database = os.getenv("MONGODB_DATABASE", "systemq_test")

    client = AsyncIOMotorClient(mongodb_uri)
    db = client[mongodb_database]

    # Initialize beanie
    await init_beanie(database=db, document_models=[User])

    # Test users to create
    test_users = [
        {
            "employee_id": "ADMIN001",
            "name": "Admin User",
            "email": "admin@example.com",
            "title": "System Administrator",
            "division": "Internal Ops",
            "level": "Admin",
            "position": "CEO",
            "password": "admin123",
        },
        {
            "employee_id": "MGR001",
            "name": "Manager Alice",
            "email": "alice@example.com",
            "title": "Engineering Manager",
            "division": "Developer",
            "level": "Manager",
            "position": "Div. Lead",
            "password": "password123",
        },
        {
            "employee_id": "MGR002",
            "name": "Manager Bob",
            "email": "bob@example.com",
            "title": "HR Manager",
            "division": "Internal Ops",
            "level": "Manager",
            "position": "HR",
            "password": "password123",
        },
        {
            "employee_id": "DEV001",
            "name": "Developer Charlie",
            "email": "charlie@example.com",
            "title": "Senior Developer",
            "division": "Developer",
            "level": "Staff",
            "position": "Team Member",
            "password": "password123",
        },
        {
            "employee_id": "DEV002",
            "name": "Developer Diana",
            "email": "diana@example.com",
            "title": "Junior Developer",
            "division": "Developer",
            "level": "Staff",
            "position": "Team Member",
            "password": "password123",
        },
        {
            "employee_id": "MKT001",
            "name": "Marketing Eve",
            "email": "eve@example.com",
            "title": "Marketing Specialist",
            "division": "Marketing",
            "level": "Staff",
            "position": "Team Member",
            "password": "password123",
        },
        {
            "employee_id": "FIN001",
            "name": "Finance Frank",
            "email": "frank@example.com",
            "title": "Financial Analyst",
            "division": "Finance",
            "level": "Staff",
            "position": "Team Member",
            "password": "password123",
        },
        {
            "employee_id": "HR001",
            "name": "HR Grace",
            "email": "grace@example.com",
            "title": "HR Specialist",
            "division": "Internal Ops",
            "level": "Staff",
            "position": "Team Member",
            "password": "password123",
        },
    ]

    print("Creating test users...")
    for user_data in test_users:
        # Check if user already exists
        existing = await User.find_one(User.email == user_data["email"])
        if existing:
            print(f"✓ User {user_data['email']} already exists, skipping...")
            continue

        # Create new user
        password = user_data.pop("password")
        user = User(
            **user_data,
            hashed_password=hash_password(password),
            is_active=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        await user.insert()
        print(f"✓ Created user: {user.email} ({user.name}) - Password: {password}")

    print("\n" + "=" * 60)
    print("Test users created successfully!")
    print("=" * 60)
    print("\nYou can login with any of these credentials:")
    print("- admin@example.com / admin123 (Admin)")
    print("- alice@example.com / password123 (Manager - Developer)")
    print("- bob@example.com / password123 (Manager - Internal Ops)")
    print("- charlie@example.com / password123 (Developer)")
    print("- diana@example.com / password123 (Developer)")
    print("- eve@example.com / password123 (Marketing)")
    print("- frank@example.com / password123 (Finance)")
    print("- grace@example.com / password123 (HR)")


if __name__ == "__main__":
    asyncio.run(create_test_users())
