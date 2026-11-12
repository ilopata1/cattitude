"""Sanitize and persist a vessel's duty rota."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text

_INTERVALS = (2, 3, 4, 6, 8, 12, 24)
_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,39}$")
_START_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")
_MAX_CREW = 16
_MAX_TASKS = 8


def _clip(value: Any, limit: int) -> str:
    if value is None:
        return ""
    return str(value).strip()[:limit]


def _nearest_interval(raw: Any) -> int:
    try:
        hours = float(raw)
    except (TypeError, ValueError):
        return 4
    if hours != hours:  # NaN
        return 4
    best = _INTERVALS[0]
    distance = abs(best - hours)
    for allowed in _INTERVALS[1:]:
        gap = abs(allowed - hours)
        if gap < distance or (gap == distance and allowed < best):
            best = allowed
            distance = gap
    return best


def _sequence(raw: Any, crew_ids: list[str]) -> list[str]:
    """A missing sequence keeps the old crew-list order. An empty one stays empty."""
    if not isinstance(raw, list):
        return list(crew_ids)
    known = set(crew_ids)
    sequence: list[str] = []
    for item in raw[:64]:
        crew_id = _clip(item, 40)
        if crew_id in known:
            sequence.append(crew_id)
    return sequence


def _stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _valid_start(value: str) -> bool:
    if not _START_RE.match(value):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%dT%H:%M")
    except ValueError:
        return False
    return True


def sanitize_rota(raw: Any) -> dict[str, Any]:
    source = raw if isinstance(raw, dict) else {}
    start = _clip(source.get("startAt"), 16)
    crew: list[dict[str, str]] = []
    seen: set[str] = set()
    incoming_crew = source.get("crew")
    if isinstance(incoming_crew, list):
        for item in incoming_crew[:_MAX_CREW]:
            if not isinstance(item, dict):
                continue
            crew_id = _clip(item.get("id"), 40)
            if not _ID_RE.match(crew_id) or crew_id in seen:
                continue
            seen.add(crew_id)
            crew.append({"id": crew_id, "name": _clip(item.get("name"), 60)})
    tasks: list[dict[str, Any]] = []
    seen_tasks: set[str] = set()
    incoming_tasks = source.get("tasks")
    if isinstance(incoming_tasks, list):
        for item in incoming_tasks[:_MAX_TASKS]:
            if not isinstance(item, dict):
                continue
            task_id = _clip(item.get("id"), 40)
            if not _ID_RE.match(task_id) or task_id in seen_tasks:
                continue
            seen_tasks.add(task_id)
            tasks.append({
                "id": task_id,
                "name": _clip(item.get("name"), 40),
                "intervalHours": _nearest_interval(item.get("intervalHours")),
                "sequence": _sequence(item.get("sequence"), [person["id"] for person in crew]),
            })
    updated = _clip(source.get("updatedAt"), 40)
    return {
        "startAt": start if _valid_start(start) else "",
        "crew": crew,
        "tasks": tasks,
        "updatedAt": updated or _stamp(),
    }


def fetch_duty_rota(slug: str) -> dict[str, Any] | None:
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    with get_engine().connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT rota
                FROM vessel_duty_rota
                WHERE vessel_id = :vessel_id
                """
            ),
            {"vessel_id": vessel["id"]},
        ).fetchone()
    rota = sanitize_rota(_coerce(row[0])) if row else None
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "rota": rota,
    }


def save_duty_rota(slug: str, payload: Any) -> dict[str, Any] | None:
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    rota = sanitize_rota(payload)
    with get_engine().begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO vessel_duty_rota (vessel_id, rota, updated_at)
                VALUES (:vessel_id, CAST(:rota AS jsonb), now())
                ON CONFLICT (vessel_id) DO UPDATE SET
                    rota = EXCLUDED.rota,
                    updated_at = now()
                """
            ),
            {
                "vessel_id": vessel["id"],
                "rota": json.dumps(rota, ensure_ascii=False),
            },
        )
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "rota": rota,
    }


def _coerce(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value
