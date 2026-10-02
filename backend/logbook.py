"""Sanitize and persist a vessel's electronic logbook."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

_TRIGGERS = {
    "interval",
    "propulsion-change",
    "sail-change",
    "waypoint",
    "departure",
    "arrival",
    "manual",
    "watch-change",
}
_MAX_ENTRIES = 200
_MAX_ENTRY_CHARS = 50_000
_MAX_REMARKS = 4_000


def _str(raw: Any, limit: int) -> str:
    if raw is None:
        return ""
    return str(raw).strip()[:limit]


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def sanitize_entry(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    entry_id = _str(raw.get("id"), 80)
    at = _str(raw.get("at"), 40)
    trigger = _str(raw.get("trigger"), 40)
    if not entry_id or not at or trigger not in _TRIGGERS:
        return None
    cleaned = dict(raw)
    cleaned["id"] = entry_id
    cleaned["at"] = at
    cleaned["trigger"] = trigger
    cleaned["updatedAt"] = _str(raw.get("updatedAt"), 40) or at
    cleaned["remarks"] = _str(raw.get("remarks"), _MAX_REMARKS)
    encoded = json.dumps(cleaned, ensure_ascii=False)
    if len(encoded) > _MAX_ENTRY_CHARS:
        return None
    return cleaned


def sanitize_passage(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    passage_id = _str(raw.get("id"), 80)
    if not passage_id:
        return None
    cleaned = dict(raw)
    cleaned["id"] = passage_id
    cleaned["name"] = _str(raw.get("name"), 200)
    cleaned["destinationName"] = _str(raw.get("destinationName"), 200)
    cleaned["watch"] = _str(raw.get("watch"), 80)
    cleaned["updatedAt"] = _str(raw.get("updatedAt"), 40) or datetime.now(timezone.utc).isoformat()
    waypoints = raw.get("waypoints")
    if not isinstance(waypoints, list):
        waypoints = []
    kept: list[dict[str, Any]] = []
    for item in waypoints[:100]:
        if not isinstance(item, dict):
            continue
        waypoint_id = _str(item.get("id"), 80)
        if not waypoint_id:
            continue
        kept.append({
            "id": waypoint_id,
            "name": _str(item.get("name"), 200) or "Waypoint",
            "lat": item.get("lat"),
            "lon": item.get("lon"),
            "passedAt": _str(item.get("passedAt"), 40) or None,
        })
    cleaned["waypoints"] = kept
    encoded = json.dumps(cleaned, ensure_ascii=False)
    if len(encoded) > _MAX_ENTRY_CHARS:
        return None
    return cleaned


def fetch_logbook(slug: str, since: str | None = None) -> dict[str, Any] | None:
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    params: dict[str, Any] = {"vessel_id": vessel["id"]}
    since_sql = ""
    if since:
        since_sql = " AND entry->>'at' >= :since"
        params["since"] = since[:40]
    with get_engine().connect() as conn:
        rows = conn.execute(
            text(
                f"""
                SELECT entry
                FROM vessel_logbook_entry
                WHERE vessel_id = :vessel_id
                {since_sql}
                ORDER BY entry->>'at' DESC
                LIMIT 2000
                """
            ),
            params,
        ).fetchall()
        passage_row = conn.execute(
            text(
                """
                SELECT passage, updated_at
                FROM vessel_logbook_passage
                WHERE vessel_id = :vessel_id
                """
            ),
            {"vessel_id": vessel["id"]},
        ).fetchone()
    entries = []
    for row in rows:
        cleaned = sanitize_entry(_coerce(row[0]))
        if cleaned:
            entries.append(cleaned)
    passage = sanitize_passage(_coerce(passage_row[0])) if passage_row else None
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "entries": entries,
        "passage": passage,
        "updatedAt": _iso(passage_row[1]) if passage_row else None,
    }


def save_logbook(
    slug: str,
    entries: Any,
    passage: Any,
    *,
    include_passage: bool,
) -> dict[str, Any] | None:
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    incoming = entries if isinstance(entries, list) else []
    cleaned_entries = []
    for raw in incoming[:_MAX_ENTRIES]:
        cleaned = sanitize_entry(raw)
        if cleaned:
            cleaned_entries.append(cleaned)
    cleaned_passage = sanitize_passage(passage) if include_passage else None
    with get_engine().begin() as conn:
        for entry in cleaned_entries:
            conn.execute(
                text(
                    """
                    INSERT INTO vessel_logbook_entry (vessel_id, entry_id, entry, updated_at)
                    VALUES (:vessel_id, :entry_id, CAST(:entry AS jsonb), now())
                    ON CONFLICT (vessel_id, entry_id) DO UPDATE SET
                        entry = EXCLUDED.entry,
                        updated_at = now()
                    """
                ),
                {
                    "vessel_id": vessel["id"],
                    "entry_id": entry["id"],
                    "entry": json.dumps(entry, ensure_ascii=False),
                },
            )
        if include_passage and cleaned_passage is not None:
            conn.execute(
                text(
                    """
                    INSERT INTO vessel_logbook_passage (vessel_id, passage, updated_at)
                    VALUES (:vessel_id, CAST(:passage AS jsonb), now())
                    ON CONFLICT (vessel_id) DO UPDATE SET
                        passage = EXCLUDED.passage,
                        updated_at = now()
                    """
                ),
                {
                    "vessel_id": vessel["id"],
                    "passage": json.dumps(cleaned_passage, ensure_ascii=False),
                },
            )
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "saved": len(cleaned_entries),
        "skipped": max(0, len(incoming[:_MAX_ENTRIES]) - len(cleaned_entries)),
        "passage": cleaned_passage,
    }


def _coerce(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value
