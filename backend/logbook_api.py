"""Vessel logbook API — entries and the active passage."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from logbook import fetch_logbook, save_logbook

router = APIRouter(prefix="/api/v1/vessels/{slug}", tags=["logbook"])


@router.get("/logbook")
async def get_logbook(slug: str, since: str | None = None) -> JSONResponse:
    result = fetch_logbook(slug, since)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})


@router.post("/logbook")
async def post_logbook(slug: str, body: dict[str, Any]) -> JSONResponse:
    include_passage = "passage" in body and body.get("passage") is not None
    result = save_logbook(
        slug,
        body.get("entries"),
        body.get("passage"),
        include_passage=include_passage,
    )
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")
    return JSONResponse(content=result, headers={"Cache-Control": "no-cache"})
