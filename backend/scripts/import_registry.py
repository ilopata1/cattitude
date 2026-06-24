#!/usr/bin/env python3
"""
Import equipment registry CSVs from data/ into Postgres.

Usage (from backend/):
  python scripts/import_registry.py
  python scripts/import_registry.py --dry-run
  python scripts/import_registry.py --data-dir ../data

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
    RegistryImportError,
    format_report,
    import_registry,
    validate_registry,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Import registry CSVs into Postgres.")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "data",
        help="Directory containing registry CSV files (default: repo data/)",
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
    args = parser.parse_args()

    data_dir = args.data_dir.resolve()
    if not data_dir.is_dir():
        raise SystemExit(f"Data directory not found: {data_dir}")

    try:
        if args.dry_run:
            report = validate_registry(data_dir)
        else:
            sync_url, _ = postgres_connection_strings(settings.database_url)
            engine = create_engine(sync_url)
            with engine.begin() as conn:
                report = import_registry(
                    conn,
                    data_dir,
                    replace_links=not args.keep_links,
                    dry_run=False,
                )
    except RegistryImportError as exc:
        raise SystemExit(f"Import failed: {exc}") from exc

    print(format_report(report))


if __name__ == "__main__":
    main()
