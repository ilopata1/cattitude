from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import text

from admin.auth import require_admin_user
from admin.deps import get_engine, templates
from guide_bootstrap import split_bootstrap, resolve_bootstrap_json
from guide_publish import PublishValidationError, assemble_publication, publish_vessel_guide

router = APIRouter(prefix="/vessels/{vessel_id}/guide", tags=["admin-guide"])


def _load_vessel(conn, vessel_id: str) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT
                v.id, v.name, v.slug,
                b.name AS base_name,
                b.guide_context_version,
                b.updated_at AS base_updated_at
            FROM vessels v
            LEFT JOIN charter_operating_bases b ON b.id = v.charter_operating_base_id
            WHERE v.id = :vessel_id
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchone()
    if not row:
        return None
    return {
        "id": str(row[0]),
        "name": row[1],
        "slug": row[2],
        "base_name": row[3],
        "guide_context_version": row[4],
        "base_updated_at": row[5],
    }


def _load_modules(conn, vessel_id: str) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT
                id, content_type, content_key, source, status,
                created_at, approved_at, approved_by
            FROM guide_content
            WHERE vessel_id = :vessel_id
            ORDER BY content_type, content_key, created_at DESC
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "content_type": row[1],
            "content_key": row[2],
            "source": row[3],
            "status": row[4],
            "created_at": row[5],
            "approved_at": row[6],
            "approved_by": row[7],
        }
        for row in rows
    ]


@router.get("")
async def vessel_guide_overview(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        vessel = _load_vessel(conn, vessel_id)
        if vessel is None:
            return RedirectResponse("/admin/vessels", status_code=303)
        modules = _load_modules(conn, vessel_id)
        latest = conn.execute(
            text(
                """
                SELECT version, content_hash, published_at, published_by
                FROM vessel_guide_publication
                WHERE vessel_id = :vessel_id
                ORDER BY published_at DESC, version DESC
                LIMIT 1
                """
            ),
            {"vessel_id": vessel_id},
        ).fetchone()

    publication = None
    stale_context = False
    if latest:
        publication = {
            "version": latest[0],
            "content_hash": latest[1],
            "published_at": latest[2],
            "published_by": latest[3],
        }
        if vessel["base_updated_at"] and latest[2]:
            stale_context = vessel["base_updated_at"] > latest[2]

    preview_error = None
    preview = None
    try:
        with get_engine().connect() as conn:
            preview = assemble_publication(conn, vessel_id, vessel["slug"])
    except PublishValidationError as exc:
        preview_error = exc.messages

    return templates.TemplateResponse(
        request,
        "guide/overview.html",
        {
            "admin_user": admin_user,
            "vessel": vessel,
            "modules": modules,
            "publication": publication,
            "stale_context": stale_context,
            "preview": preview,
            "preview_error": preview_error,
            "reimport_error": None,
        },
    )


@router.post("/modules/{module_id}/approve")
async def approve_module(
    vessel_id: str,
    module_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        conn.execute(
            text(
                """
                UPDATE guide_content
                SET status = 'approved', approved_at = now(), approved_by = :approved_by
                WHERE id = :module_id
                  AND vessel_id = :vessel_id
                  AND status = 'draft'
                """
            ),
            {
                "module_id": module_id,
                "vessel_id": vessel_id,
                "approved_by": admin_user,
            },
        )
    return RedirectResponse(f"/admin/vessels/{vessel_id}/guide", status_code=303)


@router.get("/publish")
async def publish_preview(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        vessel = _load_vessel(conn, vessel_id)
        if vessel is None:
            return RedirectResponse("/admin/vessels", status_code=303)

    preview_error = None
    preview = None
    try:
        with get_engine().connect() as conn:
            preview = assemble_publication(conn, vessel_id, vessel["slug"])
    except PublishValidationError as exc:
        preview_error = exc.messages

    return templates.TemplateResponse(
        request,
        "guide/publish.html",
        {
            "admin_user": admin_user,
            "vessel": vessel,
            "preview": preview,
            "preview_error": preview_error,
        },
    )


@router.post("/publish")
async def publish_confirm(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
    confirm: str = Form(""),
):
    if confirm != "yes":
        return RedirectResponse(f"/admin/vessels/{vessel_id}/guide/publish", status_code=303)

    with get_engine().connect() as conn:
        vessel = _load_vessel(conn, vessel_id)
        if vessel is None:
            return RedirectResponse("/admin/vessels", status_code=303)

    try:
        with get_engine().begin() as conn:
            result = publish_vessel_guide(
                conn,
                vessel_id,
                vessel["slug"],
                published_by=admin_user,
            )
    except PublishValidationError as exc:
        return templates.TemplateResponse(
            request,
            "guide/publish.html",
            {
                "admin_user": admin_user,
                "vessel": vessel,
                "preview": None,
                "preview_error": exc.messages,
            },
            status_code=400,
        )

    return RedirectResponse(
        f"/admin/vessels/{vessel_id}/guide?published={result['version']}",
        status_code=303,
    )


@router.post("/reimport")
async def reimport_from_repository_json(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
    confirm: str = Form(""),
):
    if confirm != "yes":
        return RedirectResponse(f"/admin/vessels/{vessel_id}/guide", status_code=303)

    with get_engine().connect() as conn:
        vessel = _load_vessel(conn, vessel_id)
        if vessel is None:
            return RedirectResponse("/admin/vessels", status_code=303)

    try:
        json_path = resolve_bootstrap_json(vessel["slug"])
    except FileNotFoundError:
        with get_engine().connect() as conn:
            modules = _load_modules(conn, vessel_id)
        return templates.TemplateResponse(
            request,
            "guide/overview.html",
            {
                "admin_user": admin_user,
                "vessel": vessel,
                "modules": modules,
                "publication": None,
                "stale_context": False,
                "preview": None,
                "preview_error": None,
                "reimport_error": (
                    f"Bootstrap JSON for '{vessel['slug']}' not available on this server."
                ),
            },
            status_code=400,
        )

    with json_path.open(encoding="utf-8") as handle:
        bootstrap = json.load(handle)

    modules = split_bootstrap(bootstrap)
    with get_engine().begin() as conn:
        conn.execute(
            text(
                """
                UPDATE guide_content
                SET status = 'superseded'
                WHERE vessel_id = :vessel_id
                  AND status IN ('approved', 'published', 'draft')
                """
            ),
            {"vessel_id": vessel_id},
        )
        for module in modules:
            conn.execute(
                text(
                    """
                    INSERT INTO guide_content (
                        vessel_id, content_type, content_key, payload,
                        source, status, approved_at, approved_by
                    )
                    VALUES (
                        :vessel_id, :content_type, :content_key, CAST(:payload AS jsonb),
                        'imported', 'approved', now(), :approved_by
                    )
                    """
                ),
                {
                    "vessel_id": vessel_id,
                    "content_type": module["content_type"],
                    "content_key": module["content_key"],
                    "payload": json.dumps(module["payload"]),
                    "approved_by": admin_user,
                },
            )

    return RedirectResponse(
        f"/admin/vessels/{vessel_id}/guide?reimported=1",
        status_code=303,
    )
