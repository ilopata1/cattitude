from __future__ import annotations

import json
from urllib.parse import quote, urlencode

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
    list_hull_models,
    list_operating_bases,
    list_option_packs,
    list_equipment_manufacturers,
    list_vessel_equipment,
    remove_vessel_equipment,
    search_equipment,
    slugify,
    update_vessel,
    update_vessel_equipment_location,
)
from guide_context_utils import build_guide_context_from_form
from guide_equipment_coverage import list_system_equipment_gaps
from location_model import build_catalog

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
        "hull_models": list_hull_models(conn),
        "error": error,
    }


@router.get("")
async def list_vessels(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    drafts: bool = Query(False),
    published: bool = Query(False),
    charter_company_id: str = Query(""),
):
    clauses: list[str] = []
    params: dict[str, str] = {}
    if charter_company_id:
        clauses.append("v.charter_company_id = :charter_company_id")
        params["charter_company_id"] = charter_company_id
    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with get_engine().connect() as conn:
        company_name = None
        if charter_company_id:
            company_name = conn.execute(
                text("SELECT name FROM charter_companies WHERE id = :id"),
                {"id": charter_company_id},
            ).scalar()

        rows = conn.execute(
            text(
                f"""
                SELECT
                    v.id, v.name, v.slug, v.vessel_type,
                    c.name AS company_name,
                    b.name AS base_name,
                    hm.manufacturer AS hull_manufacturer,
                    hm.model_code AS hull_model_code,
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
                LEFT JOIN hull_model hm ON hm.id = v.hull_model_id
                LEFT JOIN LATERAL (
                    SELECT version, content_hash, published_at
                    FROM vessel_guide_publication
                    WHERE vessel_id = v.id
                    ORDER BY published_at DESC, version DESC
                    LIMIT 1
                ) pub ON true
                {where_sql}
                ORDER BY v.name
                """
            ),
            params,
        ).fetchall()

    vessels = []
    for row in rows:
        latest = None
        if row[13] is not None:
            latest = {
                "version": row[13],
                "content_hash": row[14],
                "published_at": row[15],
            }
        stale_context = bool(
            latest and row[9] and row[9] > latest["published_at"]
        )
        vessels.append(
            {
                "id": str(row[0]),
                "name": row[1],
                "slug": row[2],
                "vessel_type": row[3],
                "company_name": row[4],
                "base_name": row[5],
                "hull_manufacturer": row[6],
                "hull_model_code": row[7],
                "guide_context_version": row[8],
                "approved_modules": row[10],
                "draft_modules": row[11],
                "equipment_count": row[12],
                "latest_publication": latest,
                "stale_context": stale_context,
            }
        )

    if drafts:
        vessels = [vessel for vessel in vessels if vessel["draft_modules"] > 0]
    if published:
        vessels = [vessel for vessel in vessels if vessel["latest_publication"]]

    filter_parts: list[str] = []
    if company_name:
        filter_parts.append(f"Vessels for {company_name}")
    if drafts:
        filter_parts.append("with draft modules")
    elif published:
        filter_parts.append("with publications")
    filter_label = " ".join(filter_parts) if filter_parts else None

    return templates.TemplateResponse(
        request,
        "vessels/list.html",
        {
            "admin_user": admin_user,
            "vessels": vessels,
            "filter_label": filter_label,
            "charter_company_id": charter_company_id,
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
    hull_model_id: str = Form(""),
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
                hull_model_id=hull_model_id or None,
            )
        except VesselServiceError as exc:
            vessel = {
                "name": name,
                "slug": slug or slugify(name),
                "vessel_type": vessel_type,
                "charter_company_id": charter_company_id,
                "charter_operating_base_id": charter_operating_base_id,
                "hull_model_id": hull_model_id,
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
    hull_model_id: str = Form(""),
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
                hull_model_id=hull_model_id or None,
            )
        except VesselServiceError as exc:
            vessel = {
                "id": vessel_id,
                "name": name,
                "slug": slug,
                "vessel_type": vessel_type,
                "charter_company_id": charter_company_id,
                "charter_operating_base_id": charter_operating_base_id,
                "hull_model_id": hull_model_id,
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
    manufacturer: str = Query(""),
    q: str = Query(""),
    system_category: str = Query(""),
):
    with get_engine().connect() as conn:
        vessel = get_vessel(conn, vessel_id)
        if vessel is None:
            return RedirectResponse("/admin/vessels", status_code=303)
        installed = list_vessel_equipment(conn, vessel_id)
        manufacturers = list_equipment_manufacturers(
            conn, vessel_type=vessel["vessel_type"]
        )
        results = search_equipment(
            conn,
            manufacturer=manufacturer,
            query=q,
            system_category=system_category,
            vessel_type=vessel["vessel_type"],
        )
        packs = list_option_packs(
            conn, hull_model_id=vessel.get("hull_model_id") or None
        )

    installed_ids = {item["equipment_id"] for item in installed}
    guide_equipment_gaps = list_system_equipment_gaps(
        [{"system_category": item["system_category"]} for item in installed]
    )
    catalog = build_catalog(vessel["vessel_type"])
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
            "manufacturers": manufacturers,
            "manufacturer": manufacturer,
            "query": q,
            "system_category": system_category,
            "guide_equipment_gaps": guide_equipment_gaps,
            "location_catalog": catalog,
            "location_catalog_json": json.dumps(catalog),
        },
    )


def _equipment_search_query(
    manufacturer: str, q: str, system_category: str
) -> str:
    params = {
        k: v
        for k, v in (
            ("manufacturer", manufacturer),
            ("q", q),
            ("system_category", system_category),
        )
        if v
    }
    return f"?{urlencode(params)}" if params else ""


@router.post("/{vessel_id}/equipment/add")
async def add_equipment_action(
    vessel_id: str,
    equipment_id: str = Form(...),
    zone: str = Form(""),
    sub_zone: str = Form(""),
    hull_side: str = Form(""),
    detail: str = Form(""),
    manufacturer: str = Form(""),
    q: str = Form(""),
    system_category: str = Form(""),
    admin_user: str = Depends(require_admin_user),
):
    error: str | None = None
    with get_engine().begin() as conn:
        try:
            add_vessel_equipment(
                conn,
                vessel_id,
                equipment_id,
                zone=zone or None,
                sub_zone=sub_zone or None,
                hull_side=hull_side or None,
                detail=detail or None,
            )
        except VesselServiceError as exc:
            error = str(exc)
    # Preserve the registry search and return to it (not the page top) so the
    # user can keep adding from the same result set.
    query = _equipment_search_query(manufacturer, q, system_category)
    if error:
        sep = "&" if query else "?"
        query = f"{query}{sep}error={quote(error)}"
    return RedirectResponse(
        f"/admin/vessels/{vessel_id}/equipment{query}#registry",
        status_code=303,
    )


@router.post("/{vessel_id}/equipment/edit-location")
async def edit_equipment_location_action(
    vessel_id: str,
    row_id: str = Form(...),
    zone: str = Form(""),
    sub_zone: str = Form(""),
    hull_side: str = Form(""),
    detail: str = Form(""),
    admin_user: str = Depends(require_admin_user),
):
    error: str | None = None
    with get_engine().begin() as conn:
        try:
            update_vessel_equipment_location(
                conn,
                vessel_id,
                row_id,
                zone=zone or None,
                sub_zone=sub_zone or None,
                hull_side=hull_side or None,
                detail=detail or None,
            )
        except VesselServiceError as exc:
            error = str(exc)
    query = f"?error={quote(error)}" if error else ""
    return RedirectResponse(
        f"/admin/vessels/{vessel_id}/equipment{query}#installed",
        status_code=303,
    )


@router.post("/{vessel_id}/equipment/remove")
async def remove_equipment_action(
    vessel_id: str,
    row_id: str = Form(...),
    manufacturer: str = Form(""),
    q: str = Form(""),
    system_category: str = Form(""),
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        remove_vessel_equipment(conn, vessel_id, row_id)
    query = _equipment_search_query(manufacturer, q, system_category)
    return RedirectResponse(
        f"/admin/vessels/{vessel_id}/equipment{query}#installed",
        status_code=303,
    )


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
                f"/admin/vessels/{vessel_id}/equipment?error={exc}#installed",
                status_code=303,
            )
    return RedirectResponse(
        f"/admin/vessels/{vessel_id}/equipment?pack_applied=1#installed",
        status_code=303,
    )


@router.get("/{vessel_id}/guide-context")
async def vessel_guide_context_form(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT
                    v.id, v.name, v.slug,
                    v.guide_context, v.guide_context_version,
                    b.name AS base_name
                FROM vessels v
                LEFT JOIN charter_operating_bases b ON b.id = v.charter_operating_base_id
                WHERE v.id = :vessel_id
                """
            ),
            {"vessel_id": vessel_id},
        ).fetchone()
        if not row:
            return RedirectResponse("/admin/vessels", status_code=303)
        context = row[3] if isinstance(row[3], dict) else json.loads(row[3] or "{}")

    return templates.TemplateResponse(
        request,
        "vessels/guide_context.html",
        {
            "admin_user": admin_user,
            "vessel": {
                "id": str(row[0]),
                "name": row[1],
                "slug": row[2],
                "guide_context_version": row[4],
                "base_name": row[5],
            },
            "context": context,
            "emergency_contacts_json": json.dumps(
                context.get("emergencyContacts", []), indent=2
            ),
            "local_rules_text": "\n".join(context.get("localRules", [])),
            "error": None,
        },
    )


@router.post("/{vessel_id}/guide-context")
async def save_vessel_guide_context(
    request: Request,
    vessel_id: str,
    admin_user: str = Depends(require_admin_user),
    display_name: str = Form(""),
    region_label: str = Form(""),
    marina: str = Form(""),
    country_code: str = Form(""),
    timezone: str = Form(""),
    vessel_callsign: str = Form(""),
    office_vhf_label: str = Form(""),
    office_vhf_channel: str = Form(""),
    office_vhf_hours: str = Form(""),
    marina_vhf_label: str = Form(""),
    marina_vhf_channel: str = Form(""),
    marina_vhf_detail: str = Form(""),
    emergency_contacts_json: str = Form("[]"),
    local_rules_text: str = Form(""),
):
    error: str | None = None
    try:
        guide_context = build_guide_context_from_form(
            display_name=display_name,
            region_label=region_label,
            marina=marina,
            country_code=country_code,
            timezone=timezone,
            vessel_callsign=vessel_callsign,
            office_vhf_label=office_vhf_label,
            office_vhf_channel=office_vhf_channel,
            office_vhf_hours=office_vhf_hours,
            marina_vhf_label=marina_vhf_label,
            marina_vhf_channel=marina_vhf_channel,
            marina_vhf_detail=marina_vhf_detail,
            emergency_contacts_json=emergency_contacts_json,
            local_rules_text=local_rules_text,
        )
    except (json.JSONDecodeError, ValueError) as exc:
        error = str(exc)
        guide_context = None

    if guide_context is not None:
        with get_engine().begin() as conn:
            updated = conn.execute(
                text(
                    """
                    UPDATE vessels
                    SET
                        guide_context = CAST(:guide_context AS jsonb),
                        guide_context_version = guide_context_version + 1
                    WHERE id = :vessel_id
                    RETURNING guide_context_version
                    """
                ),
                {
                    "vessel_id": vessel_id,
                    "guide_context": json.dumps(guide_context),
                },
            ).fetchone()
        if updated:
            return RedirectResponse(
                f"/admin/vessels/{vessel_id}/guide-context?saved=1",
                status_code=303,
            )
        error = "Vessel not found."

    with get_engine().connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT
                    v.id, v.name, v.slug,
                    v.guide_context, v.guide_context_version,
                    b.name AS base_name
                FROM vessels v
                LEFT JOIN charter_operating_bases b ON b.id = v.charter_operating_base_id
                WHERE v.id = :vessel_id
                """
            ),
            {"vessel_id": vessel_id},
        ).fetchone()
    if not row:
        return RedirectResponse("/admin/vessels", status_code=303)
    context = row[3] if isinstance(row[3], dict) else json.loads(row[3] or "{}")

    return templates.TemplateResponse(
        request,
        "vessels/guide_context.html",
        {
            "admin_user": admin_user,
            "vessel": {
                "id": str(row[0]),
                "name": row[1],
                "slug": row[2],
                "guide_context_version": row[4],
                "base_name": row[5],
            },
            "context": context,
            "emergency_contacts_json": emergency_contacts_json,
            "local_rules_text": local_rules_text,
            "error": error,
        },
        status_code=400,
    )

