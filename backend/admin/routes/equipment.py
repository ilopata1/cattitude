from __future__ import annotations

import json
import math

from fastapi import APIRouter, Depends, Form, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse

from admin.auth import require_admin_user
from admin.deps import get_engine, templates
from admin.enums import (
    CONFIGURATION_TIERS,
    CONSTRAINT_TYPES,
    EQUIPMENT_CLASSES,
    IDENTIFICATION_METHODS,
    PACK_SOURCES,
    VESSEL_TYPES,
)
from equipment_category import (
    EQUIPMENT_CATEGORIES,
    SAIL_ONLY_CATEGORIES,
    SAIL_VESSEL_TYPES,
)
from admin.equipment_service import (
    PER_PAGE,
    EquipmentServiceError,
    add_equipment_constraint,
    count_equipment,
    create_equipment,
    delete_equipment_constraint,
    find_equipment_by_manufacturer_model,
    get_equipment,
    list_distinct_manufacturers,
    list_equipment,
    list_equipment_constraints,
    list_equipment_option_packs,
    search_equipment_autocomplete,
    update_equipment,
)
from guide_equipment_fragments import (
    approve_equipment_fragment,
    delete_equipment_fragment,
    get_equipment_fragment,
    replace_equipment_fragment,
)
from fragment_drafting import FragmentDraftingError, draft_equipment_fragment
from admin.manual_service import list_works_for_equipment

router = APIRouter(prefix="/equipment", tags=["admin-equipment"])


def _form_context() -> dict:
    return {
        "vessel_types": VESSEL_TYPES,
        "equipment_categories": EQUIPMENT_CATEGORIES,
        "equipment_classes": EQUIPMENT_CLASSES,
        "configuration_tiers": CONFIGURATION_TIERS,
        "identification_methods": IDENTIFICATION_METHODS,
        "pack_sources": PACK_SOURCES,
        "constraint_types": CONSTRAINT_TYPES,
        "category_filter_json": json.dumps(
            {
                "sailOnly": sorted(SAIL_ONLY_CATEGORIES),
                "sailVesselTypes": sorted(SAIL_VESSEL_TYPES),
            }
        ),
    }


def _parse_equipment_form(
  *,
  manufacturer: str,
  model: str,
  vessel_types: list[str],
  system_category: str,
  equipment_class: str,
  configuration_tier: str,
  identification_method: str,
  has_formal_manual: str,
) -> dict:
    return {
        "manufacturer": manufacturer,
        "model": model,
        "vessel_types": vessel_types,
        "system_category": system_category,
        "equipment_class": equipment_class,
        "configuration_tier": configuration_tier,
        "identification_method": identification_method,
        "has_formal_manual": has_formal_manual == "yes",
    }


@router.get("")
async def list_equipment_page(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    manufacturer: str = Query(""),
    q: str = Query(""),
    system_category: str = Query(""),
    equipment_class: str = Query(""),
    has_manual: str = Query(""),
    has_fragment: str = Query(""),
    page: int = Query(1, ge=1),
):
    with get_engine().connect() as conn:
        manufacturers = list_distinct_manufacturers(conn)
        total = count_equipment(
            conn,
            manufacturer=manufacturer,
            system_category=system_category,
            equipment_class=equipment_class,
            query=q,
            has_manual=has_manual,
            has_fragment=has_fragment,
        )
        items = list_equipment(
            conn,
            manufacturer=manufacturer,
            system_category=system_category,
            equipment_class=equipment_class,
            query=q,
            has_manual=has_manual,
            has_fragment=has_fragment,
            page=page,
        )

    total_pages = max(1, math.ceil(total / PER_PAGE))
    return templates.TemplateResponse(
        request,
        "equipment/list.html",
        {
            "admin_user": admin_user,
            "items": items,
            "manufacturers": manufacturers,
            "manufacturer": manufacturer,
            "query": q,
            "system_category": system_category,
            "equipment_class": equipment_class,
            "has_manual": has_manual,
            "has_fragment": has_fragment,
            "page": page,
            "total": total,
            "total_pages": total_pages,
            "per_page": PER_PAGE,
            **_form_context(),
        },
    )


@router.get("/autocomplete")
async def equipment_autocomplete(
    admin_user: str = Depends(require_admin_user),
    q: str = Query(""),
):
    with get_engine().connect() as conn:
        results = search_equipment_autocomplete(conn, q)
    return JSONResponse(results)


@router.get("/new")
async def new_equipment_form(
    request: Request,
    admin_user: str = Depends(require_admin_user),
):
    return templates.TemplateResponse(
        request,
        "equipment/form.html",
        {
            "admin_user": admin_user,
            "form_title": "Add equipment",
            "equipment": None,
            "duplicate": None,
            "error": None,
            **_form_context(),
        },
    )


@router.post("/new")
async def create_equipment_action(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    manufacturer: str = Form(""),
    model: str = Form(""),
    vessel_types: list[str] = Form(default=[]),
    system_category: str = Form(...),
    equipment_class: str = Form(...),
    configuration_tier: str = Form(...),
    identification_method: str = Form(...),
    has_formal_manual: str = Form(""),
    confirm_create: str = Form(""),
):
    form_data = _parse_equipment_form(
        manufacturer=manufacturer,
        model=model,
        vessel_types=vessel_types,
        system_category=system_category,
        equipment_class=equipment_class,
        configuration_tier=configuration_tier,
        identification_method=identification_method,
        has_formal_manual=has_formal_manual,
    )

    with get_engine().begin() as conn:
        duplicate = find_equipment_by_manufacturer_model(
            conn, form_data["manufacturer"], form_data["model"]
        )
        if duplicate and confirm_create != "yes":
            return templates.TemplateResponse(
                request,
                "equipment/form.html",
                {
                    "admin_user": admin_user,
                    "form_title": "Add equipment",
                    "equipment": form_data,
                    "duplicate": duplicate,
                    "error": None,
                    **_form_context(),
                },
            )

        try:
            equipment_id = create_equipment(conn, form_data)
        except EquipmentServiceError as exc:
            return templates.TemplateResponse(
                request,
                "equipment/form.html",
                {
                    "admin_user": admin_user,
                    "form_title": "Add equipment",
                    "equipment": form_data,
                    "duplicate": None,
                    "error": str(exc),
                    **_form_context(),
                },
                status_code=400,
            )

    return RedirectResponse(f"/admin/equipment/{equipment_id}?created=1", status_code=303)


@router.get("/{equipment_id}")
async def edit_equipment_form(
    request: Request,
    equipment_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        equipment = get_equipment(conn, equipment_id)
        if equipment is None:
            return RedirectResponse("/admin/equipment", status_code=303)
        option_packs = list_equipment_option_packs(conn, equipment_id)
        constraints = list_equipment_constraints(conn, equipment_id)
        fragment = get_equipment_fragment(conn, equipment_id)
        manuals = list_works_for_equipment(conn, equipment_id)

    fragment_json = ""
    citations_json = ""
    if fragment:
        fragment_json = json.dumps(fragment["fragment"], indent=2, sort_keys=True)
        if fragment.get("source_citations"):
            citations_json = json.dumps(
                fragment["source_citations"], indent=2, sort_keys=True
            )

    return templates.TemplateResponse(
        request,
        "equipment/form.html",
        {
            "admin_user": admin_user,
            "form_title": "Edit equipment",
            "equipment": equipment,
            "option_packs": option_packs,
            "constraints": constraints,
            "fragment": fragment,
            "fragment_json": fragment_json,
            "citations_json": citations_json,
            "manuals": manuals,
            "duplicate": None,
            "error": None,
            **_form_context(),
        },
    )


@router.post("/{equipment_id}")
async def update_equipment_action(
    request: Request,
    equipment_id: str,
    admin_user: str = Depends(require_admin_user),
    manufacturer: str = Form(""),
    model: str = Form(""),
    vessel_types: list[str] = Form(default=[]),
    system_category: str = Form(...),
    equipment_class: str = Form(...),
    configuration_tier: str = Form(...),
    identification_method: str = Form(...),
    has_formal_manual: str = Form(""),
):
    form_data = _parse_equipment_form(
        manufacturer=manufacturer,
        model=model,
        vessel_types=vessel_types,
        system_category=system_category,
        equipment_class=equipment_class,
        configuration_tier=configuration_tier,
        identification_method=identification_method,
        has_formal_manual=has_formal_manual,
    )

    with get_engine().begin() as conn:
        duplicate = find_equipment_by_manufacturer_model(
            conn,
            form_data["manufacturer"],
            form_data["model"],
            exclude_id=equipment_id,
        )
        if duplicate:
            option_packs = list_equipment_option_packs(conn, equipment_id)
            constraints = list_equipment_constraints(conn, equipment_id)
            return templates.TemplateResponse(
                request,
                "equipment/form.html",
                {
                    "admin_user": admin_user,
                    "form_title": "Edit equipment",
                    "equipment": {**form_data, "id": equipment_id},
                    "option_packs": option_packs,
                    "constraints": constraints,
                    "duplicate": duplicate,
                    "error": "Another equipment record already uses this manufacturer and model.",
                    **_form_context(),
                },
                status_code=400,
            )

        try:
            update_equipment(conn, equipment_id, form_data)
        except EquipmentServiceError as exc:
            equipment = get_equipment(conn, equipment_id)
            option_packs = list_equipment_option_packs(conn, equipment_id)
            constraints = list_equipment_constraints(conn, equipment_id)
            return templates.TemplateResponse(
                request,
                "equipment/form.html",
                {
                    "admin_user": admin_user,
                    "form_title": "Edit equipment",
                    "equipment": equipment or {**form_data, "id": equipment_id},
                    "option_packs": option_packs,
                    "constraints": constraints,
                    "duplicate": None,
                    "error": str(exc),
                    **_form_context(),
                },
                status_code=400,
            )

    return RedirectResponse(f"/admin/equipment/{equipment_id}?saved=1", status_code=303)


@router.post("/{equipment_id}/constraints")
async def add_constraint_action(
    equipment_id: str,
    admin_user: str = Depends(require_admin_user),
    constraint_type: str = Form(...),
    target_equipment_id: str = Form(""),
    target_group_id: str = Form(""),
    source: str = Form(...),
):
    with get_engine().begin() as conn:
        try:
            add_equipment_constraint(
                conn,
                equipment_id,
                constraint_type=constraint_type,
                target_equipment_id=target_equipment_id or None,
                target_group_id=target_group_id or None,
                source=source,
            )
        except EquipmentServiceError as exc:
            return RedirectResponse(
                f"/admin/equipment/{equipment_id}?error={exc}",
                status_code=303,
            )

    return RedirectResponse(
        f"/admin/equipment/{equipment_id}?constraint_added=1",
        status_code=303,
    )


@router.post("/{equipment_id}/constraints/{constraint_id}/delete")
async def delete_constraint_action(
    equipment_id: str,
    constraint_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        try:
            delete_equipment_constraint(conn, equipment_id, constraint_id)
        except EquipmentServiceError as exc:
            return RedirectResponse(
                f"/admin/equipment/{equipment_id}?error={exc}",
                status_code=303,
            )

    return RedirectResponse(
        f"/admin/equipment/{equipment_id}?constraint_deleted=1",
        status_code=303,
    )


@router.post("/{equipment_id}/fragment")
async def save_equipment_fragment(
    equipment_id: str,
    admin_user: str = Depends(require_admin_user),
    fragment_json: str = Form(""),
    clear_fragment: str = Form(""),
    approve: str = Form(""),
):
    from urllib.parse import quote

    with get_engine().begin() as conn:
        equipment = get_equipment(conn, equipment_id)
        if equipment is None:
            return RedirectResponse("/admin/equipment", status_code=303)

        if clear_fragment == "yes":
            delete_equipment_fragment(conn, equipment_id)
            return RedirectResponse(
                f"/admin/equipment/{equipment_id}?fragment_cleared=1",
                status_code=303,
            )

        raw = fragment_json.strip()
        if not raw:
            return RedirectResponse(
                f"/admin/equipment/{equipment_id}?fragment_error={quote('Fragment JSON is empty.')}",
                status_code=303,
            )
        try:
            fragment = json.loads(raw)
        except json.JSONDecodeError as exc:
            return RedirectResponse(
                f"/admin/equipment/{equipment_id}?fragment_error={quote(str(exc))}",
                status_code=303,
            )
        if not isinstance(fragment, dict):
            return RedirectResponse(
                f"/admin/equipment/{equipment_id}?fragment_error={quote('Fragment must be a JSON object.')}",
                status_code=303,
            )

        existing = get_equipment_fragment(conn, equipment_id)
        status = "approved" if approve == "yes" else "draft"
        replace_equipment_fragment(
            conn,
            equipment_id,
            fragment,
            created_by=admin_user,
            status=status,
            source_citations=existing.get("source_citations") if existing else None,
        )

    query = "fragment_saved=1"
    if approve == "yes":
        query = "fragment_approved=1"
    return RedirectResponse(
        f"/admin/equipment/{equipment_id}?{query}",
        status_code=303,
    )


@router.post("/{equipment_id}/fragment/draft-from-manual")
async def draft_equipment_fragment_action(
    equipment_id: str,
    admin_user: str = Depends(require_admin_user),
):
    from urllib.parse import quote

    try:
        with get_engine().begin() as conn:
            equipment = get_equipment(conn, equipment_id)
            if equipment is None:
                return RedirectResponse("/admin/equipment", status_code=303)
            fragment, citations = draft_equipment_fragment(conn, equipment_id)
            replace_equipment_fragment(
                conn,
                equipment_id,
                fragment,
                created_by=admin_user,
                status="draft",
                source_citations=citations,
            )
    except FragmentDraftingError as exc:
        return RedirectResponse(
            f"/admin/equipment/{equipment_id}?fragment_error={quote(str(exc))}",
            status_code=303,
        )

    return RedirectResponse(
        f"/admin/equipment/{equipment_id}?fragment_drafted=1",
        status_code=303,
    )


@router.post("/{equipment_id}/fragment/approve")
async def approve_equipment_fragment_action(
    equipment_id: str,
    admin_user: str = Depends(require_admin_user),
):
    from urllib.parse import quote

    with get_engine().begin() as conn:
        equipment = get_equipment(conn, equipment_id)
        if equipment is None:
            return RedirectResponse("/admin/equipment", status_code=303)
        if not approve_equipment_fragment(
            conn, equipment_id, created_by=admin_user
        ):
            return RedirectResponse(
                f"/admin/equipment/{equipment_id}?fragment_error={quote('No fragment to approve.')}",
                status_code=303,
            )

    return RedirectResponse(
        f"/admin/equipment/{equipment_id}?fragment_approved=1",
        status_code=303,
    )
