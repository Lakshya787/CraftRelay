"""
tests/test_auth.py — Tests for authentication endpoints.

Covers:
• Registration (happy path, duplicate email, invalid password, admin self-reg)
• Login (happy path, wrong password, unknown email)
• GET /me (valid token, missing token, invalid token)
• Role-based authorization guard
• Profile ownership guard
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
ME_URL = "/api/v1/auth/me"
WORKERS_ME_URL = "/api/v1/workers/me"
PATCH_WORKER_URL = "/api/v1/workers/me"

WORKER_PAYLOAD = {
    "email": "testworker@example.com",
    "full_name": "Test Worker",
    "password": "SecurePass1!",
    "role": "worker",
}

ASSESSOR_PAYLOAD = {
    "email": "testassessor@example.com",
    "full_name": "Test Assessor",
    "password": "SecurePass1!",
    "role": "assessor",
}

CUSTOMER_PAYLOAD = {
    "email": "testcustomer@example.com",
    "full_name": "Test Customer",
    "password": "SecurePass1!",
    "role": "customer",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _register_and_login(client: AsyncClient, payload: dict) -> str:
    """Register a user and return their access token."""
    await client.post(REGISTER_URL, json=payload)
    resp = await client.post(
        LOGIN_URL, json={"email": payload["email"], "password": payload["password"]}
    )
    return resp.json()["data"]["access_token"]


# ── Registration ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_worker_returns_201(client: AsyncClient) -> None:
    resp = await client.post(REGISTER_URL, json=WORKER_PAYLOAD)
    assert resp.status_code == 201
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["email"] == WORKER_PAYLOAD["email"]
    assert body["data"]["role"] == "worker"


@pytest.mark.asyncio
async def test_register_does_not_return_password(client: AsyncClient) -> None:
    resp = await client.post(REGISTER_URL, json=WORKER_PAYLOAD)
    body = resp.json()
    assert "password" not in body["data"]
    assert "password_hash" not in body["data"]


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client: AsyncClient) -> None:
    await client.post(REGISTER_URL, json=WORKER_PAYLOAD)
    resp = await client.post(REGISTER_URL, json=WORKER_PAYLOAD)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_short_password_returns_422(client: AsyncClient) -> None:
    payload = {**WORKER_PAYLOAD, "password": "short"}
    resp = await client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email_returns_422(client: AsyncClient) -> None:
    payload = {**WORKER_PAYLOAD, "email": "not-an-email"}
    resp = await client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_as_admin_is_rejected(client: AsyncClient) -> None:
    """Self-registration as admin must be blocked at the schema layer."""
    payload = {**WORKER_PAYLOAD, "role": "admin"}
    resp = await client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_role_returns_422(client: AsyncClient) -> None:
    payload = {**WORKER_PAYLOAD, "role": "superuser"}
    resp = await client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_returns_access_token(client: AsyncClient) -> None:
    await client.post(REGISTER_URL, json=WORKER_PAYLOAD)
    resp = await client.post(
        LOGIN_URL, json={"email": WORKER_PAYLOAD["email"], "password": WORKER_PAYLOAD["password"]}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert "access_token" in body["data"]
    assert body["data"]["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client: AsyncClient) -> None:
    await client.post(REGISTER_URL, json=WORKER_PAYLOAD)
    resp = await client.post(
        LOGIN_URL, json={"email": WORKER_PAYLOAD["email"], "password": "wrongpassword"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client: AsyncClient) -> None:
    resp = await client.post(
        LOGIN_URL, json={"email": "nobody@example.com", "password": "whatever"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_error_message_is_generic(client: AsyncClient) -> None:
    """Prevent user enumeration — same message for wrong email and wrong password."""
    resp1 = await client.post(
        LOGIN_URL, json={"email": "nobody@example.com", "password": "anything"}
    )
    await client.post(REGISTER_URL, json=WORKER_PAYLOAD)
    resp2 = await client.post(
        LOGIN_URL, json={"email": WORKER_PAYLOAD["email"], "password": "wrongpass"}
    )
    assert resp1.json()["detail"] == resp2.json()["detail"]


# ── GET /me ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient) -> None:
    token = await _register_and_login(client, WORKER_PAYLOAD)
    resp = await client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == WORKER_PAYLOAD["email"]


@pytest.mark.asyncio
async def test_get_me_unauthenticated_returns_401(client: AsyncClient) -> None:
    resp = await client.get(ME_URL)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token_returns_401(client: AsyncClient) -> None:
    resp = await client.get(ME_URL, headers={"Authorization": "Bearer this.is.invalid"})
    assert resp.status_code == 401


# ── Role-based authorization ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_patch_worker_me_requires_worker_role(client: AsyncClient) -> None:
    """PATCH /workers/me must reject a customer token."""
    token = await _register_and_login(client, CUSTOMER_PAYLOAD)
    resp = await client.patch(
        PATCH_WORKER_URL,
        json={"city": "Delhi"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_patch_worker_me_succeeds_for_worker(client: AsyncClient) -> None:
    token = await _register_and_login(client, WORKER_PAYLOAD)
    resp = await client.patch(
        PATCH_WORKER_URL,
        json={"city": "Chennai", "trade_title": "Electrician"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["city"] == "Chennai"


@pytest.mark.asyncio
async def test_patch_worker_me_unauthenticated_returns_401(client: AsyncClient) -> None:
    resp = await client.patch(PATCH_WORKER_URL, json={"city": "Mumbai"})
    assert resp.status_code == 401


# ── Persistence ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_registered_user_persists_across_requests(client: AsyncClient) -> None:
    """User created in one request is visible in the next."""
    await client.post(REGISTER_URL, json=WORKER_PAYLOAD)
    resp = await client.post(
        LOGIN_URL, json={"email": WORKER_PAYLOAD["email"], "password": WORKER_PAYLOAD["password"]}
    )
    assert resp.status_code == 200


# ── Data integrity ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_worker_profile_auto_created_on_register(client: AsyncClient) -> None:
    """A WorkerProfile row must exist immediately after worker registration."""
    token = await _register_and_login(client, WORKER_PAYLOAD)
    resp = await client.get(
        WORKERS_ME_URL,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["user_id"] is not None


@pytest.mark.asyncio
async def test_assessor_has_no_worker_profile(client: AsyncClient) -> None:
    """An assessor's /workers/me must return 403."""
    token = await _register_and_login(client, ASSESSOR_PAYLOAD)
    resp = await client.get(
        WORKERS_ME_URL,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
