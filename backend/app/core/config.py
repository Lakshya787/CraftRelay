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

    # ── File storage ──────────────────────────────────────────────────────────
    # 'local' for dev; replace with 'gcs' or 's3' for production
    storage_backend: str = "local"
    # Directory for locally-stored evidence files (outside any public dir)
    evidence_storage_dir: str = "./evidence_files"
    # Maximum evidence file size in bytes (default 15 MB)
    max_evidence_file_bytes: int = 15 * 1024 * 1024

    # ── AI Service ────────────────────────────────────────────────────────────
    # Provider: 'none' | 'gemini' | 'openai' | 'mock'
    ai_provider: str = "none"
    ai_api_key: str | None = None
    ai_base_url: str | None = None
    gemini_api_key: str | None = None
    openai_api_key: str | None = None
    ai_model: str = "gemini-1.5-flash"
    ai_timeout_seconds: float = 12.0
    ai_enabled: bool = False

    @property
    def effective_ai_api_key(self) -> str | None:
        """Resolve API key across provider-specific and general env vars."""
        key = self.gemini_api_key or self.openai_api_key or self.ai_api_key
        if key and key.strip() in {"", "CHANGE_ME", "none", "null"}:
            return None
        return key




@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
