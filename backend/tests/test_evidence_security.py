"""Evidence upload and ownership security regression tests."""

from __future__ import annotations

import io
import uuid
from datetime import timedelta

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token

BASE = "/api/v1"


async def _register(client: AsyncClient, email: str, role: str = "worker") -> str:
    password = "SecurePass1!"
    response = await client.post(
        f"{BASE}/auth/register",
        json={"email": email, "full_name": email.split("@")[0], "password": password, "role": role},
    )
    assert response.status_code == 201
    login = await client.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    return login.json()["data"]["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_evidence_requires_auth_and_rejects_invalid_file(client: AsyncClient) -> None:
    unauthorized = await client.get(f"{BASE}/evidence/me")
    assert unauthorized.status_code == 401

    token = await _register(client, "upload-owner@example.com")
    upload = await client.post(
        f"{BASE}/evidence/upload",
        files={"file": ("payload.exe", io.BytesIO(b"not a supported file"), "image/jpeg")},
        data={"title": "Invalid upload", "evidence_type": "photo"},
        headers=_auth(token),
    )
    assert upload.status_code == 422


@pytest.mark.asyncio
async def test_worker_cannot_read_another_workers_private_evidence(client: AsyncClient) -> None:
    owner = await _register(client, "private-owner@example.com")
    other = await _register(client, "private-other@example.com")
    customer = await _register(client, "private-customer@example.com", role="customer")
    created = await client.post(
        f"{BASE}/evidence/url",
        json={"title": "Private evidence", "url": "https://example.org/evidence"},
        headers=_auth(owner),
    )
    assert created.status_code == 201
    evidence_id = created.json()["data"]["id"]

    detail = await client.get(f"{BASE}/evidence/{evidence_id}", headers=_auth(other))
    download = await client.get(f"{BASE}/evidence/{evidence_id}/download", headers=_auth(other))
    customer_detail = await client.get(
        f"{BASE}/evidence/{evidence_id}", headers=_auth(customer)
    )
    assert detail.status_code == 403
    assert download.status_code == 403
    assert customer_detail.status_code == 403


@pytest.mark.asyncio
async def test_evidence_rejects_nonexistent_criterion_id(client: AsyncClient) -> None:
    token = await _register(client, "invalid-criterion@example.com")
    response = await client.post(
        f"{BASE}/evidence/url",
        json={
            "title": "Evidence with invalid criterion",
            "url": "https://example.org/evidence",
            "criterion_id": str(uuid.uuid4()),
        },
        headers=_auth(token),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_evidence_submission_is_idempotent(client: AsyncClient) -> None:
    token = await _register(client, "idempotent-evidence@example.com")
    headers = {**_auth(token), "Idempotency-Key": "evidence-draft-123"}
    payload = {"title": "Retry-safe evidence", "url": "https://example.org/evidence"}
    first = await client.post(f"{BASE}/evidence/url", json=payload, headers=headers)
    retry = await client.post(f"{BASE}/evidence/url", json=payload, headers=headers)
    assert first.status_code == retry.status_code == 201
    assert first.json()["data"]["id"] == retry.json()["data"]["id"]


@pytest.mark.asyncio
async def test_expired_access_token_is_rejected(client: AsyncClient) -> None:
    token = await _register(client, "expired-token@example.com")
    me = await client.get(f"{BASE}/auth/me", headers=_auth(token))
    assert me.status_code == 200
    expired = create_access_token(
        me.json()["data"]["id"], expires_delta=timedelta(seconds=-1)
    )
    response = await client.get(f"{BASE}/auth/me", headers=_auth(expired))
    assert response.status_code == 401
