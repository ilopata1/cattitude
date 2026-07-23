"""Smoke / negative checks for vessel-scoped Ask allow-list.

Usage (from backend/):
  python scripts/verify_ask_vessel_scope.py
  python scripts/verify_ask_vessel_scope.py --slug supernova
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from uuid import uuid4

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from sqlalchemy import create_engine, text

from config import settings
from db import postgres_connection_strings
from manual_titles import list_manual_ids_for_vessel
from query import _manual_id_filters


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slug", default="supernova")
    args = parser.parse_args()

    failures: list[str] = []
    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url, pool_pre_ping=True)

    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id FROM vessels WHERE slug = :slug"),
            {"slug": args.slug},
        ).fetchone()
        if row is None:
            print(f"FAIL — vessel slug {args.slug!r} not found")
            return 1
        vessel_id = str(row[0])

        ids = list_manual_ids_for_vessel(conn, vessel_id)
        print(f"OK — {args.slug} allow-list size={len(ids)}")
        for mid in ids[:12]:
            title = conn.execute(
                text("SELECT title FROM manual_work WHERE id = :id"),
                {"id": mid},
            ).scalar()
            print(f"  - {mid}  {title}")

        if not ids:
            failures.append(
                f"{args.slug} has no cleared inventory manuals "
                "(Ask would 422 — expected only if inventory truly has none)"
            )

        # Inventory manuals must all be cleared + current edition.
        for mid in ids:
            ok = conn.execute(
                text(
                    """
                    SELECT 1
                    FROM manual_work mw
                    JOIN manual_edition me
                      ON me.manual_work_id = mw.id AND me.is_current = true
                    WHERE mw.id = :id
                      AND mw.legal_status = CAST('cleared' AS legal_status)
                    """
                ),
                {"id": mid},
            ).fetchone()
            if not ok:
                failures.append(f"allow-list id {mid} is not cleared+current")

        # Every allow-list id must belong to equipment installed on the vessel.
        for mid in ids:
            on_vessel = conn.execute(
                text(
                    """
                    SELECT 1
                    FROM vessel_equipment ve
                    JOIN equipment e ON e.id = ve.equipment_id
                    JOIN manual_work_equipment mwe ON mwe.equipment_id = e.id
                    JOIN manual_work mw ON mw.id = mwe.manual_work_id
                    WHERE ve.vessel_id = :v AND mw.id = :mid
                    """
                ),
                {"v": vessel_id, "mid": mid},
            ).fetchone()
            if not on_vessel:
                failures.append(f"allow-list id {mid} not on vessel inventory")

        # Empty / unknown vessel → empty allow-list (fail-closed input).
        empty = list_manual_ids_for_vessel(conn, str(uuid4()))
        if empty:
            failures.append("unknown vessel returned non-empty allow-list")
        else:
            print("OK — unknown vessel allow-list is empty")

    # Filter construction sanity (no DB / vector call).
    if ids:
        filters = _manual_id_filters(ids)
        if len(filters.filters) != len(ids):
            failures.append("MetadataFilters count mismatch")
        else:
            print("OK — MetadataFilters built for allow-list")

    if failures:
        print("FAIL:")
        for line in failures:
            print(f"  - {line}")
        return 1

    print("OK — Ask vessel scope checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
