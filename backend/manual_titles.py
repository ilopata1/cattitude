"""Build guest-facing manual title maps from the manual library."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Connection


def build_manual_titles_for_vessel(conn: Connection, vessel_id: str) -> dict[str, str]:
    """Map manual_work.id → title for manuals on equipment linked to this vessel."""
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT mw.id, mw.title
            FROM vessel_equipment ve
            JOIN equipment e ON e.id = ve.equipment_id
            JOIN manual_work mw ON mw.equipment_id = e.id
            WHERE ve.vessel_id = :vessel_id
            ORDER BY mw.title
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchall()
    return {str(row[0]): row[1] for row in rows if row[1]}


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
