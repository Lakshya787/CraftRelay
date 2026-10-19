"""
tests/test_workers.py — Tests for worker profile endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
WORKERS_URL = "/api/v1/workers"


async def _register_and_login(client: AsyncClient, payload: dict) -> str:
    await client.post(REGISTER_URL, json=payload)
    resp = await client.post(
        LOGIN_URL, json={"email": payload["email"], "password": payload["password"]}
    )
    return resp.json()["data"]["access_token"]


WORKER_A = {
    "email": "worker_a@example.com",
    "full_name": "Worker A",
    "password": "SecurePass1!",
    "role": "worker",
}
WORKER_B = {
    "email": "worker_b@example.com",
    "full_name": "Worker B",
    "password": "SecurePass1!",
    "role": "worker",
}
CUSTOMER = {
    "email": "cust@example.com",
    "full_name": "Customer C",
    "password": "SecurePass1!",
    "role": "customer",
}


@pytest.mark.asyncio
async def test_list_workers_returns_200(client: AsyncClient) -> None:
    resp = await client.get(WORKERS_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)


@pytest.mark.asyncio
async def test_list_workers_paginates(client: AsyncClient) -> None:
    # Register two workers
    await _register_and_login(client, WORKER_A)
    await _register_and_login(client, WORKER_B)

    resp = await client.get(WORKERS_URL, params={"page": 1, "page_size": 1})
    body = resp.json()
    assert body["total"] >= 1
    assert len(body["data"]) == 1


@pytest.mark.asyncio
async def test_get_worker_by_id(client: AsyncClient) -> None:
    token = await _register_and_login(client, WORKER_A)

    # Get own profile first to learn the ID
    my_resp = await client.get("/api/v1/workers/me", headers={"Authorization": f"Bearer {token}"})
    worker_id = my_resp.json()["data"]["id"]

    resp = await client.get(f"{WORKERS_URL}/{worker_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == worker_id


@pytest.mark.asyncio
async def test_get_worker_unknown_id_returns_404(client: AsyncClient) -> None:
    resp = await client.get(f"{WORKERS_URL}/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_worker_cannot_update_another_workers_profile(client: AsyncClient) -> None:
    """
    Ownership test: Worker B cannot update Worker A's profile because
    PATCH /workers/me always uses the token's identity, not a path parameter.
    Worker B updating their own profile should not affect Worker A's data.
    """
    token_a = await _register_and_login(client, WORKER_A)
    token_b = await _register_and_login(client, WORKER_B)

    # B updates their own profile
    resp_b = await client.patch(
        "/api/v1/workers/me",
        json={"city": "B-City"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp_b.status_code == 200

    # A's profile should be unchanged
    resp_a = await client.get(
        "/api/v1/workers/me",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp_a.json()["data"].get("city") != "B-City"
