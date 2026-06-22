#!/usr/bin/env python3
"""
Import mobile bootstrap JSON into guide_content and publish v1.

Usage (from repo root):
  python backend/scripts/import_cattitude_guide.py
  python backend/scripts/import_cattitude_guide.py --json mobile/src/data/bootstrap/cattitude.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from config import settings  # noqa: E402
from db import postgres_connection_strings  # noqa: E402
from guide_bootstrap import (  # noqa: E402
    assemble_bootstrap,
    build_asset_manifest,
    canonical_json_hash,
    resolve_bootstrap_json,
    split_bootstrap,
)


def _load_bootstrap(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _get_vessel(conn, slug: str) -> tuple[str, str]:
    row = conn.execute(
        text("SELECT id, slug FROM vessels WHERE slug = :slug"),
        {"slug": slug},
    ).fetchone()
    if not row:
        raise SystemExit(
            f"Vessel '{slug}' not found. Run: cd backend && python scripts/seed_dev_data.py"
        )
    return str(row[0]), row[1]


def _publication_exists(conn, vessel_id: str, version: int) -> bool:
    row = conn.execute(
        text(
            """
            SELECT 1 FROM vessel_guide_publication
            WHERE vessel_id = :vessel_id AND version = :version
            """
        ),
        {"vessel_id": vessel_id, "version": version},
    ).fetchone()
    return row is not None


def _insert_modules(
    conn,
    vessel_id: str,
    modules: list[dict],
) -> list[dict]:
    module_refs: list[dict] = []
    for module in modules:
        row = conn.execute(
            text(
                """
                INSERT INTO guide_content (
                    vessel_id, content_type, content_key, payload,
                    source, status, approved_at, approved_by
                )
                VALUES (
                    :vessel_id, :content_type, :content_key, CAST(:payload AS jsonb),
                    'imported', 'approved', now(), 'import_cattitude_guide'
                )
                RETURNING id
                """
            ),
            {
                "vessel_id": vessel_id,
                "content_type": module["content_type"],
                "content_key": module["content_key"],
                "payload": json.dumps(module["payload"]),
            },
        ).fetchone()
        module_refs.append(
            {
                "guide_content_id": str(row[0]),
                "content_type": module["content_type"],
                "content_key": module["content_key"],
                "prompt_refs": [],
            }
        )
    return module_refs


def _approved_modules(conn, vessel_id: str) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT content_type, content_key, payload
            FROM guide_content
            WHERE vessel_id = :vessel_id AND status = 'approved'
            ORDER BY content_type, content_key
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchall()
    return [
        {
            "content_type": row[0],
            "content_key": row[1],
            "payload": row[2],
        }
        for row in rows
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Import bootstrap JSON into Postgres")
    parser.add_argument("--json", type=Path, default=None)
    parser.add_argument("--slug", default="cattitude")
    parser.add_argument("--version", type=int, default=1)
    args = parser.parse_args()

    json_path = args.json or resolve_bootstrap_json(args.slug)
    bootstrap = _load_bootstrap(json_path)
    slug = bootstrap.get("vesselSlug") or args.slug

    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url)

    with engine.begin() as conn:
        vessel_id, vessel_slug = _get_vessel(conn, slug)

        if _publication_exists(conn, vessel_id, args.version):
            print(f"Publication v{args.version} already exists for {vessel_slug}; skipping.")
            return

        existing = conn.execute(
            text(
                """
                SELECT COUNT(*) FROM guide_content
                WHERE vessel_id = :vessel_id AND source = 'imported' AND status = 'approved'
                """
            ),
            {"vessel_id": vessel_id},
        ).scalar()

        if existing:
            modules = _approved_modules(conn, vessel_id)
            rows = conn.execute(
                text(
                    """
                    SELECT id, content_type, content_key
                    FROM guide_content
                    WHERE vessel_id = :vessel_id AND status = 'approved'
                    """
                ),
                {"vessel_id": vessel_id},
            ).fetchall()
            module_refs = [
                {
                    "guide_content_id": str(row[0]),
                    "content_type": row[1],
                    "content_key": row[2],
                    "prompt_refs": [],
                }
                for row in rows
            ]
        else:
            modules = split_bootstrap(bootstrap)
            module_refs = _insert_modules(conn, vessel_id, modules)

        manual_titles = bootstrap.get("manualTitles") or {}
        payload = assemble_bootstrap(
            modules,
            vessel_id=vessel_id,
            vessel_slug=vessel_slug,
            manual_titles=manual_titles,
        )
        content_hash = canonical_json_hash(payload)
        asset_manifest = build_asset_manifest(payload, vessel_slug)

        conn.execute(
            text(
                """
                INSERT INTO vessel_guide_publication (
                    vessel_id, version, content_hash, payload,
                    asset_manifest, module_refs, published_by
                )
                VALUES (
                    :vessel_id, :version, :content_hash, CAST(:payload AS jsonb),
                    CAST(:asset_manifest AS jsonb), CAST(:module_refs AS jsonb),
                    'import_cattitude_guide'
                )
                """
            ),
            {
                "vessel_id": vessel_id,
                "version": args.version,
                "content_hash": content_hash,
                "payload": json.dumps(payload),
                "asset_manifest": json.dumps(asset_manifest),
                "module_refs": json.dumps(module_refs),
            },
        )

        missing = [a for a in asset_manifest if a.get("missing")]
        print(
            f"Imported guide for {vessel_slug}: "
            f"{len(modules)} modules, publication v{args.version}, "
            f"{len(asset_manifest)} assets"
            + (f", {len(missing)} missing on disk" if missing else "")
        )


if __name__ == "__main__":
    main()
