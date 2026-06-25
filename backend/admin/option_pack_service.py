"""Option pack CRUD and membership links for admin."""

from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from admin.enums import PACK_SOURCES

PER_PAGE = 50


class OptionPackServiceError(Exception):
    pass


def list_pack_manufacturers(conn: Connection) -> list[str]:
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT manufacturer
            FROM option_pack
            ORDER BY manufacturer
            """
        )
    ).fetchall()
    return [row[0] for row in rows]


def count_option_packs(
    conn: Connection, *, manufacturer: str = "", query: str = ""
) -> int:
    clauses, params = _list_filters(manufacturer=manufacturer, query=query)
    return int(
        conn.execute(
            text(f"SELECT COUNT(*) FROM option_pack op WHERE {' AND '.join(clauses)}"),
            params,
        ).scalar()
        or 0
    )


def _list_filters(
    *, manufacturer: str = "", query: str = ""
) -> tuple[list[str], dict[str, Any]]:
    clauses = ["TRUE"]
    params: dict[str, Any] = {}

    if manufacturer.strip():
        clauses.append("op.manufacturer ILIKE :manufacturer_pattern")
        params["manufacturer_pattern"] = f"%{manufacturer.strip()}%"

    if query.strip():
        clauses.append("op.pack_name ILIKE :query_pattern")
        params["query_pattern"] = f"%{query.strip()}%"

    return clauses, params


def list_option_packs_admin(
    conn: Connection,
    *,
    manufacturer: str = "",
    query: str = "",
    page: int = 1,
    per_page: int = PER_PAGE,
) -> list[dict[str, Any]]:
    clauses, params = _list_filters(manufacturer=manufacturer, query=query)
    offset = max(page - 1, 0) * per_page
    params["limit"] = per_page
    params["offset"] = offset

    rows = conn.execute(
        text(
            f"""
            SELECT
                op.id,
                op.manufacturer,
                op.pack_name,
                op.source,
                COALESCE(hull_models.model_codes, ARRAY[]::text[]) AS applicable_models,
                COALESCE(item_counts.item_count, 0) AS item_count,
                COALESCE(child_counts.child_pack_count, 0) AS child_pack_count
            FROM option_pack op
            LEFT JOIN (
                SELECT option_pack_id, COUNT(*)::int AS item_count
                FROM option_pack_equipment
                GROUP BY option_pack_id
            ) item_counts ON item_counts.option_pack_id = op.id
            LEFT JOIN (
                SELECT parent_pack_id, COUNT(*)::int AS child_pack_count
                FROM option_pack_child_pack
                GROUP BY parent_pack_id
            ) child_counts ON child_counts.parent_pack_id = op.id
            LEFT JOIN (
                SELECT
                    opam.option_pack_id,
                    array_agg(
                        hm.display_name ORDER BY hm.manufacturer, hm.model_code
                    ) AS model_codes
                FROM option_pack_hull_model opam
                JOIN hull_model hm ON hm.id = opam.hull_model_id
                GROUP BY opam.option_pack_id
            ) hull_models ON hull_models.option_pack_id = op.id
            WHERE {' AND '.join(clauses)}
            ORDER BY op.manufacturer, op.pack_name
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "manufacturer": row[1],
            "pack_name": row[2],
            "source": row[3],
            "applicable_models": row[4] or [],
            "equipment_count": row[5],
            "child_pack_count": row[6],
        }
        for row in rows
    ]


def get_option_pack(conn: Connection, pack_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT id, manufacturer, pack_name, source, created_at
            FROM option_pack
            WHERE id = :id
            """
        ),
        {"id": pack_id},
    ).fetchone()
    if row is None:
        return None
    return {
        "id": str(row[0]),
        "manufacturer": row[1],
        "pack_name": row[2],
        "source": row[3],
        "created_at": row[4],
    }


def find_option_pack_by_name(
    conn: Connection, manufacturer: str, pack_name: str
) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT id, manufacturer, pack_name, source, created_at
            FROM option_pack
            WHERE LOWER(TRIM(manufacturer)) = LOWER(TRIM(:manufacturer))
              AND LOWER(TRIM(pack_name)) = LOWER(TRIM(:pack_name))
            """
        ),
        {"manufacturer": manufacturer, "pack_name": pack_name},
    ).fetchone()
    if row is None:
        return None
    return {
        "id": str(row[0]),
        "manufacturer": row[1],
        "pack_name": row[2],
        "source": row[3],
        "created_at": row[4],
    }


def search_option_packs_autocomplete(
    conn: Connection, query: str, *, exclude_id: str | None = None, limit: int = 25
) -> list[dict[str, str]]:
    if not query.strip():
        return []

    clauses = ["(op.manufacturer ILIKE :pattern OR op.pack_name ILIKE :pattern)"]
    params: dict[str, Any] = {
        "pattern": f"%{query.strip()}%",
        "limit": limit,
    }
    if exclude_id:
        clauses.append("op.id <> :exclude_id")
        params["exclude_id"] = exclude_id

    rows = conn.execute(
        text(
            f"""
            SELECT op.id, op.manufacturer, op.pack_name
            FROM option_pack op
            WHERE {' AND '.join(clauses)}
            ORDER BY op.manufacturer, op.pack_name
            LIMIT :limit
            """
        ),
        params,
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "label": f"{row[1]} — {row[2]}",
        }
        for row in rows
    ]


def create_option_pack(
    conn: Connection, *, manufacturer: str, pack_name: str, source: str
) -> str:
    manufacturer = manufacturer.strip()
    pack_name = pack_name.strip()
    if not manufacturer or not pack_name:
        raise OptionPackServiceError("Manufacturer and pack name are required.")
    if source not in PACK_SOURCES:
        raise OptionPackServiceError(f"Invalid source: {source}")

    existing = find_option_pack_by_name(conn, manufacturer, pack_name)
    if existing:
        raise OptionPackServiceError(
            f"Pack already exists: {manufacturer} / {pack_name}"
        )

    row = conn.execute(
        text(
            """
            INSERT INTO option_pack (manufacturer, pack_name, source)
            VALUES (:manufacturer, :pack_name, CAST(:source AS pack_source))
            RETURNING id
            """
        ),
        {"manufacturer": manufacturer, "pack_name": pack_name, "source": source},
    ).fetchone()
    return str(row[0])


def update_option_pack(
    conn: Connection, pack_id: str, *, pack_name: str, source: str
) -> None:
    pack_name = pack_name.strip()
    if not pack_name:
        raise OptionPackServiceError("Pack name is required.")
    if source not in PACK_SOURCES:
        raise OptionPackServiceError(f"Invalid source: {source}")

    pack = get_option_pack(conn, pack_id)
    if pack is None:
        raise OptionPackServiceError("Option pack not found.")

    duplicate = find_option_pack_by_name(conn, pack["manufacturer"], pack_name)
    if duplicate and duplicate["id"] != pack_id:
        raise OptionPackServiceError("Another pack already uses this name.")

    result = conn.execute(
        text(
            """
            UPDATE option_pack
            SET pack_name = :pack_name, source = CAST(:source AS pack_source)
            WHERE id = :id
            """
        ),
        {"id": pack_id, "pack_name": pack_name, "source": source},
    )
    if result.rowcount == 0:
        raise OptionPackServiceError("Option pack not found.")


def list_pack_hull_models(conn: Connection, pack_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT hm.id, hm.manufacturer, hm.model_code, hm.display_name, hm.vessel_type
            FROM option_pack_hull_model ophm
            JOIN hull_model hm ON hm.id = ophm.hull_model_id
            WHERE ophm.option_pack_id = :pack_id
            ORDER BY hm.manufacturer, hm.model_code
            """
        ),
        {"pack_id": pack_id},
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "manufacturer": row[1],
            "model_code": row[2],
            "display_name": row[3] or row[2],
            "vessel_type": row[4],
            "label": f"{row[1]} — {row[3] or row[2]}",
        }
        for row in rows
    ]


def add_pack_hull_model(conn: Connection, pack_id: str, hull_model_id: str) -> None:
    result = conn.execute(
        text(
            """
            INSERT INTO option_pack_hull_model (option_pack_id, hull_model_id)
            VALUES (:pack_id, :hull_model_id)
            ON CONFLICT (option_pack_id, hull_model_id) DO NOTHING
            """
        ),
        {"pack_id": pack_id, "hull_model_id": hull_model_id},
    )
    if result.rowcount == 0:
        exists = conn.execute(
            text(
                """
                SELECT 1 FROM option_pack_hull_model
                WHERE option_pack_id = :pack_id AND hull_model_id = :hull_model_id
                """
            ),
            {"pack_id": pack_id, "hull_model_id": hull_model_id},
        ).fetchone()
        if exists:
            raise OptionPackServiceError("Hull model is already linked to this pack.")


def remove_pack_hull_model(
    conn: Connection, pack_id: str, hull_model_id: str
) -> None:
    result = conn.execute(
        text(
            """
            DELETE FROM option_pack_hull_model
            WHERE option_pack_id = :pack_id AND hull_model_id = :hull_model_id
            """
        ),
        {"pack_id": pack_id, "hull_model_id": hull_model_id},
    )
    if result.rowcount == 0:
        raise OptionPackServiceError("Hull model link not found.")


def list_pack_equipment(conn: Connection, pack_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT
                e.id, e.manufacturer, e.model, e.system_category,
                ope.sort_order, ope.quantity, ope.is_optional, ope.source_note
            FROM option_pack_equipment ope
            JOIN equipment e ON e.id = ope.equipment_id
            WHERE ope.option_pack_id = :pack_id
            ORDER BY ope.sort_order, e.manufacturer, e.model
            """
        ),
        {"pack_id": pack_id},
    ).fetchall()
    return [
        {
            "equipment_id": str(row[0]),
            "manufacturer": row[1],
            "model": row[2],
            "system_category": row[3],
            "sort_order": row[4],
            "quantity": row[5],
            "is_optional": row[6],
            "source_note": row[7] or "",
        }
        for row in rows
    ]


def add_pack_equipment(
    conn: Connection,
    pack_id: str,
    equipment_id: str,
    *,
    sort_order: int = 0,
    quantity: int = 1,
    is_optional: bool = False,
    source_note: str = "",
) -> None:
    if quantity < 1:
        raise OptionPackServiceError("Quantity must be at least 1.")

    result = conn.execute(
        text(
            """
            INSERT INTO option_pack_equipment (
                option_pack_id, equipment_id, sort_order, quantity,
                is_optional, source_note
            )
            VALUES (
                :pack_id, :equipment_id, :sort_order, :quantity,
                :is_optional, :source_note
            )
            ON CONFLICT (option_pack_id, equipment_id) DO NOTHING
            """
        ),
        {
            "pack_id": pack_id,
            "equipment_id": equipment_id,
            "sort_order": sort_order,
            "quantity": quantity,
            "is_optional": is_optional,
            "source_note": source_note.strip() or None,
        },
    )
    if result.rowcount == 0:
        exists = conn.execute(
            text(
                """
                SELECT 1 FROM option_pack_equipment
                WHERE option_pack_id = :pack_id AND equipment_id = :equipment_id
                """
            ),
            {"pack_id": pack_id, "equipment_id": equipment_id},
        ).fetchone()
        if exists:
            raise OptionPackServiceError("Equipment is already in this pack.")


def update_pack_equipment(
    conn: Connection,
    pack_id: str,
    equipment_id: str,
    *,
    sort_order: int,
    quantity: int,
    is_optional: bool,
    source_note: str,
) -> None:
    if quantity < 1:
        raise OptionPackServiceError("Quantity must be at least 1.")

    result = conn.execute(
        text(
            """
            UPDATE option_pack_equipment
            SET sort_order = :sort_order,
                quantity = :quantity,
                is_optional = :is_optional,
                source_note = :source_note
            WHERE option_pack_id = :pack_id AND equipment_id = :equipment_id
            """
        ),
        {
            "pack_id": pack_id,
            "equipment_id": equipment_id,
            "sort_order": sort_order,
            "quantity": quantity,
            "is_optional": is_optional,
            "source_note": source_note.strip() or None,
        },
    )
    if result.rowcount == 0:
        raise OptionPackServiceError("Equipment link not found.")


def remove_pack_equipment(
    conn: Connection, pack_id: str, equipment_id: str
) -> None:
    result = conn.execute(
        text(
            """
            DELETE FROM option_pack_equipment
            WHERE option_pack_id = :pack_id AND equipment_id = :equipment_id
            """
        ),
        {"pack_id": pack_id, "equipment_id": equipment_id},
    )
    if result.rowcount == 0:
        raise OptionPackServiceError("Equipment link not found.")


def list_child_packs(conn: Connection, pack_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT
                cp.id, cp.manufacturer, cp.pack_name,
                ocp.sort_order, ocp.is_optional, ocp.source_note
            FROM option_pack_child_pack ocp
            JOIN option_pack cp ON cp.id = ocp.child_pack_id
            WHERE ocp.parent_pack_id = :pack_id
            ORDER BY ocp.sort_order, cp.manufacturer, cp.pack_name
            """
        ),
        {"pack_id": pack_id},
    ).fetchall()
    return [
        {
            "child_pack_id": str(row[0]),
            "manufacturer": row[1],
            "pack_name": row[2],
            "sort_order": row[3],
            "is_optional": row[4],
            "source_note": row[5] or "",
        }
        for row in rows
    ]


def _would_create_child_cycle(
    conn: Connection, parent_pack_id: str, child_pack_id: str
) -> bool:
    if parent_pack_id == child_pack_id:
        return True

    stack = [child_pack_id]
    seen: set[str] = set()
    while stack:
        current = stack.pop()
        if current == parent_pack_id:
            return True
        if current in seen:
            continue
        seen.add(current)
        rows = conn.execute(
            text(
                """
                SELECT child_pack_id
                FROM option_pack_child_pack
                WHERE parent_pack_id = :pack_id
                """
            ),
            {"pack_id": current},
        ).fetchall()
        stack.extend(str(row[0]) for row in rows)
    return False


def add_child_pack(
    conn: Connection,
    parent_pack_id: str,
    child_pack_id: str,
    *,
    sort_order: int = 0,
    is_optional: bool = False,
    source_note: str = "",
) -> None:
    if _would_create_child_cycle(conn, parent_pack_id, child_pack_id):
        raise OptionPackServiceError(
            "Adding this child pack would create a circular reference."
        )

    result = conn.execute(
        text(
            """
            INSERT INTO option_pack_child_pack (
                parent_pack_id, child_pack_id, sort_order, is_optional, source_note
            )
            VALUES (
                :parent_id, :child_id, :sort_order, :is_optional, :source_note
            )
            ON CONFLICT (parent_pack_id, child_pack_id) DO NOTHING
            """
        ),
        {
            "parent_id": parent_pack_id,
            "child_id": child_pack_id,
            "sort_order": sort_order,
            "is_optional": is_optional,
            "source_note": source_note.strip() or None,
        },
    )
    if result.rowcount == 0:
        raise OptionPackServiceError("Child pack is already linked.")


def update_child_pack(
    conn: Connection,
    parent_pack_id: str,
    child_pack_id: str,
    *,
    sort_order: int,
    is_optional: bool,
    source_note: str,
) -> None:
    result = conn.execute(
        text(
            """
            UPDATE option_pack_child_pack
            SET sort_order = :sort_order,
                is_optional = :is_optional,
                source_note = :source_note
            WHERE parent_pack_id = :parent_id AND child_pack_id = :child_id
            """
        ),
        {
            "parent_id": parent_pack_id,
            "child_id": child_pack_id,
            "sort_order": sort_order,
            "is_optional": is_optional,
            "source_note": source_note.strip() or None,
        },
    )
    if result.rowcount == 0:
        raise OptionPackServiceError("Child pack link not found.")


def remove_child_pack(
    conn: Connection, parent_pack_id: str, child_pack_id: str
) -> None:
    result = conn.execute(
        text(
            """
            DELETE FROM option_pack_child_pack
            WHERE parent_pack_id = :parent_id AND child_pack_id = :child_id
            """
        ),
        {"parent_id": parent_pack_id, "child_id": child_pack_id},
    )
    if result.rowcount == 0:
        raise OptionPackServiceError("Child pack link not found.")
