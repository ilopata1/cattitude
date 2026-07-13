#!/usr/bin/env python3
"""
Import equipment registry CSVs from data/ into Postgres.

Usage (from backend/):
  python scripts/import_registry.py
  python scripts/import_registry.py --dry-run
  python scripts/import_registry.py --data-dir ../data
  python scripts/import_registry.py --equipment-csv path/to/my_equipment.csv
  python scripts/import_registry.py --add-equipment-csv path/to/new_items.csv
  python scripts/import_registry.py --add-equipment-csv new_items.csv --vessel-slug cattitude

Requires migrations through 015 (option_pack_child_pack).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402
from registry_import import (  # noqa: E402
    ImportReport,
    RegistryImportError,
    format_report,
    import_registry_core,
    import_registry_links,
    link_equipment_to_vessel,
    load_csv,
    validate_csv_bundle,
    validate_registry,
    _warn_pack_coverage,
)

# Keep remote Postgres connections alive during long imports (e.g. Railway).
_PG_CONNECT_ARGS = {
    "connect_timeout": 30,
    "keepalives": 1,
    "keepalives_idle": 30,
    "keepalives_interval": 10,
    "keepalives_count": 5,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import registry CSVs into Postgres.")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data",
        help="Directory containing registry CSV files (default: repo data/)",
    )
    parser.add_argument(
        "--equipment-csv",
        type=Path,
        default=None,
        help=(
            "Path to an equipment registry CSV to use instead of "
            "<data-dir>/equipment_registry.csv"
        ),
    )
    parser.add_argument(
        "--add-equipment-csv",
        type=Path,
        default=None,
        help=(
            "Path to a partial equipment CSV merged on top of the registry: "
            "rows with a matching (manufacturer, model) override the base "
            "registry row, new rows are appended"
        ),
    )
    parser.add_argument(
        "--vessel-slug",
        default=None,
        help=(
            "Also link the equipment from --equipment-csv or "
            "--add-equipment-csv to this vessel (vessel_equipment); the CSV "
            "may include an optional zone_instance column"
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate CSVs only; do not write to the database",
    )
    parser.add_argument(
        "--keep-links",
        action="store_true",
        help="Do not clear link tables before reloading pack relationships",
    )
    parser.add_argument(
        "--links-only",
        action="store_true",
        help="Skip hull/equipment/pack upserts; reload pack link tables only",
    )
    args = parser.parse_args()

    data_dir = args.data_dir.resolve()
    if not data_dir.is_dir():
        raise SystemExit(f"Data directory not found: {data_dir}")

    overrides = {}
    if args.equipment_csv is not None:
        equipment_csv = args.equipment_csv.resolve()
        if not equipment_csv.is_file():
            raise SystemExit(f"Equipment CSV not found: {equipment_csv}")
        overrides["equipment"] = equipment_csv

    extra_equipment_csv = None
    if args.add_equipment_csv is not None:
        extra_equipment_csv = args.add_equipment_csv.resolve()
        if not extra_equipment_csv.is_file():
            raise SystemExit(f"Equipment CSV not found: {extra_equipment_csv}")

    vessel_csv = extra_equipment_csv or overrides.get("equipment")
    if args.vessel_slug and vessel_csv is None:
        raise SystemExit(
            "--vessel-slug requires --equipment-csv or --add-equipment-csv "
            "to identify which equipment to link"
        )

    try:
        if args.dry_run:
            report = validate_registry(data_dir, overrides, extra_equipment_csv)
            if args.vessel_slug:
                report.warnings.append(
                    f"Dry run: skipped linking equipment to vessel "
                    f"{args.vessel_slug!r}"
                )
        else:
            sync_url, _ = postgres_connection_strings(settings.database_url)
            engine = create_engine(sync_url, connect_args=_PG_CONNECT_ARGS)
            bundle = validate_csv_bundle(data_dir, overrides, extra_equipment_csv)
            report = ImportReport()
            replace_links = not args.keep_links

            # Two commits: core entities (~1k upserts) then pack links (~650 rows).
            # A single long transaction often hits Railway/proxy idle timeouts.
            if not args.links_only:
                with engine.begin() as conn:
                    import_registry_core(conn, bundle, report)
            with engine.begin() as conn:
                import_registry_links(
                    conn, bundle, report, replace_links=replace_links
                )
            if args.vessel_slug:
                with engine.begin() as conn:
                    link_equipment_to_vessel(
                        conn, args.vessel_slug, load_csv(vessel_csv), report
                    )
            _warn_pack_coverage(bundle, report)
    except RegistryImportError as exc:
        raise SystemExit(f"Import failed: {exc}") from exc

    print(format_report(report))


if __name__ == "__main__":
    main()
