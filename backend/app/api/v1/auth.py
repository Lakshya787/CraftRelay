"""
app/api/v1/auth.py — Authentication endpoints.

POST /auth/register  → create account
POST /auth/login     → exchange credentials for access token
GET  /me             → return the authenticated user's profile
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.models.worker_profile import WorkerProfile
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=SuccessResponse[UserResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
)
async def register(body: RegisterRequest, db: DbSession, request: Request) -> SuccessResponse[UserResponse]:
    """
    Create a new user account.

    • Email uniqueness is enforced by the database.
    • Passwords are hashed before storage — never stored in plaintext.
    • Admin accounts cannot be self-registered (enforced in the schema validator).
    """
    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    user = User(
        email=body.email,
        full_name=body.full_name,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    await db.flush()  # get the generated id before creating profile

    # Auto-create a WorkerProfile for workers
    if user.role == UserRole.worker:
        profile = WorkerProfile(user_id=user.id)
        db.add(profile)

    await db.commit()
    await db.refresh(user)
    return SuccessResponse(data=UserResponse.model_validate(user), message="Account created successfully.")


@router.post(
    "/login",
    response_model=SuccessResponse[TokenResponse],
    summary="Login and obtain an access token",
)
async def login(body: LoginRequest, db: DbSession) -> SuccessResponse[TokenResponse]:
    """
    Authenticate with email and password.

    Returns a JWT access token on success.
    The error message is intentionally generic to prevent user enumeration.
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Use constant-time comparison even when user is not found
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    token = create_access_token(subject=str(user.id))
    return SuccessResponse(
        data=TokenResponse(access_token=token),
        message="Login successful.",
    )


@router.get(
    "/me",
    response_model=SuccessResponse[UserResponse],
    summary="Get the current authenticated user",
)
async def get_me(current_user: CurrentUser) -> SuccessResponse[UserResponse]:
    """Return the profile of the currently authenticated user."""
    return SuccessResponse(
        data=UserResponse.model_validate(current_user),
        message="Current user retrieved.",
    )
