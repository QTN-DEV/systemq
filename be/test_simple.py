"""Simple test without database."""

import asyncio
from domain.shared.value_objects.email import Email
from domain.shared.value_objects.name import Name
from domain.user.value_objects.user_id import UserId


async def main():
    """Test basic functionality."""
    print("Testing basic domain objects...")

    # Test value objects
    email = Email("test@example.com")
    name = Name("John", "Doe")
    user_id = UserId("user-123")

    print(f"Email: {email}")
    print(f"Name: {name.full_name}")
    print(f"User ID: {user_id}")

    # Test User creation (without database)
    try:
        from domain.user.entities.user import User
        user = User(
            user_id=user_id,
            name=name,
            email=email,
            hashed_password="hashed_password"
        )
        print(f"User created: {user.name.full_name}")
        print("[OK] Basic functionality works!")
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
