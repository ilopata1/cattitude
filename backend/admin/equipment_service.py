"""Equipment registry CRUD and constraints for admin."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from admin.enums import (
    CONFIGURATION_TIERS,
    CONSTRAINT_TYPES,
    EQUIPMENT_CLASSES,
    IDENTIFICATION_METHODS,
    PACK_SOURCES,
    SYSTEM_CATEGORIES,
    VESSEL_TYPES,
    ZONE_CARDINALITIES,
    ZONES,
)

PER_PAGE = 50


class EquipmentServiceError(Exception):
    pass


def _validate_choice(value: str, allowed: list[str], field: str) -> str:
    if value not in allowed:
        raise EquipmentServiceError(f"Invalid {field}: {value}")
    return value


def list_distinct_manufacturers(conn: Connection) -> list[str]:
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT manufacturer
            FROM equipment
            WHERE manufacturer IS NOT NULL AND manufacturer <> ''
            ORDER BY manufacturer
            """
        )
    ).fetchall()
    return [row[0] for row in rows]


def count_equipment(
    conn: Connection,
    *,
    manufacturer: str = "",
    system_category: str = "",
    equipment_class: str = "",
    query: str = "",
    has_manual: str = "",
    has_fragment: str = "",
) -> int:
    clauses, params = _list_filters(
        manufacturer=manufacturer,
        system_category=system_category,
        equipment_class=equipment_class,
        query=query,
        has_manual=has_manual,
        has_fragment=has_fragment,
    )
    return int(
        conn.execute(
            text(f"SELECT COUNT(*) FROM equipment WHERE {' AND '.join(clauses)}"),
            params,
        ).scalar()
        or 0
    )


def _list_filters(
    *,
    manufacturer: str = "",
    system_category: str = "",
    equipment_class: str = "",
    query: str = "",
    has_manual: str = "",
    has_fragment: str = "",
) -> tuple[list[str], dict[str, Any]]:
    clauses = ["TRUE"]
    params: dict[str, Any] = {}

    if manufacturer.strip():
        clauses.append("manufacturer ILIKE :manufacturer_pattern")
        params["manufacturer_pattern"] = f"%{manufacturer.strip()}%"

    if query.strip():
        clauses.append(
            "(manufacturer ILIKE :query_pattern OR model ILIKE :query_pattern)"
        )
        params["query_pattern"] = f"%{query.strip()}%"

    if system_category:
        clauses.append("system_category = CAST(:system_category AS system_category)")
        params["system_category"] = system_category

    if equipment_class:
        clauses.append("equipment_class = CAST(:equipment_class AS equipment_class)")
        params["equipment_class"] = equipment_class

    if has_manual == "yes":
        clauses.append(
            """
            EXISTS (
                SELECT 1 FROM manual_work mw
                WHERE mw.equipment_id = equipment.id
            )
            """
        )
    elif has_manual == "no":
        clauses.append(
            """
            NOT EXISTS (
                SELECT 1 FROM manual_work mw
                WHERE mw.equipment_id = equipment.id
            )
            """
        )

    if has_fragment == "yes":
        clauses.append(
            """
            EXISTS (
                SELECT 1 FROM equipment_guide_fragment f
                WHERE f.equipment_id = equipment.id AND f.is_active
            )
            """
        )
    elif has_fragment == "no":
        clauses.append(
            """
            NOT EXISTS (
                SELECT 1 FROM equipment_guide_fragment f
                WHERE f.equipment_id = equipment.id AND f.is_active
            )
            """
        )

    return clauses, params


def list_equipment(
    conn: Connection,
    *,
    manufacturer: str = "",
    system_category: str = "",
    equipment_class: str = "",
    query: str = "",
    has_manual: str = "",
    has_fragment: str = "",
    page: int = 1,
    per_page: int = PER_PAGE,
) -> list[dict[str, Any]]:
    clauses, params = _list_filters(
        manufacturer=manufacturer,
        system_category=system_category,
        equipment_class=equipment_class,
        query=query,
        has_manual=has_manual,
        has_fragment=has_fragment,
    )
    offset = max(page - 1, 0) * per_page
    params["limit"] = per_page
    params["offset"] = offset

    rows = conn.execute(
        text(
            f"""
            SELECT
                equipment.id,
                equipment.manufacturer,
                equipment.model,
                equipment.system_category,
                equipment.equipment_class,
                equipment.configuration_tier,
                equipment.has_formal_manual,
                EXISTS (
                    SELECT 1 FROM manual_work mw
                    WHERE mw.equipment_id = equipment.id
                ) AS has_manual_library,
                (
                    SELECT f.status
                    FROM equipment_guide_fragment f
                    WHERE f.equipment_id = equipment.id AND f.is_active
                    LIMIT 1
                ) AS fragment_status
            FROM equipment
            WHERE {' AND '.join(clauses)}
            ORDER BY equipment.manufacturer, equipment.model
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "manufacturer": row[1],
            "model": row[2],
            "system_category": row[3],
            "equipment_class": row[4],
            "configuration_tier": row[5],
            "has_formal_manual": row[6],
            "has_manual_library": bool(row[7]),
            "fragment_status": row[8],
        }
        for row in rows
    ]


def _row_to_equipment(row: Any) -> dict[str, Any]:
    return {
        "id": str(row[0]),
        "manufacturer": row[1],
        "model": row[2],
        "vessel_types": list(row[3] or []),
        "zone": row[4],
        "zone_cardinality": row[5],
        "system_category": row[6],
        "equipment_class": row[7],
        "configuration_tier": row[8],
        "has_formal_manual": row[9],
        "identification_method": row[10],
        "created_at": row[11],
    }


def get_equipment(conn: Connection, equipment_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT
                id, manufacturer, model, vessel_types, zone, zone_cardinality,
                system_category, equipment_class, configuration_tier,
                has_formal_manual, identification_method, created_at
            FROM equipment
            WHERE id = :id
            """
        ),
        {"id": equipment_id},
    ).fetchone()
    if row is None:
        return None
    return _row_to_equipment(row)


def find_equipment_by_manufacturer_model(
    conn: Connection,
    manufacturer: str,
    model: str,
    *,
    exclude_id: str | None = None,
) -> dict[str, Any] | None:
    clauses = [
        "LOWER(TRIM(manufacturer)) = LOWER(TRIM(:manufacturer))",
        "LOWER(TRIM(model)) = LOWER(TRIM(:model))",
    ]
    params: dict[str, Any] = {
        "manufacturer": manufacturer,
        "model": model,
    }
    if exclude_id:
        clauses.append("id <> :exclude_id")
        params["exclude_id"] = exclude_id

    row = conn.execute(
        text(
            f"""
            SELECT
                id, manufacturer, model, vessel_types, zone, zone_cardinality,
                system_category, equipment_class, configuration_tier,
                has_formal_manual, identification_method, created_at
            FROM equipment
            WHERE {' AND '.join(clauses)}
            LIMIT 1
            """
        ),
        params,
    ).fetchone()
    if row is None:
        return None
    return _row_to_equipment(row)


def search_equipment_autocomplete(
    conn: Connection, query: str, *, limit: int = 20
) -> list[dict[str, str]]:
    if not query.strip():
        return []

    rows = conn.execute(
        text(
            """
            SELECT id, manufacturer, model
            FROM equipment
            WHERE manufacturer ILIKE :pattern OR model ILIKE :pattern
            ORDER BY manufacturer, model
            LIMIT :limit
            """
        ),
        {"pattern": f"%{query.strip()}%", "limit": limit},
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "label": f"{row[1] or '—'} — {row[2] or '—'}",
        }
        for row in rows
    ]


def _equipment_params(data: dict[str, Any]) -> dict[str, Any]:
    vessel_types = data.get("vessel_types") or []
    if not vessel_types:
        raise EquipmentServiceError("At least one vessel type is required.")

    manufacturer = (data.get("manufacturer") or "").strip()
    model = (data.get("model") or "").strip()
    if not manufacturer or not model:
        raise EquipmentServiceError("Manufacturer and model are required.")

    return {
        "manufacturer": manufacturer,
        "model": model,
        "vessel_types": vessel_types,
        "zone": _validate_choice(data["zone"], ZONES, "zone"),
        "zone_cardinality": _validate_choice(
            data.get("zone_cardinality") or "fixed", ZONE_CARDINALITIES, "zone_cardinality"
        ),
        "system_category": _validate_choice(
            data["system_category"], SYSTEM_CATEGORIES, "system_category"
        ),
        "equipment_class": _validate_choice(
            data["equipment_class"], EQUIPMENT_CLASSES, "equipment_class"
        ),
        "configuration_tier": _validate_choice(
            data["configuration_tier"], CONFIGURATION_TIERS, "configuration_tier"
        ),
        "identification_method": _validate_choice(
            data["identification_method"], IDENTIFICATION_METHODS, "identification_method"
        ),
        "has_formal_manual": bool(data.get("has_formal_manual")),
    }


def create_equipment(conn: Connection, data: dict[str, Any]) -> str:
    params = _equipment_params(data)
    inserted = conn.execute(
        text(
            """
            INSERT INTO equipment (
                manufacturer, model, vessel_types, zone, zone_cardinality,
                system_category, equipment_class, configuration_tier,
                has_formal_manual, identification_method
            )
            VALUES (
                :manufacturer, :model,
                CAST(:vessel_types AS vessel_type[]),
                CAST(:zone AS zone),
                CAST(:zone_cardinality AS zone_cardinality),
                CAST(:system_category AS system_category),
                CAST(:equipment_class AS equipment_class),
                CAST(:configuration_tier AS configuration_tier),
                :has_formal_manual,
                CAST(:identification_method AS identification_method)
            )
            RETURNING id
            """
        ),
        params,
    ).fetchone()
    return str(inserted[0])


def update_equipment(conn: Connection, equipment_id: str, data: dict[str, Any]) -> None:
    params = _equipment_params(data)
    result = conn.execute(
        text(
            """
            UPDATE equipment
            SET
                manufacturer = :manufacturer,
                model = :model,
                vessel_types = CAST(:vessel_types AS vessel_type[]),
                zone = CAST(:zone AS zone),
                zone_cardinality = CAST(:zone_cardinality AS zone_cardinality),
                system_category = CAST(:system_category AS system_category),
                equipment_class = CAST(:equipment_class AS equipment_class),
                configuration_tier = CAST(:configuration_tier AS configuration_tier),
                has_formal_manual = :has_formal_manual,
                identification_method = CAST(:identification_method AS identification_method)
            WHERE id = :id
            """
        ),
        {**params, "id": equipment_id},
    )
    if result.rowcount == 0:
        raise EquipmentServiceError("Equipment not found.")


def list_equipment_option_packs(
    conn: Connection, equipment_id: str
) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT op.id, op.manufacturer, op.pack_name, op.source
            FROM option_pack_equipment ope
            JOIN option_pack op ON op.id = ope.option_pack_id
            WHERE ope.equipment_id = :equipment_id
            ORDER BY op.manufacturer, op.pack_name
            """
        ),
        {"equipment_id": equipment_id},
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "manufacturer": row[1],
            "pack_name": row[2],
            "source": row[3],
        }
        for row in rows
    ]


def list_equipment_constraints(
    conn: Connection, equipment_id: str
) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT
                ec.id,
                ec.equipment_id,
                ec.constraint_type,
                ec.target_equipment_id,
                ec.target_group_id,
                ec.source,
                e_src.manufacturer AS src_manufacturer,
                e_src.model AS src_model,
                e_tgt.manufacturer AS tgt_manufacturer,
                e_tgt.model AS tgt_model,
                CASE WHEN ec.equipment_id = :equipment_id THEN 'outgoing' ELSE 'incoming' END AS direction
            FROM equipment_constraint ec
            JOIN equipment e_src ON e_src.id = ec.equipment_id
            LEFT JOIN equipment e_tgt ON e_tgt.id = ec.target_equipment_id
            WHERE ec.equipment_id = :equipment_id
               OR ec.target_equipment_id = :equipment_id
            ORDER BY ec.constraint_type, e_tgt.manufacturer, e_tgt.model
            """
        ),
        {"equipment_id": equipment_id},
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "equipment_id": str(row[1]),
            "constraint_type": row[2],
            "target_equipment_id": str(row[3]) if row[3] else None,
            "target_group_id": str(row[4]) if row[4] else None,
            "source": row[5],
            "src_manufacturer": row[6],
            "src_model": row[7],
            "tgt_manufacturer": row[8],
            "tgt_model": row[9],
            "direction": row[10],
        }
        for row in rows
    ]


def add_equipment_constraint(
    conn: Connection,
    equipment_id: str,
    *,
    constraint_type: str,
    target_equipment_id: str | None = None,
    target_group_id: str | None = None,
    source: str,
) -> str:
    constraint_type = _validate_choice(
        constraint_type, CONSTRAINT_TYPES, "constraint_type"
    )
    source = _validate_choice(source, PACK_SOURCES, "source")

    if constraint_type in ("excludes", "requires"):
        if not target_equipment_id:
            raise EquipmentServiceError("Target equipment is required for this constraint.")
        if target_equipment_id == equipment_id:
            raise EquipmentServiceError("Equipment cannot constrain itself.")
    elif constraint_type == "mutually_exclusive_group":
        if not target_group_id:
            target_group_id = str(uuid.uuid4())

    inserted = conn.execute(
        text(
            """
            INSERT INTO equipment_constraint (
                equipment_id, constraint_type, target_equipment_id,
                target_group_id, source
            )
            VALUES (
                :equipment_id,
                CAST(:constraint_type AS constraint_type),
                :target_equipment_id,
                :target_group_id,
                CAST(:source AS pack_source)
            )
            RETURNING id
            """
        ),
        {
            "equipment_id": equipment_id,
            "constraint_type": constraint_type,
            "target_equipment_id": target_equipment_id,
            "target_group_id": target_group_id,
            "source": source,
        },
    ).fetchone()
    return str(inserted[0])


def delete_equipment_constraint(
    conn: Connection, equipment_id: str, constraint_id: str
) -> None:
    result = conn.execute(
        text(
            """
            DELETE FROM equipment_constraint
            WHERE id = :constraint_id
              AND (equipment_id = :equipment_id OR target_equipment_id = :equipment_id)
            """
        ),
        {"constraint_id": constraint_id, "equipment_id": equipment_id},
    )
    if result.rowcount == 0:
        raise EquipmentServiceError("Constraint not found.")
