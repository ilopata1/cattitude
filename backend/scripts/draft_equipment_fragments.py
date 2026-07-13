#!/usr/bin/env python3
"""
Draft equipment guide fragments from approved, ingested manuals.

Writes a draft fragment (status=draft) for admin review. Approve in Admin →
Equipment registry or with --approve after review.

Usage (from backend/):
  python scripts/draft_equipment_fragments.py --manufacturer Yanmar --model "4JH45"
  python scripts/draft_equipment_fragments.py --equipment-id <uuid>
  python scripts/draft_equipment_fragments.py --manufacturer Yanmar --model "4JH45" --approve
  python scripts/draft_equipment_fragments.py --all-with-manuals
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
from fragment_drafting import (  # noqa: E402
    CLEARED_MANUAL_LEGAL_STATUS,
    FragmentDraftingError,
    draft_equipment_fragment,
)
from guide_equipment_fragments import (  # noqa: E402
    replace_equipment_fragment,
)


def _resolve_equipment_id(
    conn, *, equipment_id: str | None, manufacturer: str | None, model: str | None
) -> str:
    if equipment_id:
        row = conn.execute(
            text("SELECT id FROM equipment WHERE id = :id"),
            {"id": equipment_id},
        ).fetchone()
        if row is None:
            raise SystemExit(f"Equipment id {equipment_id!r} not found.")
        return str(row[0])

    if not manufacturer or not model:
        raise SystemExit("Provide --equipment-id or both --manufacturer and --model.")

    row = conn.execute(
        text(
            """
            SELECT id FROM equipment
            WHERE manufacturer = :manufacturer AND model = :model
            ORDER BY created_at
            LIMIT 1
            """
        ),
        {"manufacturer": manufacturer, "model": model},
    ).fetchone()
    if row is None:
        raise SystemExit(f"Equipment not found: {manufacturer} — {model}")
    return str(row[0])


def _equipment_with_manuals(conn) -> list[tuple[str, str, str]]:
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT e.id, e.manufacturer, e.model
            FROM equipment e
            JOIN manual_work mw ON mw.equipment_id = e.id
            JOIN manual_edition me
                ON me.manual_work_id = mw.id AND me.is_current = true
            WHERE mw.legal_status = CAST(:legal_status AS legal_status)
            ORDER BY e.manufacturer, e.model
            """
        ),
        {"legal_status": CLEARED_MANUAL_LEGAL_STATUS},
    ).fetchall()
    return [(str(row[0]), row[1], row[2]) for row in rows]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Draft equipment guide fragments from approved manuals."
    )
    parser.add_argument("--equipment-id", default="")
    parser.add_argument("--manufacturer", default="")
    parser.add_argument("--model", default="")
    parser.add_argument(
        "--systems",
        default="",
        help="Comma-separated system ids (default: all matching equipment category)",
    )
    parser.add_argument("--no-fix-cards", action="store_true")
    parser.add_argument(
        "--approve",
        action="store_true",
        help="Mark fragment approved immediately (skip admin review)",
    )
    parser.add_argument(
        "--all-with-manuals",
        action="store_true",
        help="Draft for every equipment row with an approved ingested manual",
    )
    parser.add_argument("--created-by", default="draft_equipment_fragments.py")
    args = parser.parse_args()

    wanted_systems = [s.strip() for s in args.systems.split(",") if s.strip()] or None
    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)

    targets: list[tuple[str, str, str]] = []
    with engine.connect() as conn:
        if args.all_with_manuals:
            targets = _equipment_with_manuals(conn)
        else:
            equipment_id = _resolve_equipment_id(
                conn,
                equipment_id=args.equipment_id or None,
                manufacturer=args.manufacturer or None,
                model=args.model or None,
            )
            row = conn.execute(
                text("SELECT manufacturer, model FROM equipment WHERE id = :id"),
                {"id": equipment_id},
            ).fetchone()
            targets = [(equipment_id, row[0], row[1])]

    if not targets:
        raise SystemExit("No equipment targets found.")

    drafted = 0
    for equipment_id, manufacturer, model in targets:
        print(f"\n{manufacturer} — {model} ({equipment_id})")
        try:
            with engine.begin() as conn:
                fragment, citations = draft_equipment_fragment(
                    conn,
                    equipment_id,
                    system_ids=wanted_systems,
                    include_fix_cards=not args.no_fix_cards,
                )
                status = "approved" if args.approve else "draft"
                replace_equipment_fragment(
                    conn,
                    equipment_id,
                    fragment,
                    created_by=args.created_by,
                    status=status,
                    source_citations=citations,
                )
        except FragmentDraftingError as exc:
            print(f"  skip: {exc}")
            continue

        systems = list((fragment.get("system_sections") or {}).keys())
        fixes = list((fragment.get("fix_card_overrides") or {}).keys())
        print(f"  drafted ({status}): systems={systems or '—'}, fix_cards={fixes or '—'}")
        print(f"  excerpts: {len(citations.get('excerpts') or [])}")
        drafted += 1

    print(f"\nDone: {drafted}/{len(targets)} fragment(s) drafted.")


if __name__ == "__main__":
    main()
