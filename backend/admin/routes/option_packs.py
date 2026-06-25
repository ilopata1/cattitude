from __future__ import annotations

import math
from urllib.parse import quote

from fastapi import APIRouter, Depends, Form, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse

from admin.auth import require_admin_user
from admin.deps import get_engine, templates
from admin.enums import PACK_SOURCES
from admin.option_pack_service import (
    PER_PAGE,
    OptionPackServiceError,
    add_child_pack,
    add_pack_equipment,
    add_pack_hull_model,
    count_option_packs,
    create_option_pack,
    get_option_pack,
    list_child_packs,
    list_option_packs_admin,
    list_pack_equipment,
    list_pack_hull_models,
    list_pack_manufacturers,
    remove_child_pack,
    remove_pack_equipment,
    remove_pack_hull_model,
    search_option_packs_autocomplete,
    update_child_pack,
    update_option_pack,
    update_pack_equipment,
)
from admin.vessel_service import list_hull_models

router = APIRouter(prefix="/option-packs", tags=["admin-option-packs"])


def _form_context() -> dict:
    return {"pack_sources": PACK_SOURCES}


def _redirect_error(pack_id: str, exc: Exception) -> RedirectResponse:
    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?error={quote(str(exc))}",
        status_code=303,
    )


def _parse_int(value: str, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@router.get("")
async def list_option_packs_page(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    manufacturer: str = Query(""),
    q: str = Query(""),
    page: int = Query(1, ge=1),
):
    with get_engine().connect() as conn:
        manufacturers = list_pack_manufacturers(conn)
        total = count_option_packs(conn, manufacturer=manufacturer, query=q)
        items = list_option_packs_admin(
            conn, manufacturer=manufacturer, query=q, page=page
        )

    total_pages = max(1, math.ceil(total / PER_PAGE))
    return templates.TemplateResponse(
        request,
        "option_packs/list.html",
        {
            "admin_user": admin_user,
            "items": items,
            "manufacturers": manufacturers,
            "manufacturer": manufacturer,
            "query": q,
            "page": page,
            "total": total,
            "total_pages": total_pages,
            "per_page": PER_PAGE,
            **_form_context(),
        },
    )


@router.get("/autocomplete")
async def option_pack_autocomplete(
    admin_user: str = Depends(require_admin_user),
    q: str = Query(""),
    exclude_id: str = Query(""),
):
    with get_engine().connect() as conn:
        results = search_option_packs_autocomplete(
            conn, q, exclude_id=exclude_id or None
        )
    return JSONResponse(results)


@router.get("/new")
async def new_option_pack_form(
    request: Request,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        manufacturers = list_pack_manufacturers(conn)

    return templates.TemplateResponse(
        request,
        "option_packs/form.html",
        {
            "admin_user": admin_user,
            "manufacturers": manufacturers,
            "error": None,
            "form": {},
            **_form_context(),
        },
    )


@router.post("/new")
async def create_option_pack_action(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    manufacturer: str = Form(""),
    pack_name: str = Form(""),
    source: str = Form("team_researched"),
):
    form = {"manufacturer": manufacturer, "pack_name": pack_name, "source": source}

    with get_engine().begin() as conn:
        try:
            pack_id = create_option_pack(
                conn,
                manufacturer=manufacturer,
                pack_name=pack_name,
                source=source,
            )
        except OptionPackServiceError as exc:
            manufacturers = list_pack_manufacturers(conn)
            return templates.TemplateResponse(
                request,
                "option_packs/form.html",
                {
                    "admin_user": admin_user,
                    "manufacturers": manufacturers,
                    "error": str(exc),
                    "form": form,
                    **_form_context(),
                },
                status_code=400,
            )

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?created=1", status_code=303
    )


@router.get("/{pack_id}")
async def option_pack_detail_page(
    request: Request,
    pack_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        pack = get_option_pack(conn, pack_id)
        if pack is None:
            return RedirectResponse("/admin/option-packs", status_code=303)
        hull_models = list_pack_hull_models(conn, pack_id)
        equipment = list_pack_equipment(conn, pack_id)
        child_packs = list_child_packs(conn, pack_id)
        available_hulls = list_hull_models(conn, manufacturer=pack["manufacturer"])

    linked_hull_ids = {h["id"] for h in hull_models}
    hull_choices = [h for h in available_hulls if h["id"] not in linked_hull_ids]

    return templates.TemplateResponse(
        request,
        "option_packs/detail.html",
        {
            "admin_user": admin_user,
            "pack": pack,
            "hull_models": hull_models,
            "hull_choices": hull_choices,
            "equipment": equipment,
            "child_packs": child_packs,
            **_form_context(),
        },
    )


@router.post("/{pack_id}")
async def update_option_pack_action(
    pack_id: str,
    admin_user: str = Depends(require_admin_user),
    pack_name: str = Form(...),
    source: str = Form(...),
):
    with get_engine().begin() as conn:
        try:
            update_option_pack(conn, pack_id, pack_name=pack_name, source=source)
        except OptionPackServiceError as exc:
            return _redirect_error(pack_id, exc)

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?saved=1", status_code=303
    )


@router.post("/{pack_id}/hull-models")
async def add_hull_model_action(
    pack_id: str,
    admin_user: str = Depends(require_admin_user),
    hull_model_id: str = Form(...),
):
    with get_engine().begin() as conn:
        try:
            add_pack_hull_model(conn, pack_id, hull_model_id)
        except OptionPackServiceError as exc:
            return _redirect_error(pack_id, exc)

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?hull_added=1", status_code=303
    )


@router.post("/{pack_id}/hull-models/{hull_model_id}/delete")
async def remove_hull_model_action(
    pack_id: str,
    hull_model_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        try:
            remove_pack_hull_model(conn, pack_id, hull_model_id)
        except OptionPackServiceError as exc:
            return _redirect_error(pack_id, exc)

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?hull_removed=1", status_code=303
    )


@router.post("/{pack_id}/equipment")
async def add_equipment_action(
    pack_id: str,
    admin_user: str = Depends(require_admin_user),
    equipment_id: str = Form(""),
    sort_order: str = Form("0"),
    quantity: str = Form("1"),
    is_optional: str = Form(""),
    source_note: str = Form(""),
):
    if not equipment_id:
        return _redirect_error(pack_id, OptionPackServiceError("Select equipment."))

    with get_engine().begin() as conn:
        try:
            add_pack_equipment(
                conn,
                pack_id,
                equipment_id,
                sort_order=_parse_int(sort_order),
                quantity=max(1, _parse_int(quantity, 1)),
                is_optional=is_optional == "yes",
                source_note=source_note,
            )
        except OptionPackServiceError as exc:
            return _redirect_error(pack_id, exc)

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?equipment_added=1", status_code=303
    )


@router.post("/{pack_id}/equipment/{equipment_id}")
async def update_equipment_action(
    pack_id: str,
    equipment_id: str,
    admin_user: str = Depends(require_admin_user),
    sort_order: str = Form("0"),
    quantity: str = Form("1"),
    is_optional: str = Form(""),
    source_note: str = Form(""),
):
    with get_engine().begin() as conn:
        try:
            update_pack_equipment(
                conn,
                pack_id,
                equipment_id,
                sort_order=_parse_int(sort_order),
                quantity=max(1, _parse_int(quantity, 1)),
                is_optional=is_optional == "yes",
                source_note=source_note,
            )
        except OptionPackServiceError as exc:
            return _redirect_error(pack_id, exc)

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?equipment_saved=1", status_code=303
    )


@router.post("/{pack_id}/equipment/{equipment_id}/delete")
async def remove_equipment_action(
    pack_id: str,
    equipment_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        try:
            remove_pack_equipment(conn, pack_id, equipment_id)
        except OptionPackServiceError as exc:
            return _redirect_error(pack_id, exc)

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?equipment_removed=1", status_code=303
    )


@router.post("/{pack_id}/child-packs")
async def add_child_pack_action(
    pack_id: str,
    admin_user: str = Depends(require_admin_user),
    child_pack_id: str = Form(""),
    sort_order: str = Form("0"),
    is_optional: str = Form(""),
    source_note: str = Form(""),
):
    if not child_pack_id:
        return _redirect_error(pack_id, OptionPackServiceError("Select a child pack."))

    with get_engine().begin() as conn:
        try:
            add_child_pack(
                conn,
                pack_id,
                child_pack_id,
                sort_order=_parse_int(sort_order),
                is_optional=is_optional == "yes",
                source_note=source_note,
            )
        except OptionPackServiceError as exc:
            return _redirect_error(pack_id, exc)

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?child_added=1", status_code=303
    )


@router.post("/{pack_id}/child-packs/{child_pack_id}")
async def update_child_pack_action(
    pack_id: str,
    child_pack_id: str,
    admin_user: str = Depends(require_admin_user),
    sort_order: str = Form("0"),
    is_optional: str = Form(""),
    source_note: str = Form(""),
):
    with get_engine().begin() as conn:
        try:
            update_child_pack(
                conn,
                pack_id,
                child_pack_id,
                sort_order=_parse_int(sort_order),
                is_optional=is_optional == "yes",
                source_note=source_note,
            )
        except OptionPackServiceError as exc:
            return _redirect_error(pack_id, exc)

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?child_saved=1", status_code=303
    )


@router.post("/{pack_id}/child-packs/{child_pack_id}/delete")
async def remove_child_pack_action(
    pack_id: str,
    child_pack_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        try:
            remove_child_pack(conn, pack_id, child_pack_id)
        except OptionPackServiceError as exc:
            return _redirect_error(pack_id, exc)

    return RedirectResponse(
        f"/admin/option-packs/{pack_id}?child_removed=1", status_code=303
    )
