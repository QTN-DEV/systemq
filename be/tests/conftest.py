"""Pytest configuration and fixtures."""

from __future__ import annotations

import pytest
import pytest_asyncio
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.main import app
from app.models import PasswordResetToken, SessionToken, User
from app.models.qdrive import QDrive, QDriveSnapshot
from app.services.auth import hash_password


@pytest_asyncio.fixture(scope="function")
async def test_db():
    """Set up test database."""
    client = AsyncMongoMockClient()
    db = client.get_database("test_db")

    await init_beanie(
        database=db,
        document_models=[User, QDrive, QDriveSnapshot, SessionToken, PasswordResetToken],
    )

    yield db

    # Cleanup
    await User.delete_all()
    await QDrive.delete_all()
    await QDriveSnapshot.delete_all()
    await SessionToken.delete_all()
    await PasswordResetToken.delete_all()


@pytest_asyncio.fixture
async def test_client(test_db):
    """Create test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


@pytest_asyncio.fixture
async def admin_user(test_db):
    """Create admin user."""
    user = User(
        employee_id="ADMIN001",
        name="Admin User",
        email="admin@test.com",
        title="Administrator",
        division="Internal Ops",
        level="Admin",
        position="CEO",
        hashed_password=hash_password("password123"),
        is_active=True,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def regular_user(test_db):
    """Create regular user."""
    user = User(
        employee_id="USER001",
        name="Regular User",
        email="user@test.com",
        title="Developer",
        division="Developer",
        level="Staff",
        position="Team Member",
        hashed_password=hash_password("password123"),
        is_active=True,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def viewer_user(test_db):
    """Create viewer user."""
    user = User(
        employee_id="USER002",
        name="Viewer User",
        email="viewer@test.com",
        title="Viewer",
        division="Marketing",
        level="Staff",
        position="Team Member",
        hashed_password=hash_password("password123"),
        is_active=True,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def admin_token(test_client, admin_user):
    """Get admin authentication token."""
    from app.services.auth import login

    session = await login(admin_user.email, "password123")
    return session["token"]


@pytest_asyncio.fixture
async def user_token(test_client, regular_user):
    """Get regular user authentication token."""
    from app.services.auth import login

    session = await login(regular_user.email, "password123")
    return session["token"]


@pytest_asyncio.fixture
async def viewer_token(test_client, viewer_user):
    """Get viewer authentication token."""
    from app.services.auth import login

    session = await login(viewer_user.email, "password123")
    return session["token"]
