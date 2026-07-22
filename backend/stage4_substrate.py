"""Phase 2: DB-native Stage 4 input substrate — edge split + DB->composer adapter.

The frozen composers consume an ``equipment_doc`` and a ``profiles`` dict built
today from ``fixtures/pipeline/<vessel>/{equipment,profiles}.json``. Phase 2
stores that substrate in Postgres (migration 023) and reconstructs the exact
shapes here, so ``build_vessel_graph`` / ``assemble_section_inputs`` — and thus
the composed drafts — are byte-identical whether fed the fixture or the DB.

Two responsibilities:
  * ``split_profile_edges`` / ``reinline_edges`` — decision 2's clean split:
    cross-device edges (``runs_platform``/``protects``/``protected_by``/
    ``requires_devices``) live in ``vessel_equipment_relation``, not in the
    stored capability profile; the adapter re-inlines them.
  * ``build_equipment_doc_from_db`` / ``build_profiles_from_db`` — the adapter
    that rebuilds the composer inputs for one vessel.

Pure w.r.t. the DB read; see ``guide-stage4-integration-plan.md``.
"""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from location_model import generate_label

# Decision 2: every cross-device edge is extracted from the stored profile.
# ``protects``/``protected_by``/``requires_devices`` are present on every fixture
# profile (empty when unused); ``runs_platform`` only where a device hosts a
# platform. That presence pattern is reproduced on re-inline below.
EDGE_KEYS: tuple[str, ...] = (
    "runs_platform",
    "protects",
    "protected_by",
    "requires_devices",
)
_ALWAYS_PRESENT_EDGES: tuple[str, ...] = (
    "protects",
    "protected_by",
    "requires_devices",
)

# When profile.device strings still drift from the admin registry catalog,
# force the registry (manufacturer, model) used for ``equipment_id`` linkage.
PROFILE_EQUIPMENT_OVERRIDES: dict[str, tuple[str, str]] = {
    "alpha_pro_iii": ("Mastervolt", "Alpha Pro III"),
    "bg_zeus_sr": ("B&G", "Zeus SR 12"),
}


def split_profile_edges(
    profile: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    """Return (capability-only profile, {edge_type: [edge objects]})."""
    capability = {k: v for k, v in profile.items() if k not in EDGE_KEYS}
    edges = {
        edge_type: list(profile.get(edge_type) or [])
        for edge_type in EDGE_KEYS
        if profile.get(edge_type) is not None
    }
    return capability, edges


def _edge_to_relation(edge_type: str, edge: dict[str, Any]) -> dict[str, Any]:
    """Split one inlined edge into (dst_device_key, attrs) for storage."""
    attrs = dict(edge)
    dst = None
    if edge_type == "runs_platform":
        dst = attrs.pop("platform_key", None)
    return {"dst_device_key": dst, "attrs": attrs}


def _relation_to_edge(edge_type: str, dst: str | None, attrs: dict[str, Any]) -> dict[str, Any]:
    """Rebuild the inlined edge object from a stored relation row."""
    if edge_type == "runs_platform":
        rebuilt: dict[str, Any] = {}
        if dst is not None:
            rebuilt["platform_key"] = dst
        rebuilt.update(attrs)
        return rebuilt
    return dict(attrs)


def reinline_edges(
    capability_profile: dict[str, Any],
    relations_for_key: dict[str, list[tuple[str | None, dict[str, Any]]]],
) -> dict[str, Any]:
    """Re-attach extracted edges to a capability profile.

    ``relations_for_key`` maps ``edge_type -> [(dst_device_key, attrs)]`` already
    ordered by ``ordinal``. ``protects``/``protected_by``/``requires_devices`` are
    always emitted (``[]`` when absent) to match the fixture; ``runs_platform``
    only when the vessel has such an edge.
    """
    profile = dict(capability_profile)
    for edge_type in _ALWAYS_PRESENT_EDGES:
        rows = relations_for_key.get(edge_type) or []
        profile[edge_type] = [_relation_to_edge(edge_type, d, a) for d, a in rows]
    platform_rows = relations_for_key.get("runs_platform")
    if platform_rows:
        profile["runs_platform"] = [
            _relation_to_edge("runs_platform", d, a) for d, a in platform_rows
        ]
    return profile


def iter_relation_rows(
    profile_key: str, edges: dict[str, list[dict[str, Any]]]
) -> list[dict[str, Any]]:
    """Flatten a profile's edges into insertable ``vessel_equipment_relation`` rows."""
    rows: list[dict[str, Any]] = []
    for edge_type in EDGE_KEYS:
        for ordinal, edge in enumerate(edges.get(edge_type) or []):
            split = _edge_to_relation(edge_type, edge)
            rows.append(
                {
                    "src_device_key": profile_key,
                    "edge_type": edge_type,
                    "dst_device_key": split["dst_device_key"],
                    "ordinal": ordinal,
                    "attrs": split["attrs"],
                }
            )
    return rows


# --------------------------------------------------------------------------- #
# Registry linkage (interaction_profile.equipment_id)
# --------------------------------------------------------------------------- #

def resolve_registry_equipment(
    conn: Connection,
    profile_key: str,
    *,
    manufacturer: str | None = None,
    model: str | None = None,
) -> dict[str, Any] | None:
    """Exact-match a registry ``equipment`` row for a Stage 4 profile_key."""
    override = PROFILE_EQUIPMENT_OVERRIDES.get(profile_key)
    if override is not None:
        manufacturer, model = override
    mfr = (manufacturer or "").strip()
    mdl = (model or "").strip()
    if not mfr or not mdl:
        return None
    row = conn.execute(
        text(
            """
            SELECT id, manufacturer, model
            FROM equipment
            WHERE manufacturer = :mfr AND model = :model
            LIMIT 1
            """
        ),
        {"mfr": mfr, "model": mdl},
    ).fetchone()
    if row is None:
        return None
    return {
        "id": str(row[0]),
        "manufacturer": row[1],
        "model": row[2],
    }


def link_profiles_to_registry(conn: Connection) -> dict[str, int]:
    """Fill ``interaction_profile.equipment_id`` and align manufacturer/model.

    Leaves unmatched profiles (e.g. stub ``plain_battery_switch``) with
    ``equipment_id`` NULL. Safe to re-run; does not rewrite ``profile`` JSONB
    (composer byte-match reads the JSONB, not the columns).
    """
    rows = conn.execute(
        text(
            """
            SELECT profile_key, manufacturer, model
            FROM interaction_profile
            ORDER BY profile_key
            """
        )
    ).fetchall()
    linked = 0
    cleared = 0
    for profile_key, manufacturer, model in rows:
        match = resolve_registry_equipment(
            conn, profile_key, manufacturer=manufacturer, model=model
        )
        if match is None:
            result = conn.execute(
                text(
                    """
                    UPDATE interaction_profile
                    SET equipment_id = NULL, updated_at = now()
                    WHERE profile_key = :pk AND equipment_id IS NOT NULL
                    """
                ),
                {"pk": profile_key},
            )
            cleared += int(result.rowcount or 0)
            continue
        conn.execute(
            text(
                """
                UPDATE interaction_profile
                SET equipment_id = :eid,
                    manufacturer = :mfr,
                    model = :model,
                    updated_at = now()
                WHERE profile_key = :pk
                """
            ),
            {
                "pk": profile_key,
                "eid": match["id"],
                "mfr": match["manufacturer"],
                "model": match["model"],
            },
        )
        linked += 1
    return {"linked": linked, "cleared": cleared, "total": len(rows)}


def places_for_device(
    equipment_doc: dict[str, Any], device_key: str
) -> list[dict[str, Any]]:
    """Return registry ``places`` for a Stage 4 device_key, if attached.

    Resolves instance keys (``class_t_1``, ``bg_zeus_sr_2``) to the inventory
    row's ``device_key`` / ``catalog_key`` when needed.
    """
    key = str(device_key or "")
    if not key:
        return []
    rows = list(equipment_doc.get("equipment") or [])

    def _places(row: dict[str, Any]) -> list[dict[str, Any]]:
        places = row.get("places")
        return list(places) if isinstance(places, list) else []

    for row in rows:
        if str(row.get("device_key") or "") == key:
            return _places(row)

    # Instance keys: class_t_1 → class_t, bg_zeus_sr_2 → bg_zeus_sr
    base = key
    while True:
        stripped = re.sub(r"_\d+$", "", base)
        if stripped == base:
            break
        base = stripped
        for row in rows:
            if str(row.get("device_key") or "") == base:
                return _places(row)
            if str(row.get("catalog_key") or "") == base:
                return _places(row)

    for row in rows:
        if str(row.get("catalog_key") or "") == key:
            return _places(row)
    return []


# --------------------------------------------------------------------------- #
# DB -> composer adapter
# --------------------------------------------------------------------------- #

def build_equipment_doc_from_db(conn: Connection, vessel_id: str) -> dict[str, Any]:
    """Reconstruct ``equipment_doc`` for a vessel from the Stage 4 substrate.

    When ``interaction_profile.equipment_id`` is set and the vessel has matching
    ``vessel_equipment`` installs, each equipment row may gain a ``places`` list
    (registry locations). Composers that ignore ``places`` stay byte-identical to
    the fixture path; the transform emits an Equipment Locations table when
    places are present.
    """
    facts_row = conn.execute(
        text("SELECT facts FROM vessel_stage4_facts WHERE vessel_id = :v"),
        {"v": vessel_id},
    ).fetchone()
    doc: dict[str, Any] = dict(_as_json(facts_row[0]) if facts_row else {})

    eq_rows = conn.execute(
        text(
            """
            SELECT row FROM vessel_stage4_equipment
            WHERE vessel_id = :v ORDER BY ordinal, device_key
            """
        ),
        {"v": vessel_id},
    ).fetchall()
    doc["equipment"] = [_as_json(r[0]) for r in eq_rows]
    doc.setdefault("relations", [])
    _attach_registry_places(conn, vessel_id, doc)
    return doc


def _attach_registry_places(
    conn: Connection, vessel_id: str, doc: dict[str, Any]
) -> None:
    """Attach ``places`` onto equipment rows from admin ``vessel_equipment``."""
    place_rows = conn.execute(
        text(
            """
            SELECT
                vse.device_key,
                ve.zone::text,
                ve.sub_zone,
                ve.hull_side,
                ve.detail,
                ve.zone_instance
            FROM vessel_stage4_equipment vse
            JOIN interaction_profile ip ON ip.profile_key = vse.profile_key
            JOIN vessel_equipment ve
              ON ve.equipment_id = ip.equipment_id
             AND ve.vessel_id = vse.vessel_id
            WHERE vse.vessel_id = :v
              AND ip.equipment_id IS NOT NULL
            ORDER BY vse.ordinal, vse.device_key, ve.zone_instance
            """
        ),
        {"v": vessel_id},
    ).fetchall()

    by_key: dict[str, list[dict[str, Any]]] = {}
    for device_key, zone, sub_zone, hull_side, detail, zone_instance in place_rows:
        label = generate_label(zone, sub_zone, hull_side, detail) or (
            zone_instance or ""
        )
        by_key.setdefault(str(device_key), []).append(
            {
                "zone": zone,
                "sub_zone": sub_zone,
                "hull_side": hull_side,
                "detail": detail,
                "zone_instance": zone_instance,
                "location_label": label,
            }
        )

    for eq in doc.get("equipment") or []:
        places = by_key.get(str(eq.get("device_key") or ""))
        if places:
            eq["places"] = places


def build_profiles_from_db(conn: Connection, vessel_id: str) -> dict[str, Any]:
    """Reconstruct the ``{profile_key: profile}`` dict for a vessel."""
    prof_rows = conn.execute(
        text(
            """
            SELECT ip.profile_key, ip.profile
            FROM interaction_profile ip
            JOIN (
                SELECT DISTINCT profile_key
                FROM vessel_stage4_equipment WHERE vessel_id = :v
            ) aboard ON aboard.profile_key = ip.profile_key
            """
        ),
        {"v": vessel_id},
    ).fetchall()

    rel_rows = conn.execute(
        text(
            """
            SELECT src_device_key, edge_type, dst_device_key, attrs
            FROM vessel_equipment_relation
            WHERE vessel_id = :v
            ORDER BY src_device_key, edge_type, ordinal
            """
        ),
        {"v": vessel_id},
    ).fetchall()

    relations: dict[str, dict[str, list[tuple[str | None, dict[str, Any]]]]] = {}
    for src, edge_type, dst, attrs in rel_rows:
        relations.setdefault(src, {}).setdefault(edge_type, []).append(
            (dst, _as_json(attrs))
        )

    profiles: dict[str, Any] = {}
    for profile_key, profile in prof_rows:
        profiles[profile_key] = reinline_edges(
            _as_json(profile), relations.get(profile_key, {})
        )
    return profiles


def _as_json(value: Any) -> Any:
    """SQLAlchemy JSONB comes back parsed; be tolerant of str payloads too."""
    if isinstance(value, (dict, list)):
        return value
    if value is None:
        return {}
    return json.loads(value)
