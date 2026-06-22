from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import text

from admin.auth import require_admin_user
from admin.deps import get_engine, templates

router = APIRouter(prefix="/vessels", tags=["admin-vessels"])


@router.get("")
async def list_vessels(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    drafts: bool = Query(False),
    published: bool = Query(False),
):
    with get_engine().connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                    v.id, v.name, v.slug, v.vessel_type,
                    c.name AS company_name,
                    b.name AS base_name,
                    b.guide_context_version,
                    b.updated_at AS base_updated_at,
                    (
                        SELECT COUNT(*)
                        FROM guide_content gc
                        WHERE gc.vessel_id = v.id AND gc.status = 'approved'
                    ) AS approved_modules,
                    (
                        SELECT COUNT(*)
                        FROM guide_content gc
                        WHERE gc.vessel_id = v.id AND gc.status = 'draft'
                    ) AS draft_modules,
                    pub.version AS pub_version,
                    pub.content_hash AS pub_hash,
                    pub.published_at AS pub_published_at
                FROM vessels v
                LEFT JOIN charter_companies c ON c.id = v.charter_company_id
                LEFT JOIN charter_operating_bases b ON b.id = v.charter_operating_base_id
                LEFT JOIN LATERAL (
                    SELECT version, content_hash, published_at
                    FROM vessel_guide_publication
                    WHERE vessel_id = v.id
                    ORDER BY published_at DESC, version DESC
                    LIMIT 1
                ) pub ON true
                ORDER BY v.name
                """
            )
        ).fetchall()

    vessels = []
    for row in rows:
        latest = None
        if row[10] is not None:
            latest = {
                "version": row[10],
                "content_hash": row[11],
                "published_at": row[12],
            }
        stale_context = bool(
            latest and row[7] and row[7] > latest["published_at"]
        )
        vessels.append(
            {
                "id": str(row[0]),
                "name": row[1],
                "slug": row[2],
                "vessel_type": row[3],
                "company_name": row[4],
                "base_name": row[5],
                "guide_context_version": row[6],
                "approved_modules": row[8],
                "draft_modules": row[9],
                "latest_publication": latest,
                "stale_context": stale_context,
            }
        )

    if drafts:
        vessels = [vessel for vessel in vessels if vessel["draft_modules"] > 0]
    if published:
        vessels = [vessel for vessel in vessels if vessel["latest_publication"]]

    filter_label = None
    if drafts:
        filter_label = "Vessels with draft modules"
    elif published:
        filter_label = "Vessels with publications"

    return templates.TemplateResponse(
        request,
        "vessels/list.html",
        {
            "admin_user": admin_user,
            "vessels": vessels,
            "filter_label": filter_label,
        },
    )
