"""
CraftRelay Backend — Application configuration.

All settings are loaded from environment variables (or a .env file).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object — values come from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    app_name: str = "CraftRelay"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = True
    secret_key: str = "CHANGE_ME_to_a_long_random_string_at_least_32_chars"

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = (
        "postgresql+asyncpg://craftrelay_user:CHANGE_ME@localhost:5432/craftrelay_dev"
    )
    database_sync_url: str = (
        "postgresql+psycopg2://craftrelay_user:CHANGE_ME@localhost:5432/craftrelay_dev"
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:8081,http://localhost:19006"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── JWT (placeholder — not wired in Part 1) ──────────────────────────────
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # ── Logging ───────────────────────────────────────────────────────────────
    log_level: str = "DEBUG"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
