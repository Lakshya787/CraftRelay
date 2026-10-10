"""
CraftRelay Backend — Logging configuration.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

from app.core.config import get_settings


def configure_logging() -> None:
    """Configure root logger based on application settings."""
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.DEBUG)

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
    )


def get_logger(name: str) -> logging.Logger:
    """Return a named logger."""
    return logging.getLogger(name)
