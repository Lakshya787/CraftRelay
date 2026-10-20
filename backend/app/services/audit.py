"""
app/services/audit.py — Append-only audit trail helper.

Formal assessment actions (evidence review, criterion decisions, practical
results, final decisions) must record who did what and when. The helper only
adds an AuditLog row to the current session; the caller commits the same
transaction so the action and its audit record succeed or fail together.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


def record_audit(
    db: AsyncSession,
    *,
    actor_id: uuid.UUID | None,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | str | None,
    description: str | None = None,
    payload: dict | None = None,
) -> None:
    """Append an audit record to the session (no commit)."""
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            description=description,
            payload=payload,
        )
    )
