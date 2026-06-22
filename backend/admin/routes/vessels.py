from __future__ import annotations

from fastapi import APIRouter, Depends, Form, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import text

from admin.auth import require_admin_user
from admin.deps import get_engine, templates
from admin.enums import SYSTEM_CATEGORIES, VESSEL_TYPES
from admin.vessel_service import (
    VesselServiceError,
    add_vessel_equipment,
    apply_option_pack,
    clone_vessel,
    create_vessel,
    get_vessel,
    list_charter_companies,
    list_operating_bases,
    list_option_packs,
    list_vessel_equipment,
    remove_vessel_equipment,
    search_equipment,
    slugify,
    update_vessel,
)

router = APIRouter(prefix="/vessels", tags=["admin-vessels"])


def _form_context(conn, vessel: dict | None = None, error: str | None = None) -> dict:
    companies = list_charter_companies(conn)
    charter_id = (vessel or {}).get("charter_company_id") or None
    return {
        "vessel": vessel,
        "companies": companies,
        "bases": list_operating_bases(conn, charter_company_id=charter_id or None),
        "all_bases": list_operating_bases(conn),
        "vessel_types": VESSEL_TYPES,
        "error": error,
    }


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
                    (
                        SELECT COUNT(*) FROM vessel_equipment ve
                        WHERE ve.vessel_id = v.id
                    ) AS equipment_count,
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
        if row[11] is not None:
            latest = {
                "version": row[11],
                "content_hash": row[12],
                "published_at": row[13],
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
                "equipment_count": row[10],
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


@router.get("/new")
async def new_vessel_form(
    request: Request,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        ctx = _form_context(conn, vessel=None)
    return templates.TemplateResponse(
        request,
        "vessels/form.html",
        {"admin_user": admin_user, "form_title": "Add vessel", **ctx},
    )


@router.post("/new")
async def create_vessel_action(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    name: str = Form(""),
    slug: str = Form(""),
    vessel_type: str = Form("sailing_catamaran"),
    charter_company_id: str = Form(""),
    charter_operating_base_id: str = Form(""),
):
    with get_engine().begin() as conn:
        try:
            vessel_id = create_vessel(
                conn,
                name=name,
                slug=slug or slugify(name),
                vessel_type=vessel_type,
                charter_company_id=charter_company_id or None,
                charter_operating_base_id=charter_operating_base_id or None,
            )
        except VesselServiceError as exc:
            vessel = {
                "name": name,
                "slug": slug or slugify(name),
                "vessel_type": vessel_type,
                "charter_company_id": charter_company_id,
                "charter_operating_base_id": charter_operating_base_id,
            }
            ctx = _form_context(conn, vessel=vessel, error=str(exc))
            return templates.TemplateResponse(
                request,
                "vessels/form.html",
                {
                    "admin_user": admin_user,
                    "form_title": "Add vessel",
                    **ctx,
                },
                status_code=400,
            )
    return RedirectResponse(f"/admin/vessels/{vessel_id}/edit?created=1", status_code=303)


@router.get("/{vessel_id}/edit")
async def edit_vessel_form(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        vessel = get_vessel(conn, vessel_id)
        if vessel is None:
            return RedirectResponse("/admin/vessels", status_code=303)
        ctx = _form_context(conn, vessel=vessel)
    return templates.TemplateResponse(
        request,
        "vessels/form.html",
        {"admin_user": admin_user, "form_title": "Edit vessel", **ctx},
    )


@router.post("/{vessel_id}/edit")
async def update_vessel_action(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
    name: str = Form(""),
    slug: str = Form(""),
    vessel_type: str = Form("sailing_catamaran"),
    charter_company_id: str = Form(""),
    charter_operating_base_id: str = Form(""),
):
    with get_engine().begin() as conn:
        try:
            update_vessel(
                conn,
                vessel_id,
                name=name,
                slug=slug,
                vessel_type=vessel_type,
                charter_company_id=charter_company_id or None,
                charter_operating_base_id=charter_operating_base_id or None,
            )
        except VesselServiceError as exc:
            vessel = {
                "id": vessel_id,
                "name": name,
                "slug": slug,
                "vessel_type": vessel_type,
                "charter_company_id": charter_company_id,
                "charter_operating_base_id": charter_operating_base_id,
            }
            ctx = _form_context(conn, vessel=vessel, error=str(exc))
            return templates.TemplateResponse(
                request,
                "vessels/form.html",
                {
                    "admin_user": admin_user,
                    "form_title": "Edit vessel",
                    **ctx,
                },
                status_code=400,
            )
    return RedirectResponse(f"/admin/vessels/{vessel_id}/edit?saved=1", status_code=303)


@router.get("/{vessel_id}/clone")
async def clone_vessel_form(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        source = get_vessel(conn, vessel_id)
        if source is None:
            return RedirectResponse("/admin/vessels", status_code=303)
        ctx = _form_context(conn)
    return templates.TemplateResponse(
        request,
        "vessels/clone.html",
        {
            "admin_user": admin_user,
            "source": source,
            **ctx,
        },
    )


@router.post("/{vessel_id}/clone")
async def clone_vessel_action(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
    name: str = Form(""),
    slug: str = Form(""),
    vessel_type: str = Form(""),
    charter_company_id: str = Form(""),
    charter_operating_base_id: str = Form(""),
    copy_equipment: str = Form(""),
    copy_guide_modules: str = Form(""),
):
    with get_engine().begin() as conn:
        source = get_vessel(conn, vessel_id)
        if source is None:
            return RedirectResponse("/admin/vessels", status_code=303)
        try:
            new_id = clone_vessel(
                conn,
                vessel_id,
                name=name,
                slug=slug or slugify(name),
                vessel_type=vessel_type or None,
                charter_company_id=charter_company_id or None,
                charter_operating_base_id=charter_operating_base_id or None,
                copy_equipment=copy_equipment == "yes",
                copy_guide_modules=copy_guide_modules == "yes",
                admin_user=admin_user,
            )
        except VesselServiceError as exc:
            ctx = _form_context(conn)
            return templates.TemplateResponse(
                request,
                "vessels/clone.html",
                {
                    "admin_user": admin_user,
                    "source": source,
                    "error": str(exc),
                    "form": {
                        "name": name,
                        "slug": slug,
                        "vessel_type": vessel_type or source["vessel_type"],
                        "charter_company_id": charter_company_id,
                        "charter_operating_base_id": charter_operating_base_id,
                    },
                    **ctx,
                },
                status_code=400,
            )
    return RedirectResponse(f"/admin/vessels/{new_id}/edit?cloned=1", status_code=303)


@router.get("/{vessel_id}/equipment")
async def vessel_equipment_page(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
    q: str = Query(""),
    system_category: str = Query(""),
):
    with get_engine().connect() as conn:
        vessel = get_vessel(conn, vessel_id)
        if vessel is None:
            return RedirectResponse("/admin/vessels", status_code=303)
        installed = list_vessel_equipment(conn, vessel_id)
        results = search_equipment(
            conn,
            query=q,
            system_category=system_category,
            vessel_type=vessel["vessel_type"],
        )
        packs = list_option_packs(conn)

    installed_ids = {item["equipment_id"] for item in installed}
    return templates.TemplateResponse(
        request,
        "vessels/equipment.html",
        {
            "admin_user": admin_user,
            "vessel": vessel,
            "installed": installed,
            "installed_ids": installed_ids,
            "results": results,
            "option_packs": packs,
            "system_categories": SYSTEM_CATEGORIES,
            "query": q,
            "system_category": system_category,
        },
    )


@router.post("/{vessel_id}/equipment/add")
async def add_equipment_action(
    vessel_id: str,
    equipment_id: str = Form(...),
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        add_vessel_equipment(conn, vessel_id, equipment_id)
    return RedirectResponse(f"/admin/vessels/{vessel_id}/equipment", status_code=303)


@router.post("/{vessel_id}/equipment/remove")
async def remove_equipment_action(
    vessel_id: str,
    equipment_id: str = Form(...),
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        remove_vessel_equipment(conn, vessel_id, equipment_id)
    return RedirectResponse(f"/admin/vessels/{vessel_id}/equipment", status_code=303)


@router.post("/{vessel_id}/equipment/apply-pack")
async def apply_pack_action(
    request: Request,
    vessel_id: str,
    option_pack_id: str = Form(...),
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        try:
            apply_option_pack(conn, vessel_id, option_pack_id)
        except VesselServiceError as exc:
            return RedirectResponse(
                f"/admin/vessels/{vessel_id}/equipment?error={exc}",
                status_code=303,
            )
    return RedirectResponse(
        f"/admin/vessels/{vessel_id}/equipment?pack_applied=1",
        status_code=303,
    )
