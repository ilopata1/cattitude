"""Sanitize and persist a vessel's daily inspection records."""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import text

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_ITEM_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_NOTE_LIMIT = 500
_MAX_MARKS = 200
_MAX_DAYS = 60


def _clip(value: Any, limit: int) -> str:
    if value is None:
        return ""
    return str(value).strip()[:limit]


def _valid_date(value: str) -> bool:
    if not _DATE_RE.match(value):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False
    return True


def sanitize_day(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    day = _clip(raw.get("date"), 10)
    if not _valid_date(day):
        return None
    marks: dict[str, dict[str, Any]] = {}
    incoming = raw.get("marks")
    if isinstance(incoming, dict):
        for item_id, mark in list(incoming.items())[:_MAX_MARKS]:
            if not isinstance(item_id, str) or not _ITEM_RE.match(item_id) or not isinstance(mark, dict):
                continue
            note = _clip(mark.get("note"), _NOTE_LIMIT)
            done = mark.get("done") is True
            if not done and not note:
                continue
            marks[item_id] = {"done": done, "note": note}
    updated = _clip(raw.get("updatedAt"), 40) or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    return {"date": day, "marks": marks, "updatedAt": updated}


def fetch_inspections(slug: str) -> dict[str, Any] | None:
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    with get_engine().connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT day, record
                FROM vessel_inspection_day
                WHERE vessel_id = :vessel_id
                ORDER BY day DESC
                LIMIT 400
                """
            ),
            {"vessel_id": vessel["id"]},
        ).fetchall()
    days: list[dict[str, Any]] = []
    for row in rows:
        raw = _coerce(row[1])
        if isinstance(raw, dict):
            raw = {**raw, "date": _day_key(row[0])}
        cleaned = sanitize_day(raw)
        if cleaned:
            days.append(cleaned)
    days.sort(key=lambda item: item["date"])
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "days": days,
    }


def save_inspections(slug: str, payload: Any) -> dict[str, Any] | None:
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    incoming = payload if isinstance(payload, list) else []
    cleaned = []
    for raw in incoming[:_MAX_DAYS]:
        day = sanitize_day(raw)
        if day:
            cleaned.append(day)
    with get_engine().begin() as conn:
        for day in cleaned:
            conn.execute(
                text(
                    """
                    INSERT INTO vessel_inspection_day (vessel_id, day, record, updated_at)
                    VALUES (:vessel_id, :day, CAST(:record AS jsonb), now())
                    ON CONFLICT (vessel_id, day) DO UPDATE SET
                        record = EXCLUDED.record,
                        updated_at = now()
                    """
                ),
                {
                    "vessel_id": vessel["id"],
                    "day": day["date"],
                    "record": json.dumps(day, ensure_ascii=False),
                },
            )
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "saved": len(cleaned),
        "days": cleaned,
    }


def _day_key(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)[:10]


def _coerce(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value
