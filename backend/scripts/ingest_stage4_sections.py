#!/usr/bin/env python3
"""Run Stage 4 generation for a vessel (Phase 3 CLI).

Default: compose from the Phase 2 DB substrate via ``run_stage4_generation``
(same path as admin Generate). Optional ``--fixture`` composes from fixture
files instead (debug escape hatch).

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
from stage4_generation import run_stage4_generation  # noqa: E402
from stage4_sections import PUBLISHED_SECTIONS, build_vessel_modules  # noqa: E402


def _run_from_fixture(conn, vessel_id: str, fixture: str, *, created_by: str, trigger: str):
    fixture_dir = _BACKEND / "fixtures" / "pipeline" / fixture
    if not (fixture_dir / "equipment.json").is_file():
        raise SystemExit(f"Fixture not found: {fixture_dir}")

    modules, metadata = build_vessel_modules(fixture_dir)
    for sid in PUBLISHED_SECTIONS:
        _validate_module_payload("system", sid, modules[sid])

    snapshot_id = create_input_snapshot(conn, vessel_id)
    results = []
    for sid in PUBLISHED_SECTIONS:
        run_id = _insert_generation_run(
            conn,
            vessel_id=vessel_id,
            snapshot_id=snapshot_id,
            content_type="system",
            content_key=sid,
            trigger=trigger,
            prompt_refs=[],
            model_id="stage4_composer",
        )
        conn.execute(
            text(
                """
                UPDATE guide_generation_run
                SET metadata = CAST(:metadata AS jsonb)
                WHERE id = :run_id
                """
            ),
            {
                "metadata": json.dumps(metadata[sid], ensure_ascii=False),
                "run_id": run_id,
            },
        )
        module_id, reused = _save_generated_draft(
            conn,
            vessel_id=vessel_id,
            content_type="system",
            content_key=sid,
            payload=modules[sid],
            run_id=run_id,
            diff_against_id=None,
            created_by=created_by,
        )
        _complete_generation_run(conn, run_id)
        upsert_owner_questions(
            conn,
            vessel_id=vessel_id,
            section=sid,
            run_id=run_id,
            fact_queries=metadata[sid].get("fact_queries"),
        )
        results.append(
            {
                "content_key": sid,
                "status": "completed",
                "module_id": module_id,
                "reused_draft": reused,
            }
        )
    return results, f"fixture:{fixture}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--slug", required=True, help="Target vessel slug")
    parser.add_argument(
        "--fixture",
        default=None,
        help="Debug: compose from fixtures/pipeline/<dir> instead of DB substrate",
    )
    parser.add_argument("--created-by", default="ingest_stage4_sections.py")
    parser.add_argument(
        "--trigger",
        default="regenerate",
        choices=("onboarding", "regenerate", "import"),
    )
    args = parser.parse_args()

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

        if args.fixture:
            results, source = _run_from_fixture(
                conn,
                vessel_id,
                args.fixture,
                created_by=args.created_by,
                trigger=args.trigger,
            )
        else:
            results = run_stage4_generation(
                conn,
                vessel_id,
                created_by=args.created_by,
                trigger=args.trigger,
            )
            source = "db_substrate"

    written = [r for r in results if r.get("status") == "completed"]
    failed = [r for r in results if r.get("status") == "failed"]
    if failed and not written:
        raise SystemExit(failed[0].get("error") or "Stage 4 generation failed")

    print(f"Generated Stage 4 sections for {vessel_name} ({args.slug})")
    print(f"  source: {source}")
    for r in written:
        tag = " (updated)" if r.get("reused_draft") else " (new)"
        print(f"  draft system/{r['content_key']} module_id={r.get('module_id')}{tag}")
    for r in failed:
        print(f"  FAILED system/{r['content_key']}: {r.get('error')}")
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
