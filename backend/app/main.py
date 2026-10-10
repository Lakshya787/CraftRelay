"""
CraftRelay Backend — FastAPI application factory.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import router as api_v1_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.schemas.common import ErrorDetail, ErrorResponse

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — replaces deprecated on_event handlers."""
    settings = get_settings()
    logger.info(
        "CraftRelay API starting up | env=%s | debug=%s",
        settings.app_env,
        settings.debug,
    )
    yield
    logger.info("CraftRelay API shutting down.")


def create_application() -> FastAPI:
    """Construct and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description=(
            "AI-assisted skill assessment and service discovery platform — "
            "Smart India Hackathon edition."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Global exception handler ──────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled exception on %s %s", request.method, request.url)
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                errors=[ErrorDetail(message="An unexpected error occurred.")],
                message="Internal server error.",
            ).model_dump(),
        )

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(api_v1_router)

    return app


app = create_application()
