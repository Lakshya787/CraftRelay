"""
app/core/deps.py — FastAPI dependency injectors for authentication and authorization.

Authorization design
═════════════════════
1. The Bearer token is decoded to extract ``sub`` (the user UUID).
2. The user row is fetched from the database — the role comes from there, never
   from the token.
3. Role-specific guards (``require_worker``, ``require_assessor``, etc.) raise
   HTTP 403 when the authenticated user does not hold the expected role.
4. Ownership guards (used in worker-profile and evidence endpoints) compare the
   resource's owner ID with the authenticated user's ID.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_async_session
from app.models.user import User, UserRole

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

DbSession = Annotated[AsyncSession, Depends(get_async_session)]


async def get_current_user(
    token: Annotated[str, Depends(_oauth2_scheme)],
    db: DbSession,
) -> User:
    """
    Extract and validate the Bearer token, then return the matching User row.

    Raises HTTP 401 if:
    • The token is missing, expired, or malformed.
    • The ``sub`` claim does not correspond to an active user.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exc
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exc

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def _role_guard(role: UserRole):
    """Factory that returns a dependency enforcing a specific role."""

    async def _guard(current_user: CurrentUser) -> User:
        if current_user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires the '{role.value}' role.",
            )
        return current_user

    return _guard


# ── Convenience aliases ───────────────────────────────────────────────────────
require_worker = Depends(_role_guard(UserRole.worker))
require_assessor = Depends(_role_guard(UserRole.assessor))
require_customer = Depends(_role_guard(UserRole.customer))
require_admin = Depends(_role_guard(UserRole.admin))


def _multi_role_guard(*roles: UserRole):
    """Factory for endpoints accessible to multiple roles."""

    async def _guard(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            allowed = ", ".join(r.value for r in roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires one of: {allowed}.",
            )
        return current_user

    return Depends(_guard)


require_worker_or_admin = _multi_role_guard(UserRole.worker, UserRole.admin)
require_assessor_or_admin = _multi_role_guard(UserRole.assessor, UserRole.admin)
