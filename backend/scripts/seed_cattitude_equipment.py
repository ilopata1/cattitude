#!/usr/bin/env python3
"""
Link Cattitude vessel_equipment from data/cattitude_vessel_equipment.csv.

Run after registry import:
  python scripts/import_registry.py
  python scripts/seed_cattitude_equipment.py

Options:
  --replace     Remove existing vessel_equipment for Cattitude before linking
  --dry-run     Print planned links without writing
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402

VESSEL_SLUG = "cattitude"
DEFAULT_MANIFEST = (
    Path(__file__).resolve().parents[2] / "data" / "cattitude_vessel_equipment.csv"
)


def load_manifest(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def resolve_equipment_id(
    conn, manufacturer: str, model: str
) -> str | None:
    row = conn.execute(
        text(
            """
            SELECT id FROM equipment
            WHERE manufacturer = :manufacturer AND model = :model
            """
        ),
        {"manufacturer": manufacturer.strip(), "model": model.strip()},
    ).fetchone()
    return str(row[0]) if row else None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed Cattitude vessel_equipment from manifest CSV."
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST,
        help="CSV with manufacturer, model, zone_instance columns",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete all existing Cattitude vessel_equipment before linking",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate manifest and print actions only",
    )
    args = parser.parse_args()

    manifest_path = args.manifest.resolve()
    if not manifest_path.is_file():
        raise SystemExit(f"Manifest not found: {manifest_path}")

    rows = load_manifest(manifest_path)
    if not rows:
        raise SystemExit(f"Manifest is empty: {manifest_path}")

    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)

    with engine.connect() as conn:
        vessel = conn.execute(
            text("SELECT id, name FROM vessels WHERE slug = :slug"),
            {"slug": VESSEL_SLUG},
        ).fetchone()
        if vessel is None:
            raise SystemExit(
                f"Vessel slug {VESSEL_SLUG!r} not found. Run seed_dev_data.py first."
            )
        vessel_id = str(vessel[0])

        missing: list[str] = []
        resolved: list[tuple[str, str, str, str]] = []
        for row in rows:
            manufacturer = (row.get("manufacturer") or "").strip()
            model = (row.get("model") or "").strip()
            zone_instance = (row.get("zone_instance") or "default").strip() or "default"
            if not manufacturer or not model:
                missing.append(f"blank row: {row}")
                continue
            equipment_id = resolve_equipment_id(conn, manufacturer, model)
            if equipment_id is None:
                missing.append(f"{manufacturer} / {model}")
            else:
                resolved.append(
                    (equipment_id, manufacturer, model, zone_instance)
                )

        if missing:
            print("Missing registry rows (run import_registry.py after updating CSV):")
            for item in missing:
                print(f"  - {item}")
            raise SystemExit(1)

        if args.dry_run:
            print(f"Dry run: would link {len(resolved)} equipment rows to {VESSEL_SLUG}")
            for _, manufacturer, model, zone_instance in resolved:
                print(f"  {manufacturer} / {model} [{zone_instance}]")
            return

    linked = 0
    with engine.begin() as conn:
        if args.replace:
            conn.execute(
                text("DELETE FROM vessel_equipment WHERE vessel_id = :vessel_id"),
                {"vessel_id": vessel_id},
            )

        for equipment_id, manufacturer, model, zone_instance in resolved:
            conn.execute(
                text(
                    """
                    INSERT INTO vessel_equipment (
                        vessel_id, equipment_id, zone_instance, confirmed_by
                    )
                    VALUES (
                        :vessel_id, :equipment_id, :zone_instance,
                        CAST('team_verified' AS confirmed_by_method)
                    )
                    ON CONFLICT (vessel_id, equipment_id, zone_instance) DO UPDATE SET
                        confirmed_by = EXCLUDED.confirmed_by
                    """
                ),
                {
                    "vessel_id": vessel_id,
                    "equipment_id": equipment_id,
                    "zone_instance": zone_instance,
                },
            )
            linked += 1

    print(f"Cattitude equipment OK: linked {linked} rows (vessel_id={vessel_id})")


if __name__ == "__main__":
    main()
