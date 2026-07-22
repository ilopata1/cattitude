"""Build guest-facing manual title maps from the manual library."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Connection

# Same gate as fragment drafting / Ask scope (Postgres legal_status enum).
CLEARED_MANUAL_LEGAL_STATUS = "cleared"

_VESSEL_CLEARED_MANUALS_SQL = """
SELECT DISTINCT mw.id, mw.title
FROM vessel_equipment ve
JOIN equipment e ON e.id = ve.equipment_id
JOIN manual_work mw ON mw.equipment_id = e.id
JOIN manual_edition me
  ON me.manual_work_id = mw.id AND me.is_current = true
WHERE ve.vessel_id = :vessel_id
  AND mw.legal_status = CAST(:legal_status AS legal_status)
ORDER BY mw.title
"""


def list_manual_ids_for_vessel(conn: Connection, vessel_id: str) -> list[str]:
    """Cleared manuals (current edition) for equipment installed on this vessel.

    Ask retrieval allow-list. Stage-4-only substrate rows without a
    ``vessel_equipment`` install are intentionally excluded.
    """
    rows = conn.execute(
        text(_VESSEL_CLEARED_MANUALS_SQL),
        {
            "vessel_id": vessel_id,
            "legal_status": CLEARED_MANUAL_LEGAL_STATUS,
        },
    ).fetchall()
    return [str(row[0]) for row in rows if row[0]]


def build_manual_titles_for_vessel(conn: Connection, vessel_id: str) -> dict[str, str]:
    """Map manual_work.id → title for cleared manuals on vessel inventory."""
    rows = conn.execute(
        text(_VESSEL_CLEARED_MANUALS_SQL),
        {
            "vessel_id": vessel_id,
            "legal_status": CLEARED_MANUAL_LEGAL_STATUS,
        },
    ).fetchall()
    return {str(row[0]): row[1] for row in rows if row[0] and row[1]}


def _as_uuid(value: str) -> UUID | None:
    try:
        return UUID(str(value).strip())
    except (TypeError, ValueError, AttributeError):
        return None


def lookup_manual_title(conn: Connection, manual_id: str) -> str | None:
    """Resolve a manual_work title by UUID.

    Legacy vector chunks may use slug manual_ids (e.g. garmin_gpsmap_...); those
    are not UUID primary keys and must not be cast — return None so Ask can fall
    back to client-side title formatting.
    """
    work_id = _as_uuid(manual_id)
    if work_id is None:
        return None
    row = conn.execute(
        text("SELECT title FROM manual_work WHERE id = :manual_id"),
        {"manual_id": work_id},
    ).fetchone()
    return row[0] if row else None
