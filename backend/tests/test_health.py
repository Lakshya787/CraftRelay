"""
tests/test_health.py — Tests for the /api/v1/health endpoint.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_200(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_response_schema(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    body = response.json()

    assert body["success"] is True
    assert body["data"]["status"] == "ok"
    assert "version" in body["data"]
    assert "environment" in body["data"]
    assert body["message"] == "Service is healthy."


@pytest.mark.asyncio
async def test_health_environment_is_string(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    body = response.json()
    assert isinstance(body["data"]["environment"], str)
