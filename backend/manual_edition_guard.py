"""Detect self-declared manual edition and flag filename/admin mismatches.

Founding fixture: mislabeled CZone 2.0 Quick Start V1.0 stored under a v1.1
filename — text declares V1.0 while metadata/filename claim V1.1.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader

# Title-page / running footer edition labels.
_VERSION_PATTERNS = (
    re.compile(
        r"(?i)\b(?:Quick\s+Start\s+Guide|User\s+(?:and\s+Installation\s+)?Manual|"
        r"Installation\s+Manual|Operator(?:'s)?\s+Manual)\s+"
        r"V(?P<ver>\d+(?:\.\d+)*)\b"
    ),
    re.compile(r"(?i)\bV(?P<ver>\d+\.\d+)\s*(?:\||$)"),
    re.compile(r"(?i)\bVersion\s*(?P<ver>\d+(?:\.\d+)*)\b"),
    re.compile(r"(?i)\bRev(?:ision)?\s*(?P<ver>\d+(?:\.\d+)*)\b"),
    re.compile(r"(?i)\b(?P<label>V\d+(?:\.\d+)*)\b"),
)

_FILENAME_VERSION_RE = re.compile(
    r"(?i)(?:^|[_,\-\s])v(?P<ver>\d+(?:\.\d+)*)(?:[_,\-\s.]|$)"
)


def extract_declared_edition(
    pdf_path: str | Path,
    *,
    max_pages: int = 3,
) -> dict[str, Any]:
    """Pull self-declared version from title page + early footers."""
    path = Path(pdf_path)
    reader = PdfReader(str(path))
    page_count = len(reader.pages)
    samples: list[str] = []
    for i, page in enumerate(reader.pages[:max_pages]):
        samples.append(page.extract_text() or "")
    # Also sample last page footer (often carries running version).
    if page_count > max_pages:
        samples.append(reader.pages[-1].extract_text() or "")
    blob = "\n".join(samples)

    versions: list[str] = []
    for pat in _VERSION_PATTERNS:
        for m in pat.finditer(blob):
            ver = (m.groupdict().get("ver") or m.groupdict().get("label") or "").strip()
            ver = ver.lstrip("Vv")
            if ver and ver not in versions:
                versions.append(ver)

    primary = versions[0] if versions else None
    return {
        "declared_version": primary,
        "declared_versions_all": versions,
        "page_count": page_count,
        "sample_chars": len(blob),
        "title_snippet": " ".join((samples[0] if samples else "").split())[:160],
    }


def version_from_filename(filename: str) -> str | None:
    m = _FILENAME_VERSION_RE.search(filename or "")
    if not m:
        return None
    return m.group("ver")


def normalize_edition_token(raw: str | None) -> str:
    t = (raw or "").strip().lower().lstrip("v")
    return t


def check_edition_mismatch(
    *,
    pdf_path: str | Path,
    filename: str | None = None,
    admin_edition_label: str | None = None,
) -> dict[str, Any]:
    """Compare PDF self-declared version to filename / admin edition_label.

    Returns a result dict; ``mismatch`` is True when a disagreement is found.
    """
    path = Path(pdf_path)
    declared = extract_declared_edition(path)
    file_ver = version_from_filename(filename or path.name)
    admin_ver = None
    if admin_edition_label:
        # Prefer explicit V1.1 style tokens in the label.
        m = re.search(r"(?i)\bv?(?P<ver>\d+(?:\.\d+)*)\b", admin_edition_label)
        if m:
            admin_ver = m.group("ver")

    declared_n = normalize_edition_token(declared.get("declared_version"))
    file_n = normalize_edition_token(file_ver)
    admin_n = normalize_edition_token(admin_ver)

    disagreements: list[str] = []
    if declared_n and file_n and declared_n != file_n:
        disagreements.append(
            f"document declares V{declared_n} but filename claims V{file_n}"
        )
    if declared_n and admin_n and declared_n != admin_n:
        disagreements.append(
            f"document declares V{declared_n} but admin edition_label claims V{admin_n}"
        )

    return {
        "mismatch": bool(disagreements),
        "flag": "edition_mismatch" if disagreements else None,
        "detail": "; ".join(disagreements) if disagreements else None,
        "declared": declared,
        "filename_version": file_ver,
        "admin_edition_label": admin_edition_label,
        "admin_version": admin_ver,
    }
