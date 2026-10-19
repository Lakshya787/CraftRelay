"""
app/db/types.py — Portable column types for cross-dialect compatibility.

``JSONBType`` uses PostgreSQL JSONB in production and falls back to a plain
JSON/TEXT column in SQLite (used for testing). This lets the same ORM models
work under both dialects without any schema changes.
"""

from __future__ import annotations

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator


class JSONBType(TypeDecorator):
    """
    JSONB on PostgreSQL, JSON on every other dialect (e.g. SQLite for tests).

    This is a thin wrapper: on PostgreSQL the actual JSONB type is used,
    giving binary-JSON storage and GIN indexing.  On SQLite the standard
    JSON type is used instead, which is sufficient for testing.
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):  # type: ignore[override]
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())
