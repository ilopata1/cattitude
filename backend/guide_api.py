"""Vessel guide sync API — manifest, bundle, and assets."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse

from guide_service import (
    build_manifest,
    fetch_latest_publication,
    fetch_vessel,
    read_asset_file,
    resolve_asset_path,
    validate_asset_path,
)

router = APIRouter(prefix="/api/v1/vessels/{slug}/guide", tags=["guide"])


def _load_publication(slug: str) -> tuple[dict[str, str], dict]:
    vessel = fetch_vessel(slug)
    if vessel is None:
        raise HTTPException(status_code=404, detail=f"Vessel '{slug}' not found")

    publication = fetch_latest_publication(vessel["id"])
    if publication is None:
        raise HTTPException(
            status_code=404,
            detail=f"No published guide for vessel '{slug}'",
        )
    return vessel, publication


@router.get("/manifest")
async def get_guide_manifest(slug: str) -> dict:
    vessel, publication = _load_publication(slug)
    return build_manifest(vessel, publication)


@router.get("/version")
async def get_guide_version(slug: str) -> dict:
    vessel, publication = _load_publication(slug)
    return {
        "vesselId": vessel["id"],
        "vesselSlug": vessel["slug"],
        "publicationVersion": publication["version"],
        "contentHash": publication["content_hash"],
        "publishedAt": publication["published_at"],
    }


@router.get("/bundle.json")
async def get_guide_bundle(slug: str) -> JSONResponse:
    _, publication = _load_publication(slug)
    payload = publication["payload"]
    return JSONResponse(
        content=payload,
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-Content-Hash": publication["content_hash"],
            "X-Publication-Version": str(publication["version"]),
        },
    )


@router.get("/assets/{asset_path:path}")
async def get_guide_asset(slug: str, asset_path: str) -> Response:
    _load_publication(slug)

    logical_path = resolve_asset_path(asset_path)
    try:
        validate_asset_path(logical_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        raw, content_hash = read_asset_file(logical_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Asset not found: {logical_path}") from exc

    media_type = "application/octet-stream"
    if logical_path.endswith(".png"):
        media_type = "image/png"
    elif logical_path.endswith(".jpg") or logical_path.endswith(".jpeg"):
        media_type = "image/jpeg"
    elif logical_path.endswith(".webp"):
        media_type = "image/webp"
    elif logical_path.endswith(".gif"):
        media_type = "image/gif"

    return Response(
        content=raw,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "ETag": content_hash,
            "X-Content-Hash": content_hash,
        },
    )
