"""
tests/conftest.py — Shared pytest fixtures for the CraftRelay backend.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture()
async def client() -> AsyncClient:
    """Async test client that talks directly to the ASGI app (no live server)."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        yield ac
