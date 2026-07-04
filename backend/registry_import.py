"""Load equipment registry CSVs into Postgres (idempotent upsert + link reload)."""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Connection

from admin.enums import SYSTEM_CATEGORIES, VESSEL_TYPES

PACK_SOURCES = frozenset(
    {"manufacturer_published", "team_researched", "owner_confirmed"}
)
EQUIPMENT_CLASSES = frozenset(
    {
        "branded_major",
        "branded_minor",
        "generic_hardware",
        "built_installed",
        "structural_fixed",
        "consumable_dated",
    }
)
CONFIGURATION_TIERS = frozenset(
    {"structural", "option_pack", "discrete_option", "aftermarket"}
)
IDENTIFICATION_METHODS = frozenset(
    {"nameplate", "visual_description", "builder_spec"}
)
ZONE_CARDINALITIES = frozenset({"fixed", "configurable"})
ZONES = frozenset(
    {
        "bow_foredeck",
        "helm_station",
        "cockpit_aft_deck",
        "saloon_main_cabin",
        "galley",
        "engine_room",
        "lazarette_aft_storage",
        "swim_platform_transom",
        "below_decks_bilge",
        "port_hull",
        "starboard_hull",
        "bridgedeck_coachroof",
        "trampoline_foredeck_netting",
        "mast_base_deck_step",
        "keel_centreboard_trunk",
        "quarter_berth_aft_cabin",
        "flybridge",
        "engine_room_walkin",
        "bait_tackle_station",
    }
)

CSV_FILES = {
    "hull_models": "hull_models.csv",
    "equipment": "equipment_registry.csv",
    "option_packs": "option_packs.csv",
    "pack_hull": "option_pack_hull_model.csv",
    "pack_equipment": "option_pack_equipment.csv",
    "pack_child": "option_pack_child_pack.csv",
}


class RegistryImportError(Exception):
    pass


@dataclass
class ImportReport:
    hull_models_inserted: int = 0
    hull_models_updated: int = 0
    equipment_inserted: int = 0
    equipment_updated: int = 0
    option_packs_inserted: int = 0
    option_packs_updated: int = 0
    pack_hull_links: int = 0
    pack_equipment_links: int = 0
    pack_child_links: int = 0
    warnings: list[str] = field(default_factory=list)


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _require(row: dict[str, str], *columns: str, context: str = "") -> None:
    missing = [col for col in columns if not (row.get(col) or "").strip()]
    if missing:
        label = f" ({context})" if context else ""
        raise RegistryImportError(
            f"Missing required column(s) {missing}{label}: {row}"
        )


def _parse_pipe_list(value: str) -> list[str]:
    if not value or not value.strip():
        return []
    return [part.strip() for part in value.replace("|", ",").split(",") if part.strip()]


def _parse_bool(value: str, *, default: bool = False) -> bool:
    if not value or not str(value).strip():
        return default
    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "y"}:
        return True
    if normalized in {"false", "0", "no", "n"}:
        return False
    raise RegistryImportError(f"Invalid boolean value: {value!r}")


def _parse_int(value: str, *, default: int, field_name: str) -> int:
    if not value or not str(value).strip():
        return default
    try:
        return int(str(value).strip())
    except ValueError as exc:
        raise RegistryImportError(
            f"Invalid integer for {field_name}: {value!r}"
        ) from exc


def _check_enum(value: str, allowed: frozenset[str] | list[str], label: str) -> str:
    normalized = value.strip()
    if normalized not in allowed:
        raise RegistryImportError(
            f"Invalid {label} {normalized!r}; allowed: {sorted(allowed)}"
        )
    return normalized


def _duplicate_keys(
    rows: list[dict[str, str]], *key_cols: str
) -> list[tuple[tuple[str, ...], list[int]]]:
    seen: dict[tuple[str, ...], list[int]] = {}
    for index, row in enumerate(rows, start=2):
        key = tuple((row.get(col) or "").strip() for col in key_cols)
        seen.setdefault(key, []).append(index)
    return [(key, lines) for key, lines in seen.items() if len(lines) > 1]


def validate_csv_bundle(data_dir: Path) -> dict[str, list[dict[str, str]]]:
    bundle: dict[str, list[dict[str, str]]] = {}
    for name, filename in CSV_FILES.items():
        path = data_dir / filename
        if not path.is_file():
            raise RegistryImportError(f"Missing CSV: {path}")
        bundle[name] = load_csv(path)

    for key, cols in (
        ("hull_models", ("manufacturer", "model_code")),
        ("equipment", ("manufacturer", "model", "system_category", "zone")),
        ("option_packs", ("manufacturer", "pack_name", "source")),
        (
            "pack_hull",
            ("manufacturer", "pack_name", "hull_manufacturer", "hull_model_code"),
        ),
        (
            "pack_equipment",
            (
                "manufacturer",
                "pack_name",
                "equipment_manufacturer",
                "equipment_model",
            ),
        ),
        (
            "pack_child",
            (
                "parent_manufacturer",
                "parent_pack_name",
                "child_manufacturer",
                "child_pack_name",
            ),
        ),
    ):
        dups = _duplicate_keys(bundle[key], *cols)
        if dups:
            details = "; ".join(
                f"{key} (lines {', '.join(map(str, lines))})"
                for key, lines in dups[:5]
            )
            raise RegistryImportError(
                f"Duplicate keys in {CSV_FILES[key]}: {details}"
                + (f" (+{len(dups) - 5} more)" if len(dups) > 5 else "")
            )

    hull_keys = {
        (r["manufacturer"].strip(), r["model_code"].strip())
        for r in bundle["hull_models"]
    }
    eq_keys = {
        (r["manufacturer"].strip(), r["model"].strip()) for r in bundle["equipment"]
    }
    pack_keys = {
        (r["manufacturer"].strip(), r["pack_name"].strip())
        for r in bundle["option_packs"]
    }

    for row in bundle["pack_hull"]:
        pack = (row["manufacturer"].strip(), row["pack_name"].strip())
        hull = (row["hull_manufacturer"].strip(), row["hull_model_code"].strip())
        if pack not in pack_keys:
            raise RegistryImportError(f"Unknown option pack in hull links: {pack}")
        if hull not in hull_keys:
            raise RegistryImportError(f"Unknown hull model in hull links: {hull}")

    for row in bundle["pack_equipment"]:
        pack = (row["manufacturer"].strip(), row["pack_name"].strip())
        eq = (row["equipment_manufacturer"].strip(), row["equipment_model"].strip())
        if pack not in pack_keys:
            raise RegistryImportError(f"Unknown option pack in equipment links: {pack}")
        if eq not in eq_keys:
            raise RegistryImportError(f"Unknown equipment in pack links: {eq}")

    for row in bundle["pack_child"]:
        parent = (row["parent_manufacturer"].strip(), row["parent_pack_name"].strip())
        child = (row["child_manufacturer"].strip(), row["child_pack_name"].strip())
        if parent not in pack_keys:
            raise RegistryImportError(f"Unknown parent pack in child links: {parent}")
        if child not in pack_keys:
            raise RegistryImportError(f"Unknown child pack in child links: {child}")
        if parent == child:
            raise RegistryImportError(f"Self-referencing child pack: {parent}")

    _validate_child_pack_acyclic(bundle["pack_child"], pack_keys)

    for row in bundle["hull_models"]:
        _check_enum(row["vessel_type"], VESSEL_TYPES, "vessel_type")

    for row in bundle["equipment"]:
        _check_enum(row["system_category"], SYSTEM_CATEGORIES, "system_category")
        _check_enum(row["zone"], ZONES, "zone")
        _check_enum(row["equipment_class"], EQUIPMENT_CLASSES, "equipment_class")
        _check_enum(row["configuration_tier"], CONFIGURATION_TIERS, "configuration_tier")
        _check_enum(
            row["identification_method"], IDENTIFICATION_METHODS, "identification_method"
        )
        for vt in _parse_pipe_list(row.get("vessel_types", "")):
            _check_enum(vt, VESSEL_TYPES, "vessel_types")

    for row in bundle["option_packs"]:
        _check_enum(row["source"], PACK_SOURCES, "source")

    return bundle


def _warn_pack_coverage(
    bundle: dict[str, list[dict[str, str]]], report: ImportReport
) -> None:
    pack_keys = {
        (r["manufacturer"].strip(), r["pack_name"].strip())
        for r in bundle["option_packs"]
    }
    packs_with_hull = {
        (r["manufacturer"].strip(), r["pack_name"].strip()) for r in bundle["pack_hull"]
    }
    packs_with_equipment = {
        (r["manufacturer"].strip(), r["pack_name"].strip())
        for r in bundle["pack_equipment"]
    }
    child_parents = {
        (r["parent_manufacturer"].strip(), r["parent_pack_name"].strip())
        for r in bundle["pack_child"]
    }
    for pack in sorted(pack_keys):
        if pack not in packs_with_hull:
            report.warnings.append(
                f"Option pack has no hull links: {pack[0]} / {pack[1]}"
            )
        if pack not in packs_with_equipment and pack not in child_parents:
            report.warnings.append(
                f"Option pack has no equipment or child-pack content: "
                f"{pack[0]} / {pack[1]}"
            )


def validate_registry(data_dir: Path) -> ImportReport:
    bundle = validate_csv_bundle(data_dir)
    report = ImportReport()
    _warn_pack_coverage(bundle, report)
    report.warnings.insert(0, "Dry run: validation passed; no database writes.")
    return report


def _validate_child_pack_acyclic(
    rows: list[dict[str, str]], pack_keys: set[tuple[str, str]]
) -> None:
    graph: dict[tuple[str, str], list[tuple[str, str]]] = {
        key: [] for key in pack_keys
    }
    for row in rows:
        parent = (row["parent_manufacturer"].strip(), row["parent_pack_name"].strip())
        child = (row["child_manufacturer"].strip(), row["child_pack_name"].strip())
        graph[parent].append(child)

    visiting: set[tuple[str, str]] = set()
    visited: set[tuple[str, str]] = set()

    def dfs(node: tuple[str, str]) -> None:
        if node in visiting:
            raise RegistryImportError(f"Circular option pack reference at {node}")
        if node in visited:
            return
        visiting.add(node)
        for child in graph.get(node, []):
            dfs(child)
        visiting.remove(node)
        visited.add(node)

    for node in pack_keys:
        dfs(node)


def _upsert_hull_model(conn: Connection, row: dict[str, str], report: ImportReport) -> str:
    _require(row, "manufacturer", "model_code", "vessel_type")
    manufacturer = row["manufacturer"].strip()
    model_code = row["model_code"].strip()
    display_name = (row.get("display_name") or model_code).strip()
    vessel_type = _check_enum(row["vessel_type"], VESSEL_TYPES, "vessel_type")
    aliases = _parse_pipe_list(row.get("aliases", ""))

    existing = conn.execute(
        text(
            """
            SELECT id FROM hull_model
            WHERE manufacturer = :manufacturer AND model_code = :model_code
            """
        ),
        {"manufacturer": manufacturer, "model_code": model_code},
    ).fetchone()

    if existing:
        conn.execute(
            text(
                """
                UPDATE hull_model
                SET display_name = :display_name,
                    vessel_type = CAST(:vessel_type AS vessel_type),
                    aliases = CAST(:aliases AS text[])
                WHERE id = :id
                """
            ),
            {
                "id": existing[0],
                "display_name": display_name,
                "vessel_type": vessel_type,
                "aliases": aliases,
            },
        )
        report.hull_models_updated += 1
        return str(existing[0])

    inserted = conn.execute(
        text(
            """
            INSERT INTO hull_model (
                manufacturer, model_code, display_name, vessel_type, aliases
            )
            VALUES (
                :manufacturer, :model_code, :display_name,
                CAST(:vessel_type AS vessel_type), CAST(:aliases AS text[])
            )
            RETURNING id
            """
        ),
        {
            "manufacturer": manufacturer,
            "model_code": model_code,
            "display_name": display_name,
            "vessel_type": vessel_type,
            "aliases": aliases,
        },
    ).fetchone()
    report.hull_models_inserted += 1
    return str(inserted[0])


def _upsert_equipment(conn: Connection, row: dict[str, str], report: ImportReport) -> str:
    _require(
        row,
        "manufacturer",
        "model",
        "system_category",
        "zone",
        "equipment_class",
        "configuration_tier",
        "identification_method",
    )
    manufacturer = row["manufacturer"].strip()
    model = row["model"].strip()
    vessel_types = _parse_pipe_list(row.get("vessel_types", ""))
    if not vessel_types:
        raise RegistryImportError(
            f"equipment {manufacturer} / {model}: vessel_types is required"
        )
    has_formal_manual = _parse_bool(row.get("has_formal_manual", "false"))

    params = {
        "manufacturer": manufacturer,
        "model": model,
        "vessel_types": vessel_types,
        "zone": _check_enum(row["zone"], ZONES, "zone"),
        "system_category": _check_enum(
            row["system_category"], SYSTEM_CATEGORIES, "system_category"
        ),
        "equipment_class": _check_enum(
            row["equipment_class"], EQUIPMENT_CLASSES, "equipment_class"
        ),
        "configuration_tier": _check_enum(
            row["configuration_tier"], CONFIGURATION_TIERS, "configuration_tier"
        ),
        "identification_method": _check_enum(
            row["identification_method"], IDENTIFICATION_METHODS, "identification_method"
        ),
        "has_formal_manual": has_formal_manual,
    }

    existing = conn.execute(
        text(
            """
            SELECT id FROM equipment
            WHERE manufacturer = :manufacturer AND model = :model
            """
        ),
        {"manufacturer": manufacturer, "model": model},
    ).fetchone()

    if existing:
        conn.execute(
            text(
                """
                UPDATE equipment
                SET
                    vessel_types = CAST(:vessel_types AS vessel_type[]),
                    zone = CAST(:zone AS zone),
                    system_category = CAST(:system_category AS system_category),
                    equipment_class = CAST(:equipment_class AS equipment_class),
                    configuration_tier = CAST(:configuration_tier AS configuration_tier),
                    identification_method = CAST(:identification_method AS identification_method),
                    has_formal_manual = :has_formal_manual
                WHERE id = :id
                """
            ),
            {**params, "id": existing[0]},
        )
        report.equipment_updated += 1
        return str(existing[0])

    inserted = conn.execute(
        text(
            """
            INSERT INTO equipment (
                manufacturer, model, vessel_types, zone, system_category,
                equipment_class, configuration_tier, identification_method,
                has_formal_manual
            )
            VALUES (
                :manufacturer, :model,
                CAST(:vessel_types AS vessel_type[]),
                CAST(:zone AS zone),
                CAST(:system_category AS system_category),
                CAST(:equipment_class AS equipment_class),
                CAST(:configuration_tier AS configuration_tier),
                CAST(:identification_method AS identification_method),
                :has_formal_manual
            )
            RETURNING id
            """
        ),
        params,
    ).fetchone()
    report.equipment_inserted += 1
    return str(inserted[0])


def _upsert_option_pack(conn: Connection, row: dict[str, str], report: ImportReport) -> str:
    _require(row, "manufacturer", "pack_name", "source")
    manufacturer = row["manufacturer"].strip()
    pack_name = row["pack_name"].strip()
    source = _check_enum(row["source"], PACK_SOURCES, "source")

    existing = conn.execute(
        text(
            """
            SELECT id FROM option_pack
            WHERE manufacturer = :manufacturer AND pack_name = :pack_name
            """
        ),
        {"manufacturer": manufacturer, "pack_name": pack_name},
    ).fetchone()

    if existing:
        conn.execute(
            text(
                """
                UPDATE option_pack
                SET source = CAST(:source AS pack_source)
                WHERE id = :id
                """
            ),
            {"id": existing[0], "source": source},
        )
        report.option_packs_updated += 1
        return str(existing[0])

    inserted = conn.execute(
        text(
            """
            INSERT INTO option_pack (manufacturer, pack_name, source)
            VALUES (:manufacturer, :pack_name, CAST(:source AS pack_source))
            RETURNING id
            """
        ),
        {"manufacturer": manufacturer, "pack_name": pack_name, "source": source},
    ).fetchone()
    report.option_packs_inserted += 1
    return str(inserted[0])


def _load_id_maps(conn: Connection) -> dict[str, dict[tuple[str, str], str]]:
    hull_rows = conn.execute(
        text("SELECT id, manufacturer, model_code FROM hull_model")
    ).fetchall()
    eq_rows = conn.execute(
        text("SELECT id, manufacturer, model FROM equipment")
    ).fetchall()
    pack_rows = conn.execute(
        text("SELECT id, manufacturer, pack_name FROM option_pack")
    ).fetchall()
    return {
        "hull": {(r[1], r[2]): str(r[0]) for r in hull_rows},
        "equipment": {(r[1], r[2]): str(r[0]) for r in eq_rows},
        "pack": {(r[1], r[2]): str(r[0]) for r in pack_rows},
    }


def _clear_link_tables(conn: Connection) -> None:
    conn.execute(text("DELETE FROM option_pack_child_pack"))
    conn.execute(text("DELETE FROM option_pack_equipment"))
    conn.execute(text("DELETE FROM option_pack_hull_model"))


def import_registry_core(
    conn: Connection,
    bundle: dict[str, list[dict[str, str]]],
    report: ImportReport,
) -> None:
    """Upsert hull models, equipment, and option pack headers."""
    for row in bundle["hull_models"]:
        _upsert_hull_model(conn, row, report)

    for row in bundle["equipment"]:
        _upsert_equipment(conn, row, report)

    for row in bundle["option_packs"]:
        _upsert_option_pack(conn, row, report)


def import_registry_links(
    conn: Connection,
    bundle: dict[str, list[dict[str, str]]],
    report: ImportReport,
    *,
    replace_links: bool = True,
) -> None:
    """Reload option pack relationship tables (hull, equipment, child packs)."""
    ids = _load_id_maps(conn)

    if replace_links:
        _clear_link_tables(conn)

    for row in bundle["pack_hull"]:
        pack_id = ids["pack"][
            (row["manufacturer"].strip(), row["pack_name"].strip())
        ]
        hull_id = ids["hull"][
            (row["hull_manufacturer"].strip(), row["hull_model_code"].strip())
        ]
        conn.execute(
            text(
                """
                INSERT INTO option_pack_hull_model (option_pack_id, hull_model_id)
                VALUES (:pack_id, :hull_id)
                ON CONFLICT (option_pack_id, hull_model_id) DO NOTHING
                """
            ),
            {"pack_id": pack_id, "hull_id": hull_id},
        )
        report.pack_hull_links += 1

    for row in bundle["pack_equipment"]:
        pack_id = ids["pack"][
            (row["manufacturer"].strip(), row["pack_name"].strip())
        ]
        equipment_id = ids["equipment"][
            (row["equipment_manufacturer"].strip(), row["equipment_model"].strip())
        ]
        conn.execute(
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
                ON CONFLICT (option_pack_id, equipment_id) DO UPDATE SET
                    sort_order = EXCLUDED.sort_order,
                    quantity = EXCLUDED.quantity,
                    is_optional = EXCLUDED.is_optional,
                    source_note = EXCLUDED.source_note
                """
            ),
            {
                "pack_id": pack_id,
                "equipment_id": equipment_id,
                "sort_order": _parse_int(
                    row.get("sort_order", ""), default=0, field_name="sort_order"
                ),
                "quantity": _parse_int(
                    row.get("quantity", ""), default=1, field_name="quantity"
                ),
                "is_optional": _parse_bool(row.get("is_optional", "false")),
                "source_note": (row.get("source_note") or "").strip() or None,
            },
        )
        report.pack_equipment_links += 1

    for row in bundle["pack_child"]:
        parent_id = ids["pack"][
            (row["parent_manufacturer"].strip(), row["parent_pack_name"].strip())
        ]
        child_id = ids["pack"][
            (row["child_manufacturer"].strip(), row["child_pack_name"].strip())
        ]
        conn.execute(
            text(
                """
                INSERT INTO option_pack_child_pack (
                    parent_pack_id, child_pack_id, sort_order, is_optional, source_note
                )
                VALUES (
                    :parent_id, :child_id, :sort_order, :is_optional, :source_note
                )
                ON CONFLICT (parent_pack_id, child_pack_id) DO UPDATE SET
                    sort_order = EXCLUDED.sort_order,
                    is_optional = EXCLUDED.is_optional,
                    source_note = EXCLUDED.source_note
                """
            ),
            {
                "parent_id": parent_id,
                "child_id": child_id,
                "sort_order": _parse_int(
                    row.get("sort_order", ""), default=0, field_name="sort_order"
                ),
                "is_optional": _parse_bool(row.get("is_optional", "false")),
                "source_note": (row.get("source_note") or "").strip() or None,
            },
        )
        report.pack_child_links += 1


def import_registry(
    conn: Connection,
    data_dir: Path,
    *,
    replace_links: bool = True,
    dry_run: bool = False,
) -> ImportReport:
    bundle = validate_csv_bundle(data_dir)
    report = ImportReport()

    if dry_run:
        report = ImportReport()
        _warn_pack_coverage(bundle, report)
        report.warnings.insert(
            0, "Dry run: validation passed; no database writes."
        )
        return report

    import_registry_core(conn, bundle, report)
    import_registry_links(conn, bundle, report, replace_links=replace_links)
    _warn_pack_coverage(bundle, report)

    return report


def format_report(report: ImportReport) -> str:
    lines = [
        "Registry import complete.",
        f"  hull_model: inserted {report.hull_models_inserted}, "
        f"updated {report.hull_models_updated}",
        f"  equipment: inserted {report.equipment_inserted}, "
        f"updated {report.equipment_updated}",
        f"  option_pack: inserted {report.option_packs_inserted}, "
        f"updated {report.option_packs_updated}",
        f"  option_pack_hull_model links: {report.pack_hull_links}",
        f"  option_pack_equipment links: {report.pack_equipment_links}",
        f"  option_pack_child_pack links: {report.pack_child_links}",
    ]
    if report.warnings:
        lines.append("Warnings:")
        for warning in report.warnings:
            lines.append(f"  - {warning}")
    return "\n".join(lines)
