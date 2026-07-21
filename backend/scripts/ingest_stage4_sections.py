#!/usr/bin/env python3
"""Ingest frozen Stage 4 composer sections into the live guide pipeline.

Composes the system chapters (batteries+solar, controls, electrical, nav) from a
vessel fixture, transforms them to ``SystemModule`` payloads, and writes them as
``draft`` rows in ``guide_content`` under a fresh ``guide_generation_run`` — the
same tables the admin generate→approve→publish flow uses. Composer audit trail
attaches to the run (decision 2); ``fact_queries`` land in ``owner_question``.

Phase 1 seam: composition input is the *fixture* (``fixtures/pipeline/<dir>``),
not the DB. The run's input snapshot is still recorded for the target vessel.

Usage (from backend/):
  python scripts/ingest_stage4_sections.py --slug supernova
  python scripts/ingest_stage4_sections.py --slug supernova --fixture outremer
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

_BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_BACKEND))

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402
from guide_generation import (  # noqa: E402
    GuideGenerationError,
    _complete_generation_run,
    _insert_generation_run,
    _save_generated_draft,
    _validate_module_payload,
    create_input_snapshot,
)
from owner_questions import upsert_owner_questions  # noqa: E402
from stage4_sections import PUBLISHED_SECTIONS, build_vessel_modules  # noqa: E402

_MODEL_ID = "stage4_composer"


def _attach_run_metadata(conn, run_id: str, metadata: dict) -> None:
    conn.execute(
        text(
            """
            UPDATE guide_generation_run
            SET metadata = CAST(:metadata AS jsonb)
            WHERE id = :run_id
            """
        ),
        {"metadata": json.dumps(metadata, ensure_ascii=False), "run_id": run_id},
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slug", required=True, help="Target vessel slug")
    parser.add_argument(
        "--fixture",
        default="outremer",
        help="Fixture dir under fixtures/pipeline (default: outremer)",
    )
    parser.add_argument("--created-by", default="ingest_stage4_sections.py")
    parser.add_argument(
        "--trigger",
        default="regenerate",
        choices=("onboarding", "regenerate", "import"),
    )
    args = parser.parse_args()

    fixture_dir = _BACKEND / "fixtures" / "pipeline" / args.fixture
    if not (fixture_dir / "equipment.json").is_file():
        raise SystemExit(f"Fixture not found: {fixture_dir}")

    # Compose + transform up front so a composer failure never touches the DB.
    modules, metadata = build_vessel_modules(fixture_dir)
    for sid in PUBLISHED_SECTIONS:
        _validate_module_payload("system", sid, modules[sid])

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

        snapshot_id = create_input_snapshot(conn, vessel_id)

        written = []
        questions = 0
        for sid in PUBLISHED_SECTIONS:
            run_id = _insert_generation_run(
                conn,
                vessel_id=vessel_id,
                snapshot_id=snapshot_id,
                content_type="system",
                content_key=sid,
                trigger=args.trigger,
                prompt_refs=[],
                model_id=_MODEL_ID,
            )
            _attach_run_metadata(conn, run_id, metadata[sid])
            module_id, reused = _save_generated_draft(
                conn,
                vessel_id=vessel_id,
                content_type="system",
                content_key=sid,
                payload=modules[sid],
                run_id=run_id,
                diff_against_id=None,
                created_by=args.created_by,
            )
            _complete_generation_run(conn, run_id)
            questions += upsert_owner_questions(
                conn,
                vessel_id=vessel_id,
                section=sid,
                run_id=run_id,
                fact_queries=metadata[sid].get("fact_queries"),
            )
            written.append((sid, module_id, reused))

    print(f"Ingested Stage 4 sections for {vessel_name} ({args.slug})")
    print(f"  fixture: {args.fixture}  snapshot_id: {snapshot_id}")
    for sid, module_id, reused in written:
        tag = " (updated)" if reused else " (new)"
        print(f"  draft system/{sid} module_id={module_id}{tag}")
    print(f"  owner questions upserted: {questions}")
    print(
        f"\nNext: review drafts at /admin/vessels/{vessel_id}/guide, "
        "then Approve and Publish."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except GuideGenerationError as exc:
        raise SystemExit(str(exc)) from exc
