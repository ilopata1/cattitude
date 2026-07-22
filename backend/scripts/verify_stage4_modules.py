"""Stage 4 golden check: composers -> SystemModules -> live validator (+ oracle).

Phase 1: composes the frozen sections from the Outremer fixture, transforms each
into a ``SystemModule`` (solar folded into batteries), and runs the live
``_validate_module_payload``.

Phase 2+ (``--byte-match`` / ``--write-oracle``): composes from the DB substrate
(migration 023, including registry ``places``) and compares against a frozen
oracle for the vessel. Fixture-compose and DB-compose intentionally diverge once
composers emit registry locations — the oracle pins the DB path.

Optional ``--substrate-match`` still asserts fixture-compose == DB-compose with
``places`` stripped (substrate fidelity without location prose).

Usage (from backend/):
  python scripts/verify_stage4_modules.py
  python scripts/verify_stage4_modules.py --write-oracle --slug supernova
  python scripts/verify_stage4_modules.py --byte-match --slug supernova
  python scripts/verify_stage4_modules.py --substrate-match --slug supernova
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any

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


def _oracle_paths(slug: str) -> tuple[Path, Path]:
    return (
        OUT_DIR / f"stage4_modules_{slug}_oracle.json",
        OUT_DIR / f"stage4_modules_{slug}_oracle_meta.json",
    )


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


def _strip_places(context: dict[str, Any]) -> dict[str, Any]:
    """Deep-copy context with registry places removed (substrate-only compare)."""
    ctx = copy.deepcopy(context)
    for row in ctx.get("equipment_doc", {}).get("equipment") or []:
        if isinstance(row, dict):
            row.pop("places", None)
    return ctx


def _load_db_context(slug: str) -> dict[str, Any]:
    from sqlalchemy import create_engine, text

    from config import settings
    from db import postgres_connection_strings

    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id FROM vessels WHERE slug = :slug"), {"slug": slug}
        ).fetchone()
        if row is None:
            raise SystemExit(f"Vessel slug {slug!r} not found.")
        return load_vessel_context_from_db(conn, str(row[0]))


def _write_oracle(slug: str) -> int:
    modules, metadata = build_modules_from_context(_load_db_context(slug))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    modules_path, meta_path = _oracle_paths(slug)
    modules_path.write_text(
        json.dumps(modules, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    meta_path.write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    failures = _validate_and_report(modules, metadata)
    print(f"\nWrote {modules_path}")
    print(f"Wrote {meta_path}")
    if failures:
        print("\nFAILURES:")
        for line in failures:
            print(f"  - {line}")
        return 1
    print(f"\nOracle written for {slug} ({len(PUBLISHED_SECTIONS)} sections).")
    return 0


def _byte_match(slug: str) -> int:
    modules_path, meta_path = _oracle_paths(slug)
    if not modules_path.exists() or not meta_path.exists():
        raise SystemExit(
            f"Frozen oracle missing for {slug!r}. "
            f"Run: python scripts/verify_stage4_modules.py --write-oracle "
            f"--slug {slug}"
        )

    oracle_modules = json.loads(modules_path.read_text(encoding="utf-8"))
    oracle_meta = json.loads(meta_path.read_text(encoding="utf-8"))
    db_modules, db_meta = build_modules_from_context(_load_db_context(slug))

    print(f"Byte-match: DB substrate ({slug}) vs frozen oracle\n")
    mismatches: list[str] = []
    for sid in PUBLISHED_SECTIONS:
        module_ok = _canon(oracle_modules[sid]) == _canon(db_modules[sid])
        meta_ok = _canon(oracle_meta[sid]) == _canon(db_meta[sid])
        status = "ok" if (module_ok and meta_ok) else "DIFF"
        detail = ""
        if not module_ok:
            detail += " module"
        if not meta_ok:
            detail += " metadata"
        if detail:
            mismatches.append(f"{sid}:{detail}")
        print(
            f"  [{status:4}] {sid:10} — module{'=' if module_ok else '≠'} "
            f"metadata{'=' if meta_ok else '≠'}"
        )

    if mismatches:
        print("\nMISMATCHES:")
        for line in mismatches:
            print(f"  - {line}")
        print(
            "\nIf the composer change is intentional, regenerate with "
            "--write-oracle."
        )
        return 1
    print(
        f"\nAll {len(PUBLISHED_SECTIONS)} DB-built modules match the frozen "
        f"oracle for {slug}."
    )
    return 0


def _substrate_match(slug: str) -> int:
    fixture_modules, fixture_meta = build_modules_from_context(
        load_vessel_context(VESSEL_DIR)
    )
    db_ctx = _strip_places(_load_db_context(slug))
    db_modules, db_meta = build_modules_from_context(db_ctx)

    print(
        f"Substrate-match: fixture (outremer) vs DB without places ({slug})\n"
    )
    mismatches: list[str] = []
    for sid in PUBLISHED_SECTIONS:
        module_ok = _canon(fixture_modules[sid]) == _canon(db_modules[sid])
        meta_ok = _canon(fixture_meta[sid]) == _canon(db_meta[sid])
        status = "ok" if (module_ok and meta_ok) else "DIFF"
        detail = ""
        if not module_ok:
            detail += " module"
        if not meta_ok:
            detail += " metadata"
        if detail:
            mismatches.append(f"{sid}:{detail}")
        print(
            f"  [{status:4}] {sid:10} — module{'=' if module_ok else '≠'} "
            f"metadata{'=' if meta_ok else '≠'}"
        )

    if mismatches:
        print("\nMISMATCHES:")
        for line in mismatches:
            print(f"  - {line}")
        return 1
    print(
        f"\nAll {len(PUBLISHED_SECTIONS)} modules match with places stripped "
        "(substrate fidelity)."
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--byte-match",
        action="store_true",
        help="Compare DB-substrate-built modules against the frozen vessel oracle.",
    )
    parser.add_argument(
        "--write-oracle",
        action="store_true",
        help="Write/update the frozen DB oracle for --slug from current composers.",
    )
    parser.add_argument(
        "--substrate-match",
        action="store_true",
        help="Compare fixture vs DB with places stripped (no location prose).",
    )
    parser.add_argument(
        "--slug", default="supernova", help="Vessel slug for DB modes."
    )
    args = parser.parse_args()

    if args.write_oracle:
        return _write_oracle(args.slug)
    if args.byte_match:
        return _byte_match(args.slug)
    if args.substrate_match:
        return _substrate_match(args.slug)

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
