"""Vessel instrument-map API — Signal-K path bindings for native Sail instruments."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from instrument_map import fetch_instrument_map, save_instrument_map, sanitize_instrument_map

router = APIRouter(prefix="/api/v1/vessels/{slug}", tags=["instrument-map"])


def _payload_from_body(body: Any) -> Any:
    if isinstance(body, dict) and isinstance(body.get("map"), dict):
        return body["map"]
    return body


@router.get("/instrument-map")
async def get_instrument_map(slug: str) -> JSONResponse:
    result = fetch_instrument_map(slug)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})


@router.post("/instrument-map")
async def post_instrument_map(slug: str, body: dict[str, Any]) -> JSONResponse:
    cleaned = sanitize_instrument_map(_payload_from_body(body))
    result = save_instrument_map(slug, cleaned)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})
