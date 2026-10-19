"""
app/services/storage.py — Storage abstraction layer for evidence files.

Design
──────
StorageBackend is a protocol (structural subtyping) so the local dev
implementation can be swapped for GCS/S3 without changing call sites.

Local-dev backend
  • Stores files in EVIDENCE_STORAGE_DIR (default: ./evidence_files/).
  • Never under static/ or any public directory served by the web server.
  • Filenames are always server-generated UUIDs — client filenames are
    discarded for path operations (stored in original_filename for display only).

Production
  • Set STORAGE_BACKEND=gcs (or s3) and provide the appropriate env vars.
  • Implement GcsStorageBackend / S3StorageBackend in this module and
    update get_storage_backend() to return the correct instance.

Security controls applied here
  • Magic-byte MIME detection (python-magic or fallback via imghdr/struct).
  • Allowlist of accepted MIME types per EvidenceType category.
  • Maximum file size enforced at the service layer (not only in the router).
  • Stored filenames are UUID4 with the server-determined extension.
"""

from __future__ import annotations

import imghdr
import io
import os
import struct
import uuid
from pathlib import Path
from typing import Protocol, runtime_checkable

from app.core.config import get_settings

# ── MIME allowlist ─────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    {
        # Images
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        # Documents
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        # Video (short clips only; size limit is the real guard)
        "video/mp4",
        "video/quicktime",
        "video/webm",
    }
)

# Map magic bytes to MIME types (minimal subset for server-side detection)
_MAGIC: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"RIFF", "image/webp"),       # needs extra check at offset 8
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"%PDF-", "application/pdf"),
    (b"\x50\x4b\x03\x04", None),   # ZIP-based (docx/xlsx) — needs extension
    (b"\xd0\xcf\x11\xe0", "application/msword"),   # old DOC
    (b"\x1a\x45\xdf\xa3", "video/webm"),
    (b"\x00\x00\x00\x18ftypmp4", "video/mp4"),
    (b"\x00\x00\x00\x14ftypqt", "video/quicktime"),
]

_ZIP_OOXML_EXTS: dict[str, str] = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

MAX_FILE_BYTES = 15 * 1024 * 1024  # 15 MB hard cap


def detect_mime_type(data: bytes, original_filename: str = "") -> str | None:
    """
    Detect MIME type from file magic bytes.

    Returns None if the type cannot be determined.
    Does NOT trust the client-supplied filename or Content-Type header.
    """
    header = data[:16]
    for magic, mime in _MAGIC:
        if header.startswith(magic):
            if mime is None:
                # ZIP-based format — use original extension if it is OOXML
                ext = Path(original_filename).suffix.lower()
                return _ZIP_OOXML_EXTS.get(ext)
            # Extra check for WebP: bytes 8-12 must be "WEBP"
            if mime == "image/webp" and data[8:12] != b"WEBP":
                continue
            return mime
    return None


def safe_extension_for_mime(mime: str) -> str:
    """Return a safe file extension for a detected MIME type."""
    _MAP = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "application/pdf": ".pdf",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "text/plain": ".txt",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/webm": ".webm",
    }
    return _MAP.get(mime, ".bin")


# ── Storage protocol ──────────────────────────────────────────────────────────

@runtime_checkable
class StorageBackend(Protocol):
    """Structural interface for pluggable file storage backends."""

    backend_name: str

    def save(self, data: bytes, filename: str) -> None:
        """Persist bytes under the given (server-generated) filename."""
        ...

    def load(self, filename: str) -> bytes:
        """Read and return the file contents."""
        ...

    def delete(self, filename: str) -> None:
        """Remove the file."""
        ...

    def exists(self, filename: str) -> bool:
        """Return True if the file exists in storage."""
        ...


# ── Local filesystem backend ──────────────────────────────────────────────────

class LocalStorageBackend:
    """
    Local-disk storage for development.

    Files are kept in EVIDENCE_STORAGE_DIR which is outside any public
    web-server directory.  Production deployments should replace this with
    a cloud backend.
    """

    backend_name = "local"

    def __init__(self, base_dir: Path) -> None:
        self._base = base_dir
        self._base.mkdir(parents=True, exist_ok=True)

    def _path(self, filename: str) -> Path:
        # Defend against path traversal by using only the basename
        return self._base / Path(filename).name

    def save(self, data: bytes, filename: str) -> None:
        self._path(filename).write_bytes(data)

    def load(self, filename: str) -> bytes:
        return self._path(filename).read_bytes()

    def delete(self, filename: str) -> None:
        p = self._path(filename)
        if p.exists():
            p.unlink()

    def exists(self, filename: str) -> bool:
        return self._path(filename).exists()


# ── Factory ───────────────────────────────────────────────────────────────────

_backend_instance: StorageBackend | None = None


def get_storage_backend() -> StorageBackend:
    """
    Return the configured storage backend (singleton per process).

    Currently only 'local' is implemented.  To add GCS/S3:
      1. Implement a new class satisfying StorageBackend.
      2. Add a branch here keyed on settings.storage_backend.
    """
    global _backend_instance
    if _backend_instance is None:
        settings = get_settings()
        backend_name = getattr(settings, "storage_backend", "local")
        if backend_name == "local":
            storage_dir = Path(getattr(settings, "evidence_storage_dir", "./evidence_files"))
            _backend_instance = LocalStorageBackend(storage_dir)
        else:
            raise ValueError(f"Unknown storage backend: {backend_name!r}")
    return _backend_instance


# ── Upload helper used by the evidence router ─────────────────────────────────

class StorageError(Exception):
    """Raised when a storage operation fails validation or I/O."""


def validate_and_store(
    file_data: bytes,
    original_filename: str,
    storage: StorageBackend | None = None,
) -> dict:
    """
    Validate and store an uploaded evidence file.

    Returns a dict with:
        stored_filename, original_filename, file_size_bytes,
        mime_type, storage_backend

    Raises StorageError on validation failure.
    """
    if storage is None:
        storage = get_storage_backend()

    # Size check
    if len(file_data) == 0:
        raise StorageError("File is empty.")
    if len(file_data) > MAX_FILE_BYTES:
        raise StorageError(
            f"File exceeds the maximum allowed size of {MAX_FILE_BYTES // (1024*1024)} MB."
        )

    # Magic-byte MIME detection (ignores client Content-Type)
    detected_mime = detect_mime_type(file_data, original_filename)
    if detected_mime is None:
        raise StorageError(
            "Could not determine file type. Only images, PDFs, Office documents, and short videos are accepted."
        )
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise StorageError(
            f"File type '{detected_mime}' is not accepted. "
            "Allowed types: JPEG, PNG, WebP, GIF, PDF, Word, Excel, text, MP4, MOV, WebM."
        )

    # Generate a server-side filename (never trust the client filename)
    ext = safe_extension_for_mime(detected_mime)
    stored_filename = f"{uuid.uuid4().hex}{ext}"

    storage.save(file_data, stored_filename)

    return {
        "stored_filename": stored_filename,
        "original_filename": original_filename,
        "file_size_bytes": len(file_data),
        "mime_type": detected_mime,
        "storage_backend": storage.backend_name,
    }
