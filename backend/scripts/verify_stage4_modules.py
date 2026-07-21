"""Stage 4 golden check: composers -> SystemModules -> live validator (+ byte-match).

Phase 1: composes the frozen sections from the Outremer fixture, transforms each
into a ``SystemModule`` (solar folded into batteries), and runs the live
``_validate_module_payload``.

Phase 2 (``--source db`` / ``--byte-match``): rebuilds the composer inputs from
the DB substrate (migration 023) and asserts the resulting modules + composer
metadata are **byte-for-byte identical** to the fixture-built output. This is the
Phase 2 acceptance gate: inputs rebuilt from Postgres reproduce the drafts.

Usage (from backend/):
  python scripts/verify_stage4_modules.py                 # fixture only (Phase 1)
  python scripts/verify_stage4_modules.py --byte-match --slug supernova
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_generation import GuideGenerationError, _validate_module_payload
from stage4_sections import (
    PUBLISHED_SECTIONS,
    build_modules_from_context,
    load_vessel_context,
    load_vessel_context_from_db,
)

VESSEL_DIR = _BACKEND / "fixtures" / "pipeline" / "outremer"
OUT_DIR = _BACKEND / "fixtures" / "pipeline" / "scratch"
OUT_JSON = OUT_DIR / "stage4_modules.json"


def _canon(payload: object) -> str:
    return json.dumps(payload, sort_keys=True, ensure_ascii=False)


def _validate_and_report(modules: dict, metadata: dict) -> list[str]:
    failures: list[str] = []
    for sid in PUBLISHED_SECTIONS:
        module = modules[sid]
        try:
            _validate_module_payload("system", sid, module)
        except GuideGenerationError as exc:
            failures.append(f"{sid}: {exc}")
            status = "FAIL"
        else:
            status = "ok"
        section_titles = ", ".join(s["t"] for s in module["sections"])
        fq = len(metadata[sid].get("fact_queries") or [])
        print(f"  [{status:4}] {sid:10} — {len(module['sections'])} sections "
              f"({section_titles}) · {fq} fact queries")
    return failures


def _byte_match(slug: str) -> int:
    from sqlalchemy import create_engine, text

    from config import settings
    from db import postgres_connection_strings

    fixture_modules, fixture_meta = build_modules_from_context(
        load_vessel_context(VESSEL_DIR)
    )

    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id FROM vessels WHERE slug = :slug"), {"slug": slug}
        ).fetchone()
        if row is None:
            raise SystemExit(f"Vessel slug {slug!r} not found.")
        db_modules, db_meta = build_modules_from_context(
            load_vessel_context_from_db(conn, str(row[0]))
        )

    print(f"Byte-match: fixture (outremer) vs DB substrate ({slug})\n")
    mismatches: list[str] = []
    for sid in PUBLISHED_SECTIONS:
        module_ok = _canon(fixture_modules[sid]) == _canon(db_modules[sid])
        # Compare composer audit trail too (provenance/evaluation/fact_queries).
        meta_ok = _canon(fixture_meta[sid]) == _canon(db_meta[sid])
        status = "ok" if (module_ok and meta_ok) else "DIFF"
        detail = ""
        if not module_ok:
            detail += " module"
        if not meta_ok:
            detail += " metadata"
        if detail:
            mismatches.append(f"{sid}:{detail}")
        print(f"  [{status:4}] {sid:10} — module{'=' if module_ok else '≠'} "
              f"metadata{'=' if meta_ok else '≠'}")

    if mismatches:
        print("\nMISMATCHES:")
        for line in mismatches:
            print(f"  - {line}")
        return 1
    print(f"\nAll {len(PUBLISHED_SECTIONS)} DB-built modules match the fixture "
          "byte-for-byte.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--byte-match",
        action="store_true",
        help="Compare DB-substrate-built modules against fixture-built (Phase 2).",
    )
    parser.add_argument(
        "--slug", default="supernova", help="Vessel slug for --byte-match."
    )
    args = parser.parse_args()

    if args.byte_match:
        return _byte_match(args.slug)

    modules, metadata = build_modules_from_context(load_vessel_context(VESSEL_DIR))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(modules, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    failures = _validate_and_report(modules, metadata)
    print(f"\nWrote {OUT_JSON}")
    if failures:
        print("\nFAILURES:")
        for line in failures:
            print(f"  - {line}")
        return 1
    print(f"\nAll {len(PUBLISHED_SECTIONS)} sections transform to valid SystemModules.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
