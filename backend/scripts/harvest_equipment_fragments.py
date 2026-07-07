#!/usr/bin/env python3
"""
Harvest a vessel's approved system modules into equipment guide fragments.

For each system that has equipment categories, the approved/published module's
content (minus photo sections, which stay vessel-specific) is stored as a
fragment on the *primary* linked equipment row for that system. Subsequent
vessels linking the same equipment then assemble that system module from the
fragment with no LLM call.

Caveat: harvested content describes the source vessel's installation. Review
fragments on generic equipment rows (e.g. "Generic RIB tender") before relying
on them across dissimilar boats — regeneration drafts always pass through
admin review.

Usage (from backend/):
  python scripts/harvest_equipment_fragments.py --slug cattitude
  python scripts/harvest_equipment_fragments.py --slug cattitude --systems engines,water
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402
from guide_equipment_fragments import upsert_equipment_fragment  # noqa: E402
from guide_module_catalog import SYSTEM_CATALOG  # noqa: E402


def _load_approved_system_module(conn, vessel_id: str, system_id: str):
    row = conn.execute(
        text(
            """
            SELECT payload FROM guide_content
            WHERE vessel_id = :vessel_id
              AND content_type = 'system'
              AND content_key = :system_id
              AND status IN ('approved', 'published')
            ORDER BY approved_at DESC NULLS LAST, created_at DESC
            LIMIT 1
            """
        ),
        {"vessel_id": vessel_id, "system_id": system_id},
    ).fetchone()
    if row is None:
        return None
    payload = row[0]
    return json.loads(payload) if isinstance(payload, str) else payload


def _primary_equipment(conn, vessel_id: str, categories: list[str]):
    """First linked equipment row for the system, by category order then name."""
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT e.id, e.manufacturer, e.model, e.system_category
            FROM vessel_equipment ve
            JOIN equipment e ON e.id = ve.equipment_id
            WHERE ve.vessel_id = :vessel_id
              AND e.system_category = ANY(CAST(:categories AS system_category[]))
            """
        ),
        {"vessel_id": vessel_id, "categories": categories},
    ).fetchall()
    if not rows:
        return None
    order = {category: index for index, category in enumerate(categories)}
    ranked = sorted(
        rows, key=lambda r: (order.get(r[3], 99), r[1] or "", r[2] or "")
    )
    return ranked[0]


def _fragment_entry(payload: dict) -> dict | None:
    sections = [
        section
        for section in payload.get("sections") or []
        if isinstance(section, dict) and section.get("type") != "photo"
    ]
    if not sections:
        return None
    entry: dict = {"sections": sections}
    for key in ("subtitle", "summary", "learnChecks"):
        if payload.get(key):
            entry[key] = payload[key]
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Harvest approved system modules into equipment fragments."
    )
    parser.add_argument("--slug", default="cattitude", help="Source vessel slug")
    parser.add_argument(
        "--systems",
        default="",
        help="Comma-separated system ids (default: all with equipment categories)",
    )
    parser.add_argument("--created-by", default="harvest_equipment_fragments.py")
    args = parser.parse_args()

    wanted = {s.strip() for s in args.systems.split(",") if s.strip()}
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

        harvested = 0
        for system_id, meta in SYSTEM_CATALOG.items():
            categories = meta.get("equipment_categories") or []
            if not categories:
                continue
            if wanted and system_id not in wanted:
                continue

            payload = _load_approved_system_module(conn, vessel_id, system_id)
            if payload is None:
                print(f"  skip {system_id}: no approved module")
                continue
            entry = _fragment_entry(payload)
            if entry is None:
                print(f"  skip {system_id}: no non-photo sections")
                continue
            equipment = _primary_equipment(conn, vessel_id, categories)
            if equipment is None:
                print(f"  skip {system_id}: no linked equipment")
                continue

            upsert_equipment_fragment(
                conn,
                str(equipment[0]),
                {"system_sections": {system_id: entry}},
                created_by=args.created_by,
            )
            harvested += 1
            print(
                f"  harvested {system_id} -> {equipment[1]} {equipment[2]} "
                f"({len(entry['sections'])} sections)"
            )

    print(f"\nHarvest OK from {vessel_name} ({args.slug}): {harvested} system(s)")


if __name__ == "__main__":
    main()
