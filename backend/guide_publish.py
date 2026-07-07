"""Assemble and publish vessel guides from approved guide_content modules."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from guide_bootstrap import assemble_bootstrap, build_asset_manifest, canonical_json_hash
from manual_titles import build_manual_titles_for_vessel


class PublishValidationError(Exception):
    """Raised when assembled guide content fails publication validation."""

    def __init__(self, messages: list[str]) -> None:
        joined = "; ".join(messages)
        Exception.__init__(self, joined)
        self.messages = messages


def _coerce_jsonb(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value


def load_approved_modules(conn: Connection, vessel_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        text(
            """
            SELECT id, content_type, content_key, payload
            FROM guide_content
            WHERE vessel_id = :vessel_id AND status = 'approved'
            ORDER BY content_type, content_key
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "content_type": row[1],
            "content_key": row[2],
            "payload": _coerce_jsonb(row[3]),
        }
        for row in rows
    ]


def load_manual_titles(conn: Connection, vessel_id: str) -> dict[str, str]:
    """Guest-facing Ask labels — sourced from manual_work.title for this vessel's equipment."""
    return build_manual_titles_for_vessel(conn, vessel_id)


def validate_publication_payload(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    warnings: list[str] = []

    if not payload.get("branding"):
        errors.append("Missing branding module.")
    if not payload.get("emergency"):
        errors.append("Missing emergency module.")
    if not payload.get("systems"):
        errors.append("Missing systems content.")
    if not payload.get("checklists"):
        warnings.append("No checklists in assembled guide.")
    if not payload.get("ui"):
        errors.append("Missing ui configuration.")

    return errors + [f"Warning: {message}" for message in warnings]


def assemble_publication(
    conn: Connection,
    vessel_id: str,
    vessel_slug: str,
) -> dict[str, Any]:
    modules = load_approved_modules(conn, vessel_id)
    if not modules:
        raise PublishValidationError(["No approved guide modules to publish."])

    manual_titles = load_manual_titles(conn, vessel_id)
    payload = assemble_bootstrap(
        modules,
        vessel_id=vessel_id,
        vessel_slug=vessel_slug,
        manual_titles=manual_titles,
    )
    validation = validate_publication_payload(payload)
    hard_errors = [message for message in validation if not message.startswith("Warning:")]
    if hard_errors:
        raise PublishValidationError(hard_errors)

    content_hash = canonical_json_hash(payload)
    asset_manifest = build_asset_manifest(payload, vessel_slug)
    module_refs = [
        {
            "guide_content_id": module["id"],
            "content_type": module["content_type"],
            "content_key": module["content_key"],
            "prompt_refs": [],
        }
        for module in modules
    ]

    return {
        "payload": payload,
        "content_hash": content_hash,
        "asset_manifest": asset_manifest,
        "module_refs": module_refs,
        "module_count": len(modules),
        "validation_messages": validation,
        "missing_assets": [asset for asset in asset_manifest if asset.get("missing")],
    }


def get_latest_publication(conn: Connection, vessel_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT version, content_hash, published_at
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
    return {
        "version": row[0],
        "content_hash": row[1],
        "published_at": row[2],
    }


def get_next_publication_version(conn: Connection, vessel_id: str) -> int:
    row = conn.execute(
        text(
            """
            SELECT COALESCE(MAX(version), 0) + 1
            FROM vessel_guide_publication
            WHERE vessel_id = :vessel_id
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchone()
    return int(row[0])


def publish_vessel_guide(
    conn: Connection,
    vessel_id: str,
    vessel_slug: str,
    *,
    published_by: str,
) -> dict[str, Any]:
    assembled = assemble_publication(conn, vessel_id, vessel_slug)
    latest = get_latest_publication(conn, vessel_id)
    if latest and latest["content_hash"] == assembled["content_hash"]:
        raise PublishValidationError(
            ["Guide content hash unchanged since last publication — nothing to publish."]
        )

    version = get_next_publication_version(conn, vessel_id)

    conn.execute(
        text(
            """
            UPDATE guide_content
            SET status = 'superseded'
            WHERE vessel_id = :vessel_id AND status = 'published'
            """
        ),
        {"vessel_id": vessel_id},
    )
    conn.execute(
        text(
            """
            UPDATE guide_content
            SET status = 'published', approved_at = COALESCE(approved_at, now())
            WHERE vessel_id = :vessel_id AND status = 'approved'
            """
        ),
        {"vessel_id": vessel_id},
    )
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
                :published_by
            )
            """
        ),
        {
            "vessel_id": vessel_id,
            "version": version,
            "content_hash": assembled["content_hash"],
            "payload": json.dumps(assembled["payload"]),
            "asset_manifest": json.dumps(assembled["asset_manifest"]),
            "module_refs": json.dumps(assembled["module_refs"]),
            "published_by": published_by,
        },
    )

    return {
        "version": version,
        "content_hash": assembled["content_hash"],
        "module_count": assembled["module_count"],
        "asset_count": len(assembled["asset_manifest"]),
        "missing_assets": len(assembled["missing_assets"]),
    }
