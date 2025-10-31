"""Example usage of the refactored hexagonal architecture."""

import asyncio
import sys
import os
from contextlib import asynccontextmanager

# Add the current directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(__file__))

from constants import MONGODB_URI, MONGODB_DATABASE
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from infrastructure.database.user_document import UserDocument
from infrastructure.dependency_container import init_container

@asynccontextmanager
async def database_lifespan():
    """Database lifespan for testing."""
    client = AsyncIOMotorClient(MONGODB_URI)
    database = client[MONGODB_DATABASE]

    await init_beanie(database=database, document_models=[UserDocument])
    print("Database initialized for testing")

    try:
        yield
    finally:
        client.close()
        print("Database connection closed")


async def main():
    """Demonstrate the hexagonal architecture."""
    async with database_lifespan():
        # Get the dependency container
        container = init_container()

        # Get the user application service
        user_service = container.user_application_service

        print(">>> Demonstrating Hexagonal Architecture + DDD + CQRS")
        print("=" * 70)

        try:
            # Create a new user
            import time
            user_id = f"user-{int(time.time())}"
            email = f"john.{int(time.time())}@example.com"

            print("\n1. Creating a new user...")
            await user_service.create_user(
                user_id=user_id,
                name="John Doe",
                email=email,
                hashed_password="hashed_password_123",
                employee_id="EMP001",
                title="Software Engineer",
                division="Engineering"
            )
            print("[OK] User created successfully")

            # Get the user
            print("\n2. Retrieving the user...")
            user = await user_service.get_user(user_id)
            if user:
                print(f"[OK] Found user: {user.name.full_name} ({user.email.value})")
                print(f"   - Employee ID: {user.employee_id if user.employee_id else 'None'}")
                print(f"   - Title: {user.title}")
                print(f"   - Division: {user.division}")
                print(f"   - Active: {user.is_active}")
            else:
                print("[ERROR] User not found")

            # Update user profile
            print("\n3. Updating user profile...")
            await user_service.update_user_profile(
                user_id=user_id,
                name="John Smith",
                title="Senior Software Engineer"
            )
            print("[OK] User profile updated")

            # Get updated user
            print("\n4. Retrieving updated user...")
            updated_user = await user_service.get_user(user_id)
            if updated_user:
                print(f"[OK] Updated user: {updated_user.name.full_name}")
                print(f"   - Title: {updated_user.title}")

            # Change password
            print("\n5. Changing password...")
            await user_service.change_password(user_id, "new_hashed_password")
            print("[OK] Password changed")

            print("\n[SUCCESS] All operations completed successfully!")
            print("\nThis demonstrates:")
            print("• Hexagonal Architecture (separation of concerns)")
            print("• Domain-Driven Design (User aggregate, value objects)")
            print("• CQRS (separate command and query handlers)")
            print("• Direct State Storage (state stored directly in database)")

        except Exception as e:
            print(f"[ERROR] Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
