from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, Form, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import text

from admin.auth import require_admin_user
from admin.deps import get_engine, templates

router = APIRouter(prefix="/operating-bases", tags=["admin-operating-bases"])

GUIDE_CONTEXT_FIELDS = (
    "displayName",
    "regionLabel",
    "marina",
    "countryCode",
    "timezone",
)


def _parse_emergency_contacts(raw: str) -> list[dict[str, Any]]:
    raw = raw.strip()
    if not raw:
        return []
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError("emergencyContacts must be a JSON array.")
    return data


def _parse_local_rules(raw: str) -> list[str]:
    return [line.strip() for line in raw.splitlines() if line.strip()]


@router.get("")
async def list_operating_bases(
    request: Request,
    admin_user: str = Depends(require_admin_user),
    charter_company_id: str = Query(""),
):
    clauses: list[str] = []
    params: dict[str, str] = {}
    if charter_company_id:
        clauses.append("b.charter_company_id = :charter_company_id")
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
                    b.id, b.name, b.slug, b.guide_context_version, b.updated_at,
                    c.name AS company_name
                FROM charter_operating_bases b
                JOIN charter_companies c ON c.id = b.charter_company_id
                {where_sql}
                ORDER BY c.name, b.name
                """
            ),
            params,
        ).fetchall()

    bases = [
        {
            "id": str(row[0]),
            "name": row[1],
            "slug": row[2],
            "guide_context_version": row[3],
            "updated_at": row[4],
            "company_name": row[5],
        }
        for row in rows
    ]
    filter_label = (
        f"Operating bases for {company_name}" if company_name else None
    )
    return templates.TemplateResponse(
        request,
        "operating_bases/list.html",
        {
            "admin_user": admin_user,
            "bases": bases,
            "filter_label": filter_label,
            "charter_company_id": charter_company_id,
        },
    )


@router.get("/{base_id}")
async def edit_operating_base_form(
    request: Request,
    base_id: str,
    admin_user: str = Depends(require_admin_user),
):
    with get_engine().connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT
                    b.id, b.name, b.slug, b.guide_context, b.guide_context_version,
                    b.timezone, b.country_code, c.name AS company_name
                FROM charter_operating_bases b
                JOIN charter_companies c ON c.id = b.charter_company_id
                WHERE b.id = :base_id
                """
            ),
            {"base_id": base_id},
        ).fetchone()

    if not row:
        return RedirectResponse("/admin/operating-bases", status_code=303)

    context = row[3] if isinstance(row[3], dict) else json.loads(row[3] or "{}")
    return templates.TemplateResponse(
        request,
        "operating_bases/edit.html",
        {
            "admin_user": admin_user,
            "base": {
                "id": str(row[0]),
                "name": row[1],
                "slug": row[2],
                "guide_context_version": row[4],
                "timezone": row[5] or context.get("timezone", ""),
                "country_code": row[6] or context.get("countryCode", ""),
                "company_name": row[7],
            },
            "context": context,
            "emergency_contacts_json": json.dumps(
                context.get("emergencyContacts", []), indent=2
            ),
            "local_rules_text": "\n".join(context.get("localRules", [])),
        },
    )


@router.post("/{base_id}")
async def save_operating_base(
    request: Request,
    base_id: str,
    admin_user: str = Depends(require_admin_user),
    display_name: str = Form(""),
    region_label: str = Form(""),
    marina: str = Form(""),
    country_code: str = Form(""),
    timezone: str = Form(""),
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
        guide_context = {
            "displayName": display_name.strip(),
            "regionLabel": region_label.strip(),
            "marina": marina.strip(),
            "countryCode": country_code.strip(),
            "timezone": timezone.strip(),
            "officeVhf": {
                "label": office_vhf_label.strip(),
                "channel": office_vhf_channel.strip(),
                "hours": office_vhf_hours.strip(),
            },
            "marinaVhf": {
                "label": marina_vhf_label.strip(),
                "channel": marina_vhf_channel.strip(),
                "detail": marina_vhf_detail.strip(),
            },
            "emergencyContacts": _parse_emergency_contacts(emergency_contacts_json),
            "localRules": _parse_local_rules(local_rules_text),
        }
    except (json.JSONDecodeError, ValueError) as exc:
        error = str(exc)
        guide_context = None

    if guide_context is not None:
        with get_engine().begin() as conn:
            updated = conn.execute(
                text(
                    """
                    UPDATE charter_operating_bases
                    SET
                        guide_context = CAST(:guide_context AS jsonb),
                        guide_context_version = guide_context_version + 1,
                        timezone = :timezone,
                        country_code = :country_code,
                        updated_at = now()
                    WHERE id = :base_id
                    RETURNING guide_context_version
                    """
                ),
                {
                    "base_id": base_id,
                    "guide_context": json.dumps(guide_context),
                    "timezone": timezone.strip() or None,
                    "country_code": country_code.strip() or None,
                },
            ).fetchone()
        if updated:
            return RedirectResponse(
                f"/admin/operating-bases/{base_id}?saved=1",
                status_code=303,
            )
        error = "Operating base not found."

    with get_engine().connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT b.id, b.name, b.slug, b.guide_context, b.guide_context_version,
                       b.timezone, b.country_code, c.name AS company_name
                FROM charter_operating_bases b
                JOIN charter_companies c ON c.id = b.charter_company_id
                WHERE b.id = :base_id
                """
            ),
            {"base_id": base_id},
        ).fetchone()

    context = row[3] if isinstance(row[3], dict) else json.loads(row[3] or "{}")
    return templates.TemplateResponse(
        request,
        "operating_bases/edit.html",
        {
            "admin_user": admin_user,
            "base": {
                "id": str(row[0]),
                "name": row[1],
                "slug": row[2],
                "guide_context_version": row[4],
                "timezone": row[5] or "",
                "country_code": row[6] or "",
                "company_name": row[7],
            },
            "context": context,
            "emergency_contacts_json": emergency_contacts_json,
            "local_rules_text": local_rules_text,
            "error": error,
        },
        status_code=400,
    )
