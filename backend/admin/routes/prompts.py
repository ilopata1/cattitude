from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text

from admin.auth import require_admin_user
from admin.deps import get_engine, templates

router = APIRouter(prefix="/prompts", tags=["admin-prompts"])


@router.get("")
async def list_prompt_templates(
    request: Request,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                    id, scope, scope_id, content_type, content_key,
                    version, is_active, created_at, created_by
                FROM guide_prompt_template
                ORDER BY scope, content_type, content_key, version DESC
                """
            )
        ).fetchall()

    prompts = [
        {
            "id": str(row[0]),
            "scope": row[1],
            "scope_id": str(row[2]) if row[2] else None,
            "content_type": row[3],
            "content_key": row[4],
            "version": row[5],
            "is_active": row[6],
            "created_at": row[7],
            "created_by": row[8],
        }
        for row in rows
    ]
    return templates.TemplateResponse(
        request,
        "prompts/list.html",
        {"admin_user": admin_user, "prompts": prompts},
    )
