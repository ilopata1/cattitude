from __future__ import annotations

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
    SYSTEM_CATEGORIES,
    VESSEL_TYPES,
    ZONE_CARDINALITIES,
    ZONES,
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

router = APIRouter(prefix="/equipment", tags=["admin-equipment"])


def _form_context() -> dict:
    return {
        "vessel_types": VESSEL_TYPES,
        "system_categories": SYSTEM_CATEGORIES,
        "equipment_classes": EQUIPMENT_CLASSES,
        "configuration_tiers": CONFIGURATION_TIERS,
        "identification_methods": IDENTIFICATION_METHODS,
        "zone_cardinalities": ZONE_CARDINALITIES,
        "zones": ZONES,
        "pack_sources": PACK_SOURCES,
        "constraint_types": CONSTRAINT_TYPES,
    }


def _parse_equipment_form(
  *,
  manufacturer: str,
  model: str,
  vessel_types: list[str],
  zone: str,
  zone_cardinality: str,
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
        "zone": zone,
        "zone_cardinality": zone_cardinality or "fixed",
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
        )
        items = list_equipment(
            conn,
            manufacturer=manufacturer,
            system_category=system_category,
            equipment_class=equipment_class,
            query=q,
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
    zone: str = Form(...),
    zone_cardinality: str = Form("fixed"),
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
        zone=zone,
        zone_cardinality=zone_cardinality,
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

    return templates.TemplateResponse(
        request,
        "equipment/form.html",
        {
            "admin_user": admin_user,
            "form_title": "Edit equipment",
            "equipment": equipment,
            "option_packs": option_packs,
            "constraints": constraints,
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
    zone: str = Form(...),
    zone_cardinality: str = Form("fixed"),
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
        zone=zone,
        zone_cardinality=zone_cardinality,
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
