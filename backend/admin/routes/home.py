from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text

from admin.auth import require_admin_user
from admin.deps import get_engine, templates

router = APIRouter(tags=["admin-home"])


@router.get("/")
async def admin_home(
    request: Request,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        vessel_count = conn.execute(text("SELECT COUNT(*) FROM vessels")).scalar()
        base_count = conn.execute(text("SELECT COUNT(*) FROM charter_operating_bases")).scalar()
        publication_count = conn.execute(
            text("SELECT COUNT(*) FROM vessel_guide_publication")
        ).scalar()
        draft_count = conn.execute(
            text("SELECT COUNT(*) FROM guide_content WHERE status = 'draft'")
        ).scalar()
        equipment_count = conn.execute(text("SELECT COUNT(*) FROM equipment")).scalar()

    return templates.TemplateResponse(
        request,
        "home.html",
        {
            "admin_user": admin_user,
            "stats": {
                "vessels": vessel_count,
                "operating_bases": base_count,
                "publications": publication_count,
                "draft_modules": draft_count,
                "equipment": equipment_count,
            },
        },
    )
