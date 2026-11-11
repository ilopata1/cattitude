"""Vessel duty rota API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from duty_rota import fetch_duty_rota, save_duty_rota

router = APIRouter(prefix="/api/v1/vessels/{slug}", tags=["duty-rota"])


def _payload(body: Any) -> Any:
    if isinstance(body, dict) and isinstance(body.get("rota"), dict):
        return body["rota"]
    return body


@router.get("/duty-rota")
async def get_duty_rota(slug: str) -> JSONResponse:
    result = fetch_duty_rota(slug)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})


@router.post("/duty-rota")
async def post_duty_rota(slug: str, body: dict[str, Any]) -> JSONResponse:
    result = save_duty_rota(slug, _payload(body))
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})
