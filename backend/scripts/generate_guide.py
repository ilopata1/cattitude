#!/usr/bin/env python3
"""
Run guide generation for a vessel (all guide tabs except Ask).

Usage (from backend/):
  python scripts/generate_guide.py --slug cattitude
  python scripts/generate_guide.py --slug cattitude --set full
  python scripts/generate_guide.py --slug cattitude --set systems
  python scripts/generate_guide.py --slug cattitude --modules overview,engines
  python scripts/generate_guide.py --slug cattitude --snapshot-only
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402
from guide_generation import (  # noqa: E402
    GuideGenerationError,
    create_input_snapshot,
    load_vessel_generation_context,
    run_guide_generation,
)
from guide_module_catalog import (  # noqa: E402
    CHECKLIST_MODULES,
    FIXES_MODULE,
    FULL_GUIDE_MODULES,
    STARTER_MODULES,
    SYSTEM_MODULES,
    modules_for_set,
)

SET_ALIASES = {
    "shell": "shell",
    "home": "shell",
    "systems": "systems",
    "system": "systems",
    "checklists": "checklists",
    "checklist": "checklists",
    "fixes": "fixes",
    "fix": "fixes",
    "all": "full",
    "full": "full",
}


def _parse_modules(raw: str) -> list[tuple[str, str]]:
    modules: list[tuple[str, str]] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if part == "branding":
            modules.append(("branding", "branding"))
        elif part == "emergency":
            modules.append(("emergency", "emergency"))
        elif part in ("homeRuleSections", "home-rules", "ui"):
            modules.append(("ui", "homeRuleSections"))
        elif part in ("systems", "system"):
            modules.extend(SYSTEM_MODULES)
        elif part == "overview":
            modules.append(("system", "overview"))
        elif part == "engines":
            modules.append(("system", "engines"))
        elif part in ("checklists", "checklist"):
            modules.extend(CHECKLIST_MODULES)
        elif part in ("fixes", "fix"):
            modules.extend(FIXES_MODULE)
        elif part in ("full", "all"):
            modules.extend(FULL_GUIDE_MODULES)
        elif part in ("shell", "starter"):
            modules.extend(STARTER_MODULES)
        elif part.startswith("system:"):
            modules.append(("system", part.split(":", 1)[1]))
        elif part.startswith("checklist:"):
            modules.append(("checklist", part.split(":", 1)[1]))
        elif ":" in part:
            content_type, content_key = part.split(":", 1)
            modules.append((content_type.strip(), content_key.strip()))
        else:
            raise GuideGenerationError(f"Unknown module alias: {part}")
    return modules


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate vessel guide modules.")
    parser.add_argument("--slug", default="cattitude", help="Vessel slug")
    parser.add_argument(
        "--set",
        default="",
        help="Module set: shell, systems, checklists, fixes, full",
    )
    parser.add_argument(
        "--modules",
        default="",
        help="Comma-separated modules (overrides --set). Aliases: branding, systems, full, ...",
    )
    parser.add_argument(
        "--snapshot-only",
        action="store_true",
        help="Build input snapshot only; no LLM calls",
    )
    parser.add_argument(
        "--personalize",
        action="store_true",
        help=(
            "Use the LLM for library-backed modules (home rules, checklists, "
            "fix cards) instead of the standard content library"
        ),
    )
    parser.add_argument(
        "--created-by",
        default="generate_guide.py",
        help="Audit label stored on guide_content",
    )
    args = parser.parse_args()

    if args.modules:
        modules = _parse_modules(args.modules)
    elif args.set:
        module_set = SET_ALIASES.get(args.set.strip(), args.set.strip())
        modules = modules_for_set(module_set)
    else:
        modules = list(STARTER_MODULES)

    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)

    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, name FROM vessels WHERE slug = :slug"),
            {"slug": args.slug},
        ).fetchone()
        if row is None:
            raise SystemExit(f"Vessel slug {args.slug!r} not found.")
        vessel_id = str(row[0])
        vessel_name = row[1]

    try:
        if args.snapshot_only:
            with engine.begin() as conn:
                ctx = load_vessel_generation_context(conn, vessel_id)
                snapshot_id = create_input_snapshot(conn, vessel_id)
            print(
                f"Snapshot OK for {vessel_name} ({args.slug}): "
                f"id={snapshot_id} equipment={len(ctx['equipment'])}"
            )
            return

        with engine.begin() as conn:
            result = run_guide_generation(
                conn,
                vessel_id,
                modules,
                created_by=args.created_by,
                personalize=args.personalize,
            )
    except GuideGenerationError as exc:
        raise SystemExit(str(exc)) from exc

    print(f"Generation OK for {vessel_name} ({args.slug})")
    print(f"  modules: {len(modules)}")
    print(f"  snapshot_id: {result.snapshot_id}")
    for run in result.runs:
        copied = " (copied)" if run.get("copied_from_reference") else ""
        print(
            f"  draft {run['content_type']}/{run['content_key']} "
            f"module_id={run['module_id']}{copied}"
        )
    print(
        f"\nNext: review drafts at /admin/vessels/{vessel_id}/guide, "
        "then Approve and Publish."
    )


if __name__ == "__main__":
    main()
