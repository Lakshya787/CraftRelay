"""
tests/conftest.py — Shared pytest fixtures for the CraftRelay backend.

Test database strategy
══════════════════════
Tests use an in-memory SQLite database (via aiosqlite) so that:
• No real PostgreSQL instance is required to run the test suite.
• Each test function gets a fresh, isolated schema.
• The async engine matches the production async pattern.

The DATABASE_URL and DATABASE_SYNC_URL environment variables are overridden
before any app code runs, so settings.database_url always points to SQLite
during tests.
"""

from __future__ import annotations

import os

# ── Override DB URLs before importing the app ─────────────────────────────────
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
os.environ["DATABASE_SYNC_URL"] = "sqlite:///./test.db"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-32chars"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.session import get_async_session
from app.main import app

# ── Test engine (SQLite) ──────────────────────────────────────────────────────
TEST_DB_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_database():
    """Create all tables before each test and drop them after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture()
async def db_session() -> AsyncSession:
    """Yield an async session bound to the test engine."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture()
async def client(db_session: AsyncSession) -> AsyncClient:
    """
    Async HTTP test client with the DB dependency overridden to use the
    test SQLite session.
    """

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_async_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
