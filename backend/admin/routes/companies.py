from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text

from admin.auth import require_admin_user
from admin.deps import get_engine, templates

router = APIRouter(prefix="/companies", tags=["admin-companies"])


@router.get("")
async def list_companies(
    request: Request,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                    c.id,
                    c.name,
                    c.auth0_org_id,
                    c.created_at,
                    (
                        SELECT COUNT(*) FROM charter_operating_bases b
                        WHERE b.charter_company_id = c.id
                    ) AS base_count,
                    (
                        SELECT COUNT(*) FROM vessels v
                        WHERE v.charter_company_id = c.id
                    ) AS vessel_count
                FROM charter_companies c
                ORDER BY c.name
                """
            )
        ).fetchall()

    companies = [
        {
            "id": str(row[0]),
            "name": row[1],
            "auth0_org_id": row[2],
            "created_at": row[3],
            "base_count": row[4],
            "vessel_count": row[5],
        }
        for row in rows
    ]
    return templates.TemplateResponse(
        request,
        "companies/list.html",
        {"admin_user": admin_user, "companies": companies},
    )
