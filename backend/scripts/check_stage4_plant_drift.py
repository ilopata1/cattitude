#!/usr/bin/env python3
"""Fail when Stage 4 DB plant drifts from the pipeline fixture.

Stage 4 compose reads ``vessel_stage4_equipment`` (seeded from the fixture),
not admin ``vessel_equipment``. After Playbook 1 promote / Playbook 3 inventory
events that change ``fixtures/pipeline/<fixture>/equipment.json``, re-seed:

  python scripts/seed_stage4_substrate.py --slug supernova --fixture outremer

This check compares fixture ``device_key``s to the live substrate for a vessel
slug. Optional ``--warn-admin`` reports registry installs that have a linked
``interaction_profile`` but are absent from Stage 4 plant (informational —
admin often carries gear Stage 4 does not compose yet).

Usage (from backend/):
  python scripts/check_stage4_plant_drift.py --slug supernova
  python scripts/check_stage4_plant_drift.py --slug supernova --fixture outremer
  python scripts/check_stage4_plant_drift.py --slug supernova --warn-admin
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_BACKEND))

from sqlalchemy import create_engine, text  # noqa: E402

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402


def _fixture_keys(fixture_dir: Path) -> set[str]:
    doc = json.loads((fixture_dir / "equipment.json").read_text(encoding="utf-8"))
    keys: set[str] = set()
    for row in doc.get("equipment") or []:
        if not isinstance(row, dict):
            continue
        key = str(row.get("device_key") or "").strip()
        if key:
            keys.add(key)
    return keys


def _db_keys(conn, vessel_id: str) -> set[str]:
    rows = conn.execute(
        text(
            """
            SELECT device_key FROM vessel_stage4_equipment
            WHERE vessel_id = :v
            """
        ),
        {"v": vessel_id},
    ).fetchall()
    return {str(r[0]) for r in rows}


def _admin_linked_missing(conn, vessel_id: str, stage4_profile_keys: set[str]) -> list[tuple]:
    """Registry installs linked to a profile but not in Stage 4 plant."""
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT e.manufacturer, e.model, ip.profile_key
            FROM vessel_equipment ve
            JOIN equipment e ON e.id = ve.equipment_id
            JOIN interaction_profile ip ON ip.equipment_id = e.id
            WHERE ve.vessel_id = :v
              AND ip.profile_key NOT IN (
                SELECT DISTINCT profile_key
                FROM vessel_stage4_equipment
                WHERE vessel_id = :v
              )
            ORDER BY 1, 2
            """
        ),
        {"v": vessel_id},
    ).fetchall()
    return list(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--fixture", default="outremer")
    parser.add_argument(
        "--warn-admin",
        action="store_true",
        help="Print admin installs with linked profiles absent from Stage 4 plant",
    )
    args = parser.parse_args()

    fixture_dir = _BACKEND / "fixtures" / "pipeline" / args.fixture
    if not (fixture_dir / "equipment.json").is_file():
        raise SystemExit(f"missing fixture equipment.json under {fixture_dir}")

    fixture_keys = _fixture_keys(fixture_dir)
    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)

    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, name FROM vessels WHERE slug = :slug"),
            {"slug": args.slug},
        ).fetchone()
        if row is None:
            raise SystemExit(f"Vessel slug {args.slug!r} not found.")
        vessel_id, vessel_name = str(row[0]), row[1]
        db_keys = _db_keys(conn, vessel_id)

        missing_in_db = sorted(fixture_keys - db_keys)
        extra_in_db = sorted(db_keys - fixture_keys)

        print(f"Stage 4 plant drift — {vessel_name} ({args.slug})")
        print(f"  fixture: {args.fixture} ({len(fixture_keys)} device_keys)")
        print(f"  substrate: {len(db_keys)} device_keys")

        if missing_in_db:
            print("  MISSING from substrate (in fixture):")
            for key in missing_in_db:
                print(f"    - {key}")
        if extra_in_db:
            print("  EXTRA in substrate (not in fixture):")
            for key in extra_in_db:
                print(f"    - {key}")

        if args.warn_admin:
            orphan = _admin_linked_missing(conn, vessel_id, db_keys)
            if orphan:
                print("  WARN admin installs with profile but not Stage 4 plant:")
                for mfr, model, pk in orphan:
                    print(f"    - {mfr} {model} (profile_key={pk})")
            else:
                print("  admin linked orphans: none")

        if missing_in_db or extra_in_db:
            print(
                "\nFAIL — re-seed:\n"
                f"  python scripts/seed_stage4_substrate.py "
                f"--slug {args.slug} --fixture {args.fixture}"
            )
            return 1

        print("OK — fixture plant matches Stage 4 substrate")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
