"""
app/core/security.py — Password hashing and JWT token utilities.

Security guarantees:
• Passwords are hashed with bcrypt (via passlib) — never stored in plaintext.
• JWT tokens are signed with the application SECRET_KEY using HS256.
• Token payloads carry only the user UUID and a type field; the role is
  looked up from the database on each request, not trusted from the token.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

_settings = get_settings()

# ── Password hashing ──────────────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of *plain_password*."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches *hashed_password*."""
    return _pwd_context.verify(plain_password, hashed_password)


# ── JWT ───────────────────────────────────────────────────────────────────────
_ALGORITHM = _settings.jwt_algorithm
_SECRET_KEY = _settings.secret_key


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a signed JWT access token.

    Parameters
    ----------
    subject:
        The ``sub`` claim — always the user's UUID as a string.
    extra_claims:
        Additional payload fields (e.g. ``{"type": "access"}``).
        **Never** put the role here — always resolve it from the database.
    expires_delta:
        Override the default expiry window.
    """
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        or timedelta(minutes=_settings.jwt_access_token_expire_minutes)
    )
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, _SECRET_KEY, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT access token.

    Raises
    ------
    JWTError
        If the token is invalid, expired, or tampered with.
    """
    return jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
