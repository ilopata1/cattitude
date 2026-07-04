from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import text

from admin.auth import require_admin_user
from admin.deps import get_engine, templates
from admin.guide_review_meta import attach_review_meta
from guide_generation import GuideGenerationError, STARTER_MODULES, run_guide_generation
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


def _coerce_jsonb(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value


def _load_module_detail(
    conn, vessel_id: str, module_id: str
) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT
                gc.id, gc.content_type, gc.content_key, gc.source, gc.status,
                gc.payload, gc.created_at, gc.created_by,
                gc.diff_against_id, gc.generation_run_id
            FROM guide_content gc
            WHERE gc.id = :module_id AND gc.vessel_id = :vessel_id
            """
        ),
        {"module_id": module_id, "vessel_id": vessel_id},
    ).fetchone()
    if row is None:
        return None

    baseline_payload = None
    baseline_label = None
    if row[8]:
        baseline_row = conn.execute(
            text("SELECT payload, status FROM guide_content WHERE id = :id"),
            {"id": row[8]},
        ).fetchone()
        if baseline_row:
            baseline_payload = _coerce_jsonb(baseline_row[0])
            baseline_label = f"Compared to prior module ({baseline_row[1]})"
    if baseline_payload is None:
        baseline_row = conn.execute(
            text(
                """
                SELECT payload, status
                FROM guide_content
                WHERE vessel_id = :vessel_id
                  AND content_type = :content_type
                  AND content_key = :content_key
                  AND status IN ('approved', 'published')
                  AND id <> :module_id
                ORDER BY approved_at DESC NULLS LAST, created_at DESC
                LIMIT 1
                """
            ),
            {
                "vessel_id": vessel_id,
                "content_type": row[1],
                "content_key": row[2],
                "module_id": module_id,
            },
        ).fetchone()
        if baseline_row:
            baseline_payload = _coerce_jsonb(baseline_row[0])
            baseline_label = f"Current approved ({baseline_row[1]})"

    draft_payload = _coerce_jsonb(row[5])
    module = {
        "id": str(row[0]),
        "content_type": row[1],
        "content_key": row[2],
        "source": row[3],
        "status": row[4],
        "payload": draft_payload,
        "payload_json": json.dumps(draft_payload, indent=2, sort_keys=True),
        "baseline_payload": baseline_payload,
        "baseline_json": json.dumps(baseline_payload, indent=2, sort_keys=True)
        if baseline_payload is not None
        else None,
        "baseline_label": baseline_label,
        "created_at": row[6],
        "created_by": row[7],
        "generation_run_id": str(row[9]) if row[9] else None,
    }
    return attach_review_meta(module)


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
        modules = [attach_review_meta(m) for m in _load_modules(conn, vessel_id)]
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
        },
    )


@router.get("/modules/{module_id}")
async def module_review_page(
    request: Request,
    vessel_id: str,
    module_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        vessel = _load_vessel(conn, vessel_id)
        if vessel is None:
            return RedirectResponse("/admin/vessels", status_code=303)
        module = _load_module_detail(conn, vessel_id, module_id)
        if module is None:
            return RedirectResponse(f"/admin/vessels/{vessel_id}/guide", status_code=303)

    return templates.TemplateResponse(
        request,
        "guide/module_review.html",
        {
            "admin_user": admin_user,
            "vessel": vessel,
            "module": module,
        },
    )


@router.post("/modules/{module_id}/approve")
async def approve_module(
    vessel_id: str,
    module_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT content_type, content_key
                FROM guide_content
                WHERE id = :module_id
                  AND vessel_id = :vessel_id
                  AND status = 'draft'
                """
            ),
            {"module_id": module_id, "vessel_id": vessel_id},
        ).fetchone()
        if row is None:
            return RedirectResponse(f"/admin/vessels/{vessel_id}/guide", status_code=303)

        conn.execute(
            text(
                """
                UPDATE guide_content
                SET status = 'superseded'
                WHERE vessel_id = :vessel_id
                  AND content_type = :content_type
                  AND content_key = :content_key
                  AND status IN ('approved', 'published')
                  AND id <> :module_id
                """
            ),
            {
                "vessel_id": vessel_id,
                "content_type": row[0],
                "content_key": row[1],
                "module_id": module_id,
            },
        )
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


@router.post("/generate")
async def generate_guide_modules(
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        vessel = _load_vessel(conn, vessel_id)
        if vessel is None:
            return RedirectResponse("/admin/vessels", status_code=303)

    try:
        with get_engine().begin() as conn:
            result = run_guide_generation(
                conn,
                vessel_id,
                STARTER_MODULES,
                created_by=admin_user,
            )
    except GuideGenerationError as exc:
        from urllib.parse import quote

        return RedirectResponse(
            f"/admin/vessels/{vessel_id}/guide?gen_error={quote(str(exc))}",
            status_code=303,
        )

    return RedirectResponse(
        f"/admin/vessels/{vessel_id}/guide?generated={len(result.runs)}",
        status_code=303,
    )


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
