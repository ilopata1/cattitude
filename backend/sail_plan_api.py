"""Vessel sail-plan API — load and save the Polar crossover matrix."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from sail_plan import fetch_sail_plan, save_sail_plan, sanitize_plan

router = APIRouter(prefix="/api/v1/vessels/{slug}", tags=["sail-plan"])


def _payload_from_body(body: Any) -> Any:
    if isinstance(body, dict) and isinstance(body.get("plan"), dict):
        return body["plan"]
    return body


@router.get("/sail-plan")
async def get_sail_plan(slug: str) -> JSONResponse:
    result = fetch_sail_plan(slug)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})


@router.post("/sail-plan")
async def post_sail_plan(slug: str, body: dict[str, Any]) -> JSONResponse:
    plan = sanitize_plan(_payload_from_body(body))
    result = save_sail_plan(slug, plan)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})
