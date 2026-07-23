from __future__ import annotations

import math
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse

from admin.auth import require_admin_user
from admin.deps import get_engine, templates
from admin.enums import (
    LEGAL_STATUSES,
    MANUAL_LANGUAGES,
    MANUAL_TYPES,
    SOURCE_TIERS,
    SYSTEM_CATEGORIES,
)
from admin.manual_service import (
    PER_PAGE,
    ManualServiceError,
    add_language_file,
    count_manual_works,
    delete_manual_work,
    get_manual_work,
    ingest_current_edition_file,
    list_edition_files,
    list_editions,
    list_manual_works,
    list_pending_manual_works,
    list_works_for_equipment,
    reassign_manual_work,
    set_current_edition,
    set_legal_status,
    update_manual_work,
    upload_manual,
)

router = APIRouter(prefix="/manuals", tags=["admin-manuals"])


def _maybe_ingest(work_id: str, storage_path: str | None) -> None:
    if not storage_path:
        return
    with get_engine().connect() as conn:
        ingest_current_edition_file(conn, work_id, storage_path)


def _form_context() -> dict:
    return {
        "manual_types": MANUAL_TYPES,
        "source_tiers": SOURCE_TIERS,
        "legal_statuses": LEGAL_STATUSES,
        "manual_languages": MANUAL_LANGUAGES,
        "system_categories": SYSTEM_CATEGORIES,
    }


@router.get("")
async def list_manuals_page(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    legal_status: str = Query(""),
    system_category: str = Query(""),
    q: str = Query(""),
    page: int = Query(1, ge=1),
):
    with get_engine().connect() as conn:
        total = count_manual_works(
            conn,
            legal_status=legal_status,
            system_category=system_category,
            query=q,
        )
        items = list_manual_works(
            conn,
            legal_status=legal_status,
            system_category=system_category,
            query=q,
            page=page,
        )
        pending_count = count_manual_works(conn, legal_status="pending")

    total_pages = max(1, math.ceil(total / PER_PAGE))
    return templates.TemplateResponse(
        request,
        "manuals/list.html",
        {
            "admin_user": admin_user,
            "items": items,
            "legal_status": legal_status,
            "system_category": system_category,
            "query": q,
            "page": page,
            "total": total,
            "total_pages": total_pages,
            "per_page": PER_PAGE,
            "pending_count": pending_count,
            **_form_context(),
        },
    )


@router.get("/legal-review")
async def legal_review_page(
    request: Request,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        items = list_pending_manual_works(conn)

    return templates.TemplateResponse(
        request,
        "manuals/legal_review.html",
        {
            "admin_user": admin_user,
            "items": items,
            **_form_context(),
        },
    )


@router.post("/{work_id}/legal-status")
async def set_legal_status_action(
    work_id: str,
    admin_user: str = Depends(require_admin_user),
    legal_status: str = Form(...),
    return_to: str = Form("detail"),
):
    with get_engine().begin() as conn:
        try:
            set_legal_status(conn, work_id, legal_status)
        except ManualServiceError as exc:
            target = (
                "/admin/manuals/legal-review"
                if return_to == "review"
                else f"/admin/manuals/{work_id}"
            )
            return RedirectResponse(f"{target}?error={quote(str(exc))}", status_code=303)

    if return_to == "review":
        return RedirectResponse("/admin/manuals/legal-review?saved=1", status_code=303)
    return RedirectResponse(f"/admin/manuals/{work_id}?saved=1", status_code=303)


@router.get("/equipment-works")
async def equipment_works_json(
    admin_user: str = Depends(require_admin_user),
    equipment_id: str = Query(""),
):
    if not equipment_id:
        return JSONResponse([])
    with get_engine().connect() as conn:
        works = list_works_for_equipment(conn, equipment_id)
    return JSONResponse(works)


def _safe_return_to(return_to: str) -> str | None:
    """Allow only relative /admin/ paths (no scheme, no path traversal)."""
    value = (return_to or "").strip()
    if not value.startswith("/admin/"):
        return None
    if "://" in value or ".." in value:
        return None
    return value


@router.get("/new")
async def upload_manual_form(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    equipment_id: str = Query(""),
    equipment_label: str = Query(""),
    return_to: str = Query(""),
):
    form: dict = {}
    if equipment_id:
        form["equipment_id"] = equipment_id
        form["equipment_label"] = equipment_label
    safe_return = _safe_return_to(return_to)
    return templates.TemplateResponse(
        request,
        "manuals/upload.html",
        {
            "admin_user": admin_user,
            "error": None,
            "same_content_warning": False,
            "form": form,
            "return_to": safe_return or "",
            **_form_context(),
        },
    )


@router.post("/new")
async def upload_manual_action(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    equipment_id: str = Form(""),
    equipment_label: str = Form(""),
    work_mode: str = Form("existing"),
    manual_work_id: str = Form(""),
    manual_type: str = Form("operators"),
    title: str = Form(""),
    source_tier: str = Form("tier_2"),
    legal_status: str = Form("pending"),
    edition_action: str = Form("first_edition"),
    edition_label: str = Form(""),
    language: str = Form("en"),
    source_url: str = Form(""),
    confirm_same_content: str = Form(""),
    return_to: str = Form(""),
    file: UploadFile = File(...),
):
    form = {
        "equipment_id": equipment_id,
        "equipment_label": equipment_label,
        "work_mode": work_mode,
        "manual_work_id": manual_work_id,
        "manual_type": manual_type,
        "title": title,
        "source_tier": source_tier,
        "legal_status": legal_status,
        "edition_action": edition_action,
        "edition_label": edition_label,
        "language": language,
        "source_url": source_url,
    }
    safe_return = _safe_return_to(return_to)

    if not equipment_id:
        return templates.TemplateResponse(
            request,
            "manuals/upload.html",
            {
                "admin_user": admin_user,
                "error": "Select equipment from the registry.",
                "same_content_warning": False,
                "form": form,
                "return_to": safe_return or "",
                **_form_context(),
            },
            status_code=400,
        )

    file_data = await file.read()

    ingest_path: str | None = None
    with get_engine().begin() as conn:
        try:
            work_id, ingest_path = upload_manual(
                conn,
                equipment_id=equipment_id,
                file_data=file_data,
                original_filename=file.filename or "manual.pdf",
                language=language,
                source_url=source_url or None,
                work_mode=work_mode,
                manual_work_id=manual_work_id or None,
                manual_type=manual_type,
                title=title,
                source_tier=source_tier,
                legal_status=legal_status,
                edition_action=edition_action,
                edition_label=edition_label,
                confirm_same_content=confirm_same_content == "yes",
            )
        except ManualServiceError as exc:
            if str(exc) == "SAME_CONTENT":
                return templates.TemplateResponse(
                    request,
                    "manuals/upload.html",
                    {
                        "admin_user": admin_user,
                        "error": None,
                        "same_content_warning": True,
                        "form": form,
                        "return_to": safe_return or "",
                        **_form_context(),
                    },
                    status_code=400,
                )
            return templates.TemplateResponse(
                request,
                "manuals/upload.html",
                {
                    "admin_user": admin_user,
                    "error": str(exc),
                    "same_content_warning": False,
                    "form": form,
                    "return_to": safe_return or "",
                    **_form_context(),
                },
                status_code=400,
            )

    try:
        _maybe_ingest(work_id, ingest_path)
    except ManualServiceError as exc:
        if safe_return:
            sep = "&" if "?" in safe_return else "?"
            return RedirectResponse(
                f"{safe_return}{sep}error={quote(str(exc))}",
                status_code=303,
            )
        return RedirectResponse(
            f"/admin/manuals/{work_id}?error={quote(str(exc))}",
            status_code=303,
        )

    if safe_return:
        sep = "&" if "?" in safe_return else "?"
        return RedirectResponse(
            f"{safe_return}{sep}manual_uploaded=1",
            status_code=303,
        )
    return RedirectResponse(f"/admin/manuals/{work_id}?uploaded=1", status_code=303)


@router.get("/{work_id}")
async def manual_detail_page(
    request: Request,
    work_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        work = get_manual_work(conn, work_id)
        if work is None:
            return RedirectResponse("/admin/manuals", status_code=303)
        editions = list_editions(conn, work_id)
        edition_files = {
            edition["id"]: list_edition_files(conn, edition["id"])
            for edition in editions
        }

    return templates.TemplateResponse(
        request,
        "manuals/detail.html",
        {
            "admin_user": admin_user,
            "work": work,
            "editions": editions,
            "edition_files": edition_files,
            **_form_context(),
        },
    )


@router.post("/{work_id}")
async def update_manual_work_action(
    work_id: str,
    admin_user: str = Depends(require_admin_user),
    manual_type: str = Form(...),
    title: str = Form(...),
    source_tier: str = Form(...),
    legal_status: str = Form(...),
):
    with get_engine().begin() as conn:
        try:
            update_manual_work(
                conn,
                work_id,
                manual_type=manual_type,
                title=title,
                source_tier=source_tier,
                legal_status=legal_status,
            )
        except ManualServiceError as exc:
            return RedirectResponse(
                f"/admin/manuals/{work_id}?error={quote(str(exc))}",
                status_code=303,
            )

    return RedirectResponse(f"/admin/manuals/{work_id}?saved=1", status_code=303)


@router.post("/{work_id}/reassign")
async def reassign_manual_work_action(
    work_id: str,
    admin_user: str = Depends(require_admin_user),
    equipment_id: str = Form(""),
):
    with get_engine().begin() as conn:
        try:
            reassign_manual_work(conn, work_id, equipment_id)
        except ManualServiceError as exc:
            return RedirectResponse(
                f"/admin/manuals/{work_id}?error={quote(str(exc))}",
                status_code=303,
            )

    return RedirectResponse(
        f"/admin/manuals/{work_id}?reassigned=1",
        status_code=303,
    )


@router.post("/{work_id}/delete")
async def delete_manual_work_action(
    work_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        try:
            delete_manual_work(conn, work_id)
        except ManualServiceError as exc:
            return RedirectResponse(
                f"/admin/manuals/{work_id}?error={quote(str(exc))}",
                status_code=303,
            )

    return RedirectResponse("/admin/manuals?deleted=1", status_code=303)


@router.post("/{work_id}/editions/{edition_id}/set-current")
async def set_current_edition_action(
    work_id: str,
    edition_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().begin() as conn:
        try:
            set_current_edition(conn, work_id, edition_id)
        except ManualServiceError as exc:
            return RedirectResponse(
                f"/admin/manuals/{work_id}?error={quote(str(exc))}",
                status_code=303,
            )

    return RedirectResponse(
        f"/admin/manuals/{work_id}?edition_current=1",
        status_code=303,
    )


@router.get("/{work_id}/editions/{edition_id}/add-language")
async def add_language_form(
    request: Request,
    work_id: str,
    edition_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        work = get_manual_work(conn, work_id)
        if work is None:
            return RedirectResponse("/admin/manuals", status_code=303)
        editions = list_editions(conn, work_id)
        edition = next((e for e in editions if e["id"] == edition_id), None)
        if edition is None:
            return RedirectResponse(f"/admin/manuals/{work_id}", status_code=303)

    return templates.TemplateResponse(
        request,
        "manuals/add_language.html",
        {
            "admin_user": admin_user,
            "work": work,
            "edition": edition,
            "error": None,
            **_form_context(),
        },
    )


@router.post("/{work_id}/editions/{edition_id}/add-language")
async def add_language_action(
    request: Request,
    work_id: str,
    edition_id: str,
    admin_user: str = Depends(require_admin_user),
    language: str = Form("en"),
    source_url: str = Form(""),
    file: UploadFile = File(...),
):
    file_data = await file.read()

    ingest_path: str | None = None
    with get_engine().begin() as conn:
        work = get_manual_work(conn, work_id)
        editions = list_editions(conn, work_id)
        edition = next((e for e in editions if e["id"] == edition_id), None)
        try:
            ingest_path = add_language_file(
                conn,
                work_id,
                edition_id,
                file_data=file_data,
                original_filename=file.filename or "manual.pdf",
                language=language,
                source_url=source_url or None,
            )
        except ManualServiceError as exc:
            return templates.TemplateResponse(
                request,
                "manuals/add_language.html",
                {
                    "admin_user": admin_user,
                    "work": work,
                    "edition": edition,
                    "error": str(exc),
                    **_form_context(),
                },
                status_code=400,
            )

    try:
        _maybe_ingest(work_id, ingest_path)
    except ManualServiceError as exc:
        return RedirectResponse(
            f"/admin/manuals/{work_id}?error={quote(str(exc))}",
            status_code=303,
        )

    return RedirectResponse(
        f"/admin/manuals/{work_id}?language_added=1",
        status_code=303,
    )
