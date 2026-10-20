"""
app/db/types.py — Portable column types for cross-dialect compatibility.

``JSONBType`` uses PostgreSQL JSONB in production and falls back to a plain
JSON/TEXT column in SQLite (used for testing).

``UUIDType`` uses the native UUID type on PostgreSQL and a CHAR(36) column
on SQLite, ensuring correct sentinel handling in SQLAlchemy's
``insertmanyvalues`` batch optimisation — which would otherwise mis-identify
a float column as the UUID sentinel and raise AttributeError.
"""

from __future__ import annotations

import uuid as _uuid

from sqlalchemy import JSON, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
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


class UUIDType(TypeDecorator):
    """
    Cross-dialect UUID column.

    • PostgreSQL: native UUID column (pg dialect handles as_uuid natively).
    • SQLite / other: CHAR(36) storing the canonical hyphenated string form.

    This avoids the SQLAlchemy ``insertmanyvalues`` sentinel confusion that
    occurs when a float column appears after a UUID primary-key column in
    SQLite batch inserts.
    """

    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):  # type: ignore[override]
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):  # type: ignore[override]
        if value is None:
            return value
        if dialect.name == "postgresql":
            # asyncpg / psycopg2 accept UUID objects natively
            if isinstance(value, _uuid.UUID):
                return value
            return _uuid.UUID(str(value))
        # SQLite: store as plain string
        if isinstance(value, _uuid.UUID):
            return str(value)
        return str(_uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):  # type: ignore[override]
        if value is None:
            return value
        if isinstance(value, _uuid.UUID):
            return value
        return _uuid.UUID(str(value))
