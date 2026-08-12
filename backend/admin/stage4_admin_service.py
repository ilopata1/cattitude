"""Thin admin helpers for Stage 4 plant rows (guest_role / guest_label).

Edits ``vessel_stage4_equipment.row`` JSONB only — not registry
``vessel_equipment``. See ``guide-stage4-class-role-design-note.md`` Decision B.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from guide_plant_class import profile_plant_class


class Stage4AdminError(Exception):
    pass


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return {}


def list_vessel_stage4_plant(conn: Connection, vessel_id: str) -> list[dict[str, Any]]:
    """Return Stage 4 plant rows with guest fields + read-only plant_class."""
    rows = conn.execute(
        text(
            """
            SELECT
                vse.id::text,
                vse.device_key,
                vse.profile_key,
                vse.ordinal,
                vse.row,
                ip.profile
            FROM vessel_stage4_equipment vse
            LEFT JOIN interaction_profile ip
              ON ip.profile_key = vse.profile_key
            WHERE vse.vessel_id = CAST(:vessel_id AS uuid)
            ORDER BY vse.ordinal, vse.device_key
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchall()

    out: list[dict[str, Any]] = []
    for row in rows:
        payload = _as_dict(row[4])
        profile = _as_dict(row[5]) if row[5] is not None else {}
        guest_label = payload.get("guest_label")
        if not isinstance(guest_label, dict):
            guest_label = {}
        out.append(
            {
                "id": row[0],
                "device_key": row[1],
                "profile_key": row[2],
                "ordinal": row[3],
                "manufacturer": str(payload.get("manufacturer") or "").strip(),
                "model": str(payload.get("model") or "").strip(),
                "guest_role": str(payload.get("guest_role") or "").strip(),
                "guest_label_manufacturer": str(
                    guest_label.get("manufacturer") or ""
                ).strip(),
                "guest_label_model": str(guest_label.get("model") or "").strip(),
                "plant_class": profile_plant_class(profile) or "",
                "instance_roles": [
                    {
                        "instance_key": str(inst.get("instance_key") or ""),
                        "guest_role": str(inst.get("guest_role") or "").strip(),
                    }
                    for inst in (payload.get("instances") or [])
                    if isinstance(inst, dict) and inst.get("instance_key")
                ],
            }
        )
    return out


def update_stage4_equipment_guest_fields(
    conn: Connection,
    vessel_id: str,
    row_id: str,
    *,
    guest_role: str,
    guest_label_manufacturer: str,
    guest_label_model: str,
) -> None:
    """Read-modify-write guest_role / guest_label on a Stage 4 plant row."""
    existing = conn.execute(
        text(
            """
            SELECT row
            FROM vessel_stage4_equipment
            WHERE id = CAST(:row_id AS uuid)
              AND vessel_id = CAST(:vessel_id AS uuid)
            """
        ),
        {"row_id": row_id, "vessel_id": vessel_id},
    ).fetchone()
    if not existing:
        raise Stage4AdminError("Stage 4 plant row not found for this vessel")

    payload = _as_dict(existing[0])
    role = (guest_role or "").strip()
    if role:
        payload["guest_role"] = role
    else:
        payload.pop("guest_role", None)

    mfr = (guest_label_manufacturer or "").strip()
    mdl = (guest_label_model or "").strip()
    if mfr or mdl:
        payload["guest_label"] = {"manufacturer": mfr, "model": mdl}
    else:
        payload.pop("guest_label", None)

    conn.execute(
        text(
            """
            UPDATE vessel_stage4_equipment
            SET row = CAST(:row AS jsonb)
            WHERE id = CAST(:row_id AS uuid)
              AND vessel_id = CAST(:vessel_id AS uuid)
            """
        ),
        {
            "row": json.dumps(payload, ensure_ascii=False),
            "row_id": row_id,
            "vessel_id": vessel_id,
        },
    )
