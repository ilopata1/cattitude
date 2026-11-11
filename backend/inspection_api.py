"""Vessel daily inspection API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from inspection_days import fetch_inspections, save_inspections

router = APIRouter(prefix="/api/v1/vessels/{slug}", tags=["inspections"])


def _days(body: Any) -> Any:
    if isinstance(body, dict):
        return body.get("days")
    return body


@router.get("/inspections")
async def get_inspections(slug: str) -> JSONResponse:
    result = fetch_inspections(slug)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})


@router.post("/inspections")
async def post_inspections(slug: str, body: dict[str, Any]) -> JSONResponse:
    result = save_inspections(slug, _days(body))
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})
