#!/usr/bin/env python3
"""
Run guide generation for a vessel (v0: branding + emergency + home rules).

Usage (from backend/):
  python scripts/generate_guide.py --slug cattitude
  python scripts/generate_guide.py --slug cattitude --modules branding,emergency
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
    STARTER_MODULES,
    GuideGenerationError,
    create_input_snapshot,
    load_vessel_generation_context,
    run_guide_generation,
)


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
        elif ":" in part:
            content_type, content_key = part.split(":", 1)
            modules.append((content_type.strip(), content_key.strip()))
        else:
            raise GuideGenerationError(f"Unknown module alias: {part}")
    return modules


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate vessel guide modules (v0).")
    parser.add_argument("--slug", default="cattitude", help="Vessel slug")
    parser.add_argument(
        "--modules",
        default="",
        help="Comma-separated modules (default: starter set). "
        "Aliases: branding, emergency, homeRuleSections",
    )
    parser.add_argument(
        "--snapshot-only",
        action="store_true",
        help="Build input snapshot only; no LLM calls",
    )
    parser.add_argument(
        "--created-by",
        default="generate_guide.py",
        help="Audit label stored on guide_content",
    )
    args = parser.parse_args()

    modules = _parse_modules(args.modules) if args.modules else list(STARTER_MODULES)
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
            )
    except GuideGenerationError as exc:
        raise SystemExit(str(exc)) from exc

    print(f"Generation OK for {vessel_name} ({args.slug})")
    print(f"  snapshot_id: {result.snapshot_id}")
    for run in result.runs:
        print(
            f"  draft {run['content_type']}/{run['content_key']} "
            f"module_id={run['module_id']} run_id={run['run_id']}"
        )
    print(
        f"\nNext: review drafts at /admin/vessels/{vessel_id}/guide, "
        "then Approve and Publish."
    )


if __name__ == "__main__":
    main()
