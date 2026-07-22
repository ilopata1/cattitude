#!/usr/bin/env python3
"""Seed the Phase 2 Stage 4 substrate (migration 023) from a pipeline fixture.

Migrates ``fixtures/pipeline/<fixture>/{equipment,profiles}.json`` into the
DB-native substrate for a target vessel:
  * ``interaction_profile`` — one global row per model ``profile_key`` with
    cross-device edges **stripped** (decision 2). Upserted; sister ships reuse.
  * ``vessel_stage4_equipment`` — the vessel's equipment rows, verbatim.
  * ``vessel_equipment_relation`` — the stripped edges, per vessel.
  * ``vessel_stage4_facts`` — the remaining equipment_doc top-level surface.

Idempotent: interaction_profile is upserted by ``profile_key``; the vessel's
substrate rows are replaced wholesale.

Usage (from backend/):
  python scripts/seed_stage4_substrate.py --slug supernova
  python scripts/seed_stage4_substrate.py --slug supernova --fixture outremer
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_BACKEND))

from sqlalchemy import create_engine, text  # noqa: E402

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402
from stage4_substrate import (  # noqa: E402
    iter_relation_rows,
    link_profiles_to_registry,
    split_profile_edges,
)

# equipment_doc top-level keys held per vessel; ``equipment`` lives in its own
# table, so it is excluded from the facts blob.
_FACT_KEYS_EXCLUDED = {"equipment"}


def _content_hash(payload: dict) -> str:
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def _upsert_profiles(conn, profiles: dict[str, dict]) -> int:
    written = 0
    for profile_key, profile in profiles.items():
        capability, _edges = split_profile_edges(profile)
        device = profile.get("device") or {}
        conn.execute(
            text(
                """
                INSERT INTO interaction_profile (
                    profile_key, entity_kind, manufacturer, model,
                    documented_version, profile, content_hash
                )
                VALUES (
                    :profile_key, :entity_kind, :manufacturer, :model,
                    :documented_version, CAST(:profile AS jsonb), :content_hash
                )
                ON CONFLICT (profile_key) DO UPDATE SET
                    entity_kind = EXCLUDED.entity_kind,
                    manufacturer = EXCLUDED.manufacturer,
                    model = EXCLUDED.model,
                    documented_version = EXCLUDED.documented_version,
                    profile = EXCLUDED.profile,
                    content_hash = EXCLUDED.content_hash,
                    updated_at = now()
                """
            ),
            {
                "profile_key": profile_key,
                "entity_kind": str(profile.get("entity_kind") or "device"),
                "manufacturer": device.get("manufacturer"),
                "model": device.get("model"),
                "documented_version": profile.get("documented_version"),
                "profile": json.dumps(capability, ensure_ascii=False),
                "content_hash": _content_hash(capability),
            },
        )
        written += 1
    return written


def _seed_vessel(conn, vessel_id: str, equipment_doc: dict, profiles: dict) -> dict:
    conn.execute(
        text("DELETE FROM vessel_stage4_equipment WHERE vessel_id = :v"),
        {"v": vessel_id},
    )
    conn.execute(
        text("DELETE FROM vessel_equipment_relation WHERE vessel_id = :v"),
        {"v": vessel_id},
    )

    equipment = list(equipment_doc.get("equipment") or [])
    for ordinal, row in enumerate(equipment):
        device_key = str(row["device_key"])
        profile_key = str(row.get("catalog_key") or device_key)
        conn.execute(
            text(
                """
                INSERT INTO vessel_stage4_equipment (
                    vessel_id, device_key, profile_key, entity_kind, ordinal, row
                )
                VALUES (
                    :v, :device_key, :profile_key, :entity_kind, :ordinal,
                    CAST(:row AS jsonb)
                )
                """
            ),
            {
                "v": vessel_id,
                "device_key": device_key,
                "profile_key": profile_key,
                "entity_kind": str(row.get("entity_kind") or "device"),
                "ordinal": ordinal,
                "row": json.dumps(row, ensure_ascii=False),
            },
        )

    # Relations are extracted from each aboard model's profile (edges are
    # model-inherent; decision 2 stores them per vessel, keyed by profile_key).
    aboard_profile_keys = {
        str(r.get("catalog_key") or r["device_key"]) for r in equipment
    }
    relation_count = 0
    for profile_key in aboard_profile_keys:
        profile = profiles.get(profile_key)
        if not isinstance(profile, dict):
            continue
        _capability, edges = split_profile_edges(profile)
        for rel in iter_relation_rows(profile_key, edges):
            conn.execute(
                text(
                    """
                    INSERT INTO vessel_equipment_relation (
                        vessel_id, src_device_key, edge_type, dst_device_key,
                        ordinal, attrs
                    )
                    VALUES (
                        :v, :src, :edge_type, :dst, :ordinal, CAST(:attrs AS jsonb)
                    )
                    """
                ),
                {
                    "v": vessel_id,
                    "src": rel["src_device_key"],
                    "edge_type": rel["edge_type"],
                    "dst": rel["dst_device_key"],
                    "ordinal": rel["ordinal"],
                    "attrs": json.dumps(rel["attrs"], ensure_ascii=False),
                },
            )
            relation_count += 1

    facts = {
        k: v for k, v in equipment_doc.items() if k not in _FACT_KEYS_EXCLUDED
    }
    conn.execute(
        text(
            """
            INSERT INTO vessel_stage4_facts (vessel_id, facts)
            VALUES (:v, CAST(:facts AS jsonb))
            ON CONFLICT (vessel_id) DO UPDATE SET
                facts = EXCLUDED.facts, updated_at = now()
            """
        ),
        {"v": vessel_id, "facts": json.dumps(facts, ensure_ascii=False)},
    )

    return {
        "equipment": len(equipment),
        "relations": relation_count,
        "profile_keys": len(aboard_profile_keys),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slug", required=True, help="Target vessel slug")
    parser.add_argument(
        "--fixture",
        default="outremer",
        help="Fixture dir under fixtures/pipeline (default: outremer)",
    )
    args = parser.parse_args()

    fixture_dir = _BACKEND / "fixtures" / "pipeline" / args.fixture
    equipment_doc = json.loads(
        (fixture_dir / "equipment.json").read_text(encoding="utf-8")
    )
    profiles = json.loads(
        (fixture_dir / "profiles.json").read_text(encoding="utf-8")
    )

    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT id, name FROM vessels WHERE slug = :slug"),
            {"slug": args.slug},
        ).fetchone()
        if row is None:
            raise SystemExit(f"Vessel slug {args.slug!r} not found.")
        vessel_id, vessel_name = str(row[0]), row[1]

        profiles_written = _upsert_profiles(conn, profiles)
        link_stats = link_profiles_to_registry(conn)
        stats = _seed_vessel(conn, vessel_id, equipment_doc, profiles)

    print(f"Seeded Stage 4 substrate for {vessel_name} ({args.slug})")
    print(f"  fixture: {args.fixture}")
    print(f"  interaction_profile rows upserted: {profiles_written}")
    print(
        "  registry links: "
        f"{link_stats['linked']}/{link_stats['total']} "
        f"(cleared {link_stats['cleared']})"
    )
    print(f"  vessel_stage4_equipment rows: {stats['equipment']}")
    print(f"  vessel_equipment_relation rows: {stats['relations']}")
    print(f"  distinct profile_keys aboard: {stats['profile_keys']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
