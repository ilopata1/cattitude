from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from admin.auth import require_admin_user
from admin.deps import get_engine, templates
from admin.query_log_service import get_query_log, list_query_logs, list_vessels_for_filter

router = APIRouter(prefix="/query-logs", tags=["admin-query-logs"])

_PAGE_SIZE = 50


@router.get("")
async def query_logs_list(
    request: Request,
    vessel_id: str = Query(default=""),
    no_excerpts: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    admin_user: str = Depends(require_admin_user),
):
    vessel_filter = vessel_id.strip() or None
    no_excerpts_only = no_excerpts in {"1", "true", "yes"}
    offset = (page - 1) * _PAGE_SIZE

    with get_engine().connect() as conn:
        items, total = list_query_logs(
            conn,
            vessel_id=vessel_filter,
            no_excerpts_only=no_excerpts_only,
            limit=_PAGE_SIZE,
            offset=offset,
        )
        vessels = list_vessels_for_filter(conn)

    total_pages = max(1, (total + _PAGE_SIZE - 1) // _PAGE_SIZE)
    return templates.TemplateResponse(
        request,
        "query_logs/list.html",
        {
            "admin_user": admin_user,
            "items": items,
            "total": total,
            "page": page,
            "total_pages": total_pages,
            "vessel_id": vessel_filter or "",
            "no_excerpts": no_excerpts_only,
            "vessels": vessels,
        },
    )


@router.get("/{log_id}")
async def query_log_detail(
    request: Request,
    log_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        item = get_query_log(conn, log_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Query log not found")
    return templates.TemplateResponse(
        request,
        "query_logs/detail.html",
        {"admin_user": admin_user, "item": item},
    )
