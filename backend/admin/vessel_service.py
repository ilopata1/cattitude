"""Vessel CRUD, clone, and equipment helpers for admin."""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError


class VesselServiceError(Exception):
    pass


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
    return slug.strip("-") or "vessel"


def list_charter_companies(conn: Connection) -> list[dict[str, str]]:
    rows = conn.execute(
        text("SELECT id, name FROM charter_companies ORDER BY name")
    ).fetchall()
    return [{"id": str(row[0]), "name": row[1]} for row in rows]


def list_operating_bases(
    conn: Connection, *, charter_company_id: str | None = None
) -> list[dict[str, str]]:
    if charter_company_id:
        rows = conn.execute(
            text(
                """
                SELECT b.id, b.name, c.name AS company_name
                FROM charter_operating_bases b
                JOIN charter_companies c ON c.id = b.charter_company_id
                WHERE b.charter_company_id = :charter_id
                ORDER BY b.name
                """
            ),
            {"charter_id": charter_company_id},
        ).fetchall()
    else:
        rows = conn.execute(
            text(
                """
                SELECT b.id, b.name, c.name AS company_name
                FROM charter_operating_bases b
                JOIN charter_companies c ON c.id = b.charter_company_id
                ORDER BY c.name, b.name
                """
            )
        ).fetchall()
    return [
        {
            "id": str(row[0]),
            "name": row[1],
            "company_name": row[2],
            "label": f"{row[2]} — {row[1]}",
        }
        for row in rows
    ]


def get_vessel(conn: Connection, vessel_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT
                v.id, v.name, v.slug, v.vessel_type,
                v.charter_company_id, v.charter_operating_base_id,
                c.name AS company_name,
                b.name AS base_name
            FROM vessels v
            LEFT JOIN charter_companies c ON c.id = v.charter_company_id
            LEFT JOIN charter_operating_bases b ON b.id = v.charter_operating_base_id
            WHERE v.id = :vessel_id
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchone()
    if not row:
        return None
    return {
        "id": str(row[0]),
        "name": row[1],
        "slug": row[2],
        "vessel_type": row[3],
        "charter_company_id": str(row[4]) if row[4] else "",
        "charter_operating_base_id": str(row[5]) if row[5] else "",
        "company_name": row[6],
        "base_name": row[7],
    }


def create_vessel(
    conn: Connection,
    *,
    name: str,
    slug: str,
    vessel_type: str,
    charter_company_id: str | None,
    charter_operating_base_id: str | None,
) -> str:
    name = name.strip()
    slug = slugify(slug or name)
    if not name:
        raise VesselServiceError("Vessel name is required.")

    try:
        row = conn.execute(
            text(
                """
                INSERT INTO vessels (
                    name, slug, charter_company_id,
                    charter_operating_base_id, vessel_type
                )
                VALUES (
                    :name, :slug, :charter_company_id,
                    :charter_operating_base_id, CAST(:vessel_type AS vessel_type)
                )
                RETURNING id
                """
            ),
            {
                "name": name,
                "slug": slug,
                "charter_company_id": charter_company_id or None,
                "charter_operating_base_id": charter_operating_base_id or None,
                "vessel_type": vessel_type,
            },
        ).fetchone()
    except IntegrityError as exc:
        raise VesselServiceError(
            f"Could not create vessel — slug '{slug}' may already be in use."
        ) from exc
    return str(row[0])


def update_vessel(
    conn: Connection,
    vessel_id: str,
    *,
    name: str,
    slug: str,
    vessel_type: str,
    charter_company_id: str | None,
    charter_operating_base_id: str | None,
) -> None:
    name = name.strip()
    slug = slugify(slug or name)
    if not name:
        raise VesselServiceError("Vessel name is required.")

    try:
        result = conn.execute(
            text(
                """
                UPDATE vessels
                SET
                    name = :name,
                    slug = :slug,
                    charter_company_id = :charter_company_id,
                    charter_operating_base_id = :charter_operating_base_id,
                    vessel_type = CAST(:vessel_type AS vessel_type)
                WHERE id = :vessel_id
                """
            ),
            {
                "vessel_id": vessel_id,
                "name": name,
                "slug": slug,
                "charter_company_id": charter_company_id or None,
                "charter_operating_base_id": charter_operating_base_id or None,
                "vessel_type": vessel_type,
            },
        )
    except IntegrityError as exc:
        raise VesselServiceError(
            f"Could not update vessel — slug '{slug}' may already be in use."
        ) from exc
    if result.rowcount == 0:
        raise VesselServiceError("Vessel not found.")


def clone_vessel(
    conn: Connection,
    source_vessel_id: str,
    *,
    name: str,
    slug: str,
    vessel_type: str | None,
    charter_company_id: str | None,
    charter_operating_base_id: str | None,
    copy_equipment: bool,
    copy_guide_modules: bool,
    admin_user: str,
) -> str:
    source = get_vessel(conn, source_vessel_id)
    if source is None:
        raise VesselServiceError("Source vessel not found.")

    new_id = create_vessel(
        conn,
        name=name,
        slug=slug,
        vessel_type=vessel_type or source["vessel_type"],
        charter_company_id=charter_company_id or source["charter_company_id"] or None,
        charter_operating_base_id=(
            charter_operating_base_id or source["charter_operating_base_id"] or None
        ),
    )

    if copy_equipment:
        conn.execute(
            text(
                """
                INSERT INTO vessel_equipment (
                    vessel_id, equipment_id, zone_instance, confirmed_by
                )
                SELECT :new_id, equipment_id, zone_instance, confirmed_by
                FROM vessel_equipment
                WHERE vessel_id = :source_id
                ON CONFLICT (vessel_id, equipment_id, zone_instance) DO NOTHING
                """
            ),
            {"new_id": new_id, "source_id": source_vessel_id},
        )

    if copy_guide_modules:
        rows = conn.execute(
            text(
                """
                SELECT DISTINCT ON (content_type, content_key)
                    content_type, content_key, payload
                FROM guide_content
                WHERE vessel_id = :source_id
                  AND status IN ('approved', 'published')
                ORDER BY content_type, content_key, created_at DESC
                """
            ),
            {"source_id": source_vessel_id},
        ).fetchall()
        for row in rows:
            payload = row[2]
            if not isinstance(payload, (dict, list)):
                payload = json.loads(payload)
            conn.execute(
                text(
                    """
                    INSERT INTO guide_content (
                        vessel_id, content_type, content_key, payload,
                        source, status, approved_at, approved_by
                    )
                    VALUES (
                        :vessel_id, :content_type, :content_key, CAST(:payload AS jsonb),
                        'imported', 'approved', now(), :approved_by
                    )
                    """
                ),
                {
                    "vessel_id": new_id,
                    "content_type": row[0],
                    "content_key": row[1],
                    "payload": json.dumps(payload),
                    "approved_by": admin_user,
                },
            )

    return new_id


def list_vessel_equipment(conn: Connection, vessel_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT
                ve.equipment_id, ve.zone_instance, ve.confirmed_by,
                e.manufacturer, e.model, e.system_category, e.zone
            FROM vessel_equipment ve
            JOIN equipment e ON e.id = ve.equipment_id
            WHERE ve.vessel_id = :vessel_id
            ORDER BY e.system_category, e.manufacturer, e.model
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchall()
    return [
        {
            "equipment_id": str(row[0]),
            "zone_instance": row[1],
            "confirmed_by": row[2],
            "manufacturer": row[3],
            "model": row[4],
            "system_category": row[5],
            "zone": row[6],
        }
        for row in rows
    ]


def search_equipment(
    conn: Connection,
    *,
    query: str = "",
    system_category: str = "",
    vessel_type: str = "",
    limit: int = 50,
) -> list[dict[str, Any]]:
    clauses = ["TRUE"]
    params: dict[str, Any] = {"limit": limit}

    if query.strip():
        clauses.append(
            "(manufacturer ILIKE :query_pattern OR model ILIKE :query_pattern)"
        )
        params["query_pattern"] = f"%{query.strip()}%"

    if system_category:
        clauses.append("system_category = CAST(:system_category AS system_category)")
        params["system_category"] = system_category

    if vessel_type:
        clauses.append("CAST(:vessel_type AS vessel_type) = ANY(vessel_types)")
        params["vessel_type"] = vessel_type

    sql = f"""
        SELECT id, manufacturer, model, system_category, zone, equipment_class
        FROM equipment
        WHERE {' AND '.join(clauses)}
        ORDER BY manufacturer, model
        LIMIT :limit
    """
    rows = conn.execute(text(sql), params).fetchall()
    return [
        {
            "id": str(row[0]),
            "manufacturer": row[1],
            "model": row[2],
            "system_category": row[3],
            "zone": row[4],
            "equipment_class": row[5],
        }
        for row in rows
    ]


def add_vessel_equipment(
    conn: Connection,
    vessel_id: str,
    equipment_id: str,
    *,
    confirmed_by: str = "team_verified",
) -> None:
    conn.execute(
        text(
            """
            INSERT INTO vessel_equipment (vessel_id, equipment_id, confirmed_by)
            VALUES (:vessel_id, :equipment_id, CAST(:confirmed_by AS confirmed_by_method))
            ON CONFLICT (vessel_id, equipment_id, zone_instance) DO NOTHING
            """
        ),
        {
            "vessel_id": vessel_id,
            "equipment_id": equipment_id,
            "confirmed_by": confirmed_by,
        },
    )


def remove_vessel_equipment(
    conn: Connection, vessel_id: str, equipment_id: str
) -> None:
    conn.execute(
        text(
            """
            DELETE FROM vessel_equipment
            WHERE vessel_id = :vessel_id AND equipment_id = :equipment_id
            """
        ),
        {"vessel_id": vessel_id, "equipment_id": equipment_id},
    )


def list_option_packs(conn: Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT id, manufacturer, pack_name, applicable_models, bill_of_materials
            FROM option_pack
            ORDER BY manufacturer, pack_name
            """
        )
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "manufacturer": row[1],
            "pack_name": row[2],
            "applicable_models": row[3] or [],
            "bill_count": len(row[4] or []),
        }
        for row in rows
    ]


def apply_option_pack(
    conn: Connection, vessel_id: str, option_pack_id: str
) -> int:
    row = conn.execute(
        text(
            """
            SELECT bill_of_materials FROM option_pack WHERE id = :pack_id
            """
        ),
        {"pack_id": option_pack_id},
    ).fetchone()
    if not row or not row[0]:
        raise VesselServiceError("Option pack not found or has no bill of materials.")

    added = 0
    for equipment_id in row[0]:
        result = conn.execute(
            text(
                """
                INSERT INTO vessel_equipment (vessel_id, equipment_id, confirmed_by)
                VALUES (
                    :vessel_id, :equipment_id,
                    CAST('config_match' AS confirmed_by_method)
                )
                ON CONFLICT (vessel_id, equipment_id, zone_instance) DO NOTHING
                RETURNING equipment_id
                """
            ),
            {"vessel_id": vessel_id, "equipment_id": str(equipment_id)},
        ).fetchone()
        if result:
            added += 1
    return added
