"""Sanitize and persist a vessel's sail-plan document."""

from __future__ import annotations

import json
import math
from datetime import datetime
from typing import Any

from sqlalchemy import text

_MAX_NAME = 200
_MAX_NOTE = 2000
_MAX_SAILS = 50
_MAX_CUTS = 48
_MAX_ALTS = 20


def _coerce_jsonb(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value


def _as_number(raw: Any) -> float | None:
    if isinstance(raw, bool) or raw is None:
        return None
    if isinstance(raw, (int, float)):
        n = float(raw)
        return n if math.isfinite(n) else None
    if isinstance(raw, str):
        try:
            n = float(raw.strip())
        except ValueError:
            return None
        return n if math.isfinite(n) else None
    return None


def _clamp(n: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, n))


def _str(raw: Any, limit: int) -> str:
    if raw is None:
        return ""
    return str(raw).strip()[:limit]


def _bands_from_cuts(cuts: list[float]) -> list[tuple[float, float]]:
    ordered = sorted(n for n in cuts if math.isfinite(n))
    bands: list[tuple[float, float]] = []
    for i in range(len(ordered) - 1):
        if ordered[i + 1] > ordered[i]:
            bands.append((ordered[i], ordered[i + 1]))
    return bands


def _midpoint(band: tuple[float, float]) -> float:
    return (band[0] + band[1]) / 2


def _find_band_index(bands: list[tuple[float, float]], value: float) -> int:
    if not bands:
        return -1
    for i, (lo, hi) in enumerate(bands):
        last = i == len(bands) - 1
        if last:
            if lo <= value <= hi:
                return i
        elif lo <= value < hi:
            return i
    if value < bands[0][0]:
        return 0
    return len(bands) - 1


def _clone_cell(cell: Any) -> dict[str, Any]:
    if not isinstance(cell, dict):
        return {"primary": "", "alternatives": []}
    alts_raw = cell.get("alternatives") or []
    if not isinstance(alts_raw, list):
        alts_raw = []
    out: dict[str, Any] = {
        "primary": _str(cell.get("primary"), _MAX_NOTE),
        "alternatives": [
            label for label in (_str(item, 200) for item in alts_raw) if label
        ][:_MAX_ALTS],
    }
    notes = _str(cell.get("notes"), _MAX_NOTE)
    if notes:
        out["notes"] = notes
    avoid = _str(cell.get("avoid"), _MAX_NOTE)
    if avoid:
        out["avoid"] = avoid
    return out


def _normalize_cuts(
    cuts: Any, lo: float, hi: float, fallback: list[float]
) -> list[float]:
    raw = cuts if isinstance(cuts, list) else []
    values: list[float] = []
    seen: set[float] = set()
    for item in raw[:_MAX_CUTS]:
        n = _as_number(item)
        if n is None:
            continue
        clamped = _clamp(n, lo, hi)
        if clamped in seen:
            continue
        seen.add(clamped)
        values.append(clamped)
    values.sort()
    return values if len(values) >= 2 else list(fallback)


def _raw_cuts(cuts: Any) -> list[float]:
    raw = cuts if isinstance(cuts, list) else []
    values: list[float] = []
    for item in raw[:_MAX_CUTS]:
        n = _as_number(item)
        if n is not None:
            values.append(n)
    return values


def _cell_at(grid: Any, row_i: int, col_i: int) -> Any:
    if not isinstance(grid, list) or row_i < 0 or row_i >= len(grid):
        return None
    row = grid[row_i]
    if not isinstance(row, list) or col_i < 0 or col_i >= len(row):
        return None
    return row[col_i]


def _resize_cells(
    old_twa: list[float],
    old_tws: list[float],
    old_cells: Any,
    new_twa: list[float],
    new_tws: list[float],
) -> list[list[dict[str, Any]]]:
    old_twa_bands = _bands_from_cuts(old_twa)
    old_tws_bands = _bands_from_cuts(old_tws)
    rows: list[list[dict[str, Any]]] = []
    for twa_band in _bands_from_cuts(new_twa):
        ri = _find_band_index(old_twa_bands, _midpoint(twa_band))
        row: list[dict[str, Any]] = []
        for tws_band in _bands_from_cuts(new_tws):
            ci = _find_band_index(old_tws_bands, _midpoint(tws_band))
            row.append(_clone_cell(_cell_at(old_cells, ri, ci)))
        rows.append(row)
    return rows


def _resize_heavy_cells(
    old_twa: list[float], old_cells: Any, new_twa: list[float]
) -> list[dict[str, Any]]:
    row = old_cells if isinstance(old_cells, list) else []
    old_bands = _bands_from_cuts(old_twa)
    out: list[dict[str, Any]] = []
    for twa_band in _bands_from_cuts(new_twa):
        ri = _find_band_index(old_bands, _midpoint(twa_band))
        cell = row[ri] if 0 <= ri < len(row) else None
        out.append(_clone_cell(cell))
    return out


def sanitize_plan(input_plan: Any) -> dict[str, Any]:
    """Normalize a client sail-plan payload to a coherent stored document."""
    src = input_plan if isinstance(input_plan, dict) else {}
    hw = src.get("heavyWeather") if isinstance(src.get("heavyWeather"), dict) else {}

    twa_cuts = _normalize_cuts(src.get("twaCuts"), 0, 180, [0.0, 180.0])
    tws_cuts = _normalize_cuts(src.get("twsCuts"), 0, 80, [0.0, 30.0])
    old_twa = _raw_cuts(src.get("twaCuts")) or twa_cuts
    old_tws = _raw_cuts(src.get("twsCuts")) or tws_cuts
    cells = _resize_cells(old_twa, old_tws, src.get("cells"), twa_cuts, tws_cuts)

    hw_cuts = _normalize_cuts(hw.get("twaCuts"), 0, 180, [0.0, 180.0])
    old_hw = _raw_cuts(hw.get("twaCuts")) or hw_cuts
    hw_cells = _resize_heavy_cells(old_hw, hw.get("cells"), hw_cuts)

    tws_from = _as_number(hw.get("twsFrom"))
    if tws_from is None:
        tws_from = tws_cuts[-1]
    tws_from = _clamp(tws_from, 0, 80)

    sails_raw = src.get("sails") if isinstance(src.get("sails"), list) else []
    sails: list[str] = []
    seen_sails: set[str] = set()
    for item in sails_raw[:_MAX_SAILS]:
        name = _str(item, 80)
        key = name.lower()
        if not name or key in seen_sails:
            continue
        seen_sails.add(key)
        sails.append(name)

    return {
        "name": _str(src.get("name"), _MAX_NAME) or "Sail plan",
        "sails": sails,
        "twaCuts": twa_cuts,
        "twsCuts": tws_cuts,
        "cells": cells,
        "heavyWeather": {
            "enabled": bool(hw.get("enabled")),
            "twsFrom": tws_from,
            "twaCuts": hw_cuts,
            "cells": hw_cells,
        },
        "notes": _str(src.get("notes"), 8000),
    }


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def fetch_sail_plan(slug: str) -> dict[str, Any] | None:
    """Return vessel + stored plan, or None if the vessel slug is unknown."""
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    with get_engine().connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT plan, updated_at
                FROM vessel_sail_plan
                WHERE vessel_id = :vessel_id
                """
            ),
            {"vessel_id": vessel["id"]},
        ).fetchone()
    if row is None:
        return {
            "vesselId": vessel["id"],
            "vesselSlug": vessel["slug"],
            "plan": None,
            "updatedAt": None,
        }
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "plan": sanitize_plan(_coerce_jsonb(row[0])),
        "updatedAt": _iso(row[1]),
    }


def save_sail_plan(slug: str, payload: Any, *, updated_by: str | None = None) -> dict[str, Any] | None:
    """Upsert the sanitized plan for this vessel. None if slug is unknown."""
    from guide_service import fetch_vessel, get_engine

    vessel = fetch_vessel(slug)
    if vessel is None:
        return None
    plan = sanitize_plan(payload)
    with get_engine().begin() as conn:
        row = conn.execute(
            text(
                """
                INSERT INTO vessel_sail_plan (vessel_id, plan, updated_at, updated_by)
                VALUES (:vessel_id, CAST(:plan AS jsonb), now(), :updated_by)
                ON CONFLICT (vessel_id) DO UPDATE SET
                    plan = EXCLUDED.plan,
                    updated_at = now(),
                    updated_by = EXCLUDED.updated_by
                RETURNING plan, updated_at
                """
            ),
            {
                "vessel_id": vessel["id"],
                "plan": json.dumps(plan, ensure_ascii=False),
                "updated_by": updated_by,
            },
        ).fetchone()
    assert row is not None
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "plan": sanitize_plan(_coerce_jsonb(row[0])),
        "updatedAt": _iso(row[1]),
    }
