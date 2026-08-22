"""Sanitize and persist per-vessel Signal-K instrument role mappings."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import text

_MAP_VERSION = 1
_MAX_PATH = 300
_MAX_ROLES = 32
_ALLOWED_ROLES = frozenset({
    "heading",
    "cog",
    "speed",
    "depth",
    "awa",
    "aws",
    "twa",
    "tws",
    "set",
    "drift",
    "sog",
})


def _coerce_jsonb(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value


def _str(raw: Any, limit: int) -> str:
    if raw is None:
        return ""
    return str(raw).strip()[:limit]


def _binding(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    path = _str(raw.get("path"), _MAX_PATH)
    if not path.startswith("self."):
        return None
    source = _str(raw.get("source"), 120) or "default"
    out: dict[str, Any] = {"path": path, "source": source}
    fallback = raw.get("fallback")
    if isinstance(fallback, dict):
        fb_path = _str(fallback.get("path"), _MAX_PATH)
        if fb_path.startswith("self."):
            out["fallback"] = {
                "path": fb_path,
                "source": _str(fallback.get("source"), 120) or "default",
            }
    return out


def default_instrument_map() -> dict[str, Any]:
    """Vessel-agnostic defaults; depth uses common transducer path."""
    return {
        "version": _MAP_VERSION,
        "instruments": {
            "heading": {"path": "self.navigation.headingTrue", "source": "default"},
            "cog": {"path": "self.navigation.courseOverGroundTrue", "source": "default"},
            "speed": {
                "path": "self.navigation.speedThroughWater",
                "source": "default",
                "fallback": {"path": "self.navigation.speedOverGround", "source": "default"},
            },
            "depth": {"path": "self.environment.depth.belowTransducer", "source": "default"},
            "awa": {"path": "self.environment.wind.angleApparent", "source": "default"},
            "aws": {"path": "self.environment.wind.speedApparent", "source": "default"},
            "twa": {"path": "self.environment.wind.angleTrueWater", "source": "default"},
            "tws": {"path": "self.environment.wind.speedTrue", "source": "default"},
        },
    }


def supernova_instrument_map() -> dict[str, Any]:
    """Supernova: depth at transducer (Garmin/B&G typical)."""
    return default_instrument_map()


def sanitize_instrument_map(raw: Any) -> dict[str, Any]:
    src = raw if isinstance(raw, dict) else {}
    instruments_raw = src.get("instruments")
    if not isinstance(instruments_raw, dict):
        instruments_raw = {}

    instruments: dict[str, Any] = {}
    for role, binding_raw in instruments_raw.items():
        key = _str(role, 40)
        if key not in _ALLOWED_ROLES:
            continue
        binding = _binding(binding_raw)
        if binding:
            instruments[key] = binding
        if len(instruments) >= _MAX_ROLES:
            break

    version_raw = src.get("version")
    version = int(version_raw) if isinstance(version_raw, int) and version_raw > 0 else _MAP_VERSION

    return {"version": version, "instruments": instruments}


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def fetch_instrument_map(slug: str) -> dict[str, Any] | None:
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    with get_engine().connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT map, updated_at
                FROM vessel_instrument_map
                WHERE vessel_id = :vessel_id
                """
            ),
            {"vessel_id": vessel["id"]},
        ).fetchone()
    if row is None:
        return {
            "vesselId": vessel["id"],
            "vesselSlug": vessel["slug"],
            "map": None,
            "updatedAt": None,
        }
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "map": sanitize_instrument_map(_coerce_jsonb(row[0])),
        "updatedAt": _iso(row[1]),
    }


def save_instrument_map(slug: str, payload: Any, *, updated_by: str | None = None) -> dict[str, Any] | None:
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    cleaned = sanitize_instrument_map(payload)
    with get_engine().begin() as conn:
        row = conn.execute(
            text(
                """
                INSERT INTO vessel_instrument_map (vessel_id, map, updated_at, updated_by)
                VALUES (:vessel_id, CAST(:map AS jsonb), now(), :updated_by)
                ON CONFLICT (vessel_id) DO UPDATE SET
                    map = EXCLUDED.map,
                    updated_at = now(),
                    updated_by = EXCLUDED.updated_by
                RETURNING map, updated_at
                """
            ),
            {
                "vessel_id": vessel["id"],
                "map": json.dumps(cleaned, ensure_ascii=False),
                "updated_by": updated_by,
            },
        ).fetchone()
    assert row is not None
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "map": sanitize_instrument_map(_coerce_jsonb(row[0])),
        "updatedAt": _iso(row[1]),
    }
