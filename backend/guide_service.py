"""Read vessel guide publications from Postgres."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from config import settings
from db import postgres_connection_strings
from guide_bootstrap import asset_file_path, canonical_json_hash

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        sync_url, _ = postgres_connection_strings(settings.database_url)
        _engine = create_engine(sync_url, pool_pre_ping=True)
    return _engine


def fetch_vessel(slug: str) -> dict[str, str] | None:
    with get_engine().connect() as conn:
        row = conn.execute(
            text("SELECT id, slug FROM vessels WHERE slug = :slug"),
            {"slug": slug},
        ).fetchone()
    if not row:
        return None
    return {"id": str(row[0]), "slug": row[1]}


def fetch_latest_publication(vessel_id: str) -> dict[str, Any] | None:
    with get_engine().connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT version, content_hash, payload, asset_manifest, published_at
                FROM vessel_guide_publication
                WHERE vessel_id = :vessel_id
                ORDER BY published_at DESC, version DESC
                LIMIT 1
                """
            ),
            {"vessel_id": vessel_id},
        ).fetchone()
    if not row:
        return None

    payload = row[2]
    if isinstance(payload, str):
        payload = json.loads(payload)

    asset_manifest = row[3]
    if isinstance(asset_manifest, str):
        asset_manifest = json.loads(asset_manifest)

    published_at = row[4]
    if isinstance(published_at, datetime):
        published_at = published_at.isoformat()

    return {
        "version": row[0],
        "content_hash": row[1],
        "payload": payload,
        "asset_manifest": asset_manifest,
        "published_at": published_at,
    }


def build_manifest(
    vessel: dict[str, str],
    publication: dict[str, Any],
    *,
    api_prefix: str = "/api/v1/vessels",
) -> dict[str, Any]:
    slug = vessel["slug"]
    payload = publication["payload"]
    content_hash = publication["content_hash"]
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    if content_hash != canonical_json_hash(payload):
        content_hash = canonical_json_hash(payload)

    guide_url = f"{api_prefix}/{slug}/guide/bundle.json"
    assets = publication["asset_manifest"]

    return {
        "vesselId": vessel["id"],
        "vesselSlug": slug,
        "publicationVersion": publication["version"],
        "contentHash": content_hash,
        "publishedAt": publication["published_at"],
        "guide": {
            "url": guide_url,
            "hash": content_hash,
            "bytes": len(payload_bytes),
        },
        "assets": assets,
    }


def resolve_asset_path(asset_path: str) -> str:
    """Normalize API asset path to logical bootstrap path."""
    normalized = asset_path.lstrip("/")
    if normalized.startswith("assets/"):
        return normalized
    if "/" in normalized:
        prefix, remainder = normalized.split("/", 1)
        if prefix == "assets" or remainder.startswith("assets/"):
            return remainder if remainder.startswith("assets/") else normalized
    return normalized


def validate_asset_path(logical_path: str) -> None:
    if ".." in logical_path or logical_path.startswith("/"):
        raise ValueError("Invalid asset path")
    if not logical_path.startswith("assets/images/"):
        raise ValueError("Asset path must be under assets/images/")


def read_asset_file(logical_path: str) -> tuple[bytes, str]:
    validate_asset_path(logical_path)
    file_path = asset_file_path(logical_path)
    if not file_path.is_file():
        raise FileNotFoundError(logical_path)
    raw = file_path.read_bytes()
    return raw, f"sha256:{hashlib.sha256(raw).hexdigest()}"
