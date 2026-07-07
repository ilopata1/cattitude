"""Snapshot slot resolution for curated content templates."""

from __future__ import annotations

import re
from typing import Any

_SLOT_RE = re.compile(r"\{([a-z_]+)\}")

_WATERMAKER_HINTS = ("watermaker", "spectra", "aqua-base", "aquabase", "osmosis")


def equipment(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    return snapshot.get("equipment") or []


def has_category(snapshot: dict[str, Any], *categories: str) -> bool:
    wanted = set(categories)
    return any(row.get("system_category") in wanted for row in equipment(snapshot))


def has_watermaker(snapshot: dict[str, Any]) -> bool:
    for row in equipment(snapshot):
        if row.get("system_category") != "freshwater_system":
            continue
        text = f"{row.get('manufacturer') or ''} {row.get('model') or ''}".lower()
        if any(hint in text for hint in _WATERMAKER_HINTS):
            return True
    return False


def is_sailing(snapshot: dict[str, Any]) -> bool:
    vessel_type = (snapshot.get("vessel") or {}).get("vessel_type") or ""
    return "sailing" in vessel_type or has_category(
        snapshot, "rigging_sail_handling", "sails"
    )


def is_twin_engine(snapshot: dict[str, Any]) -> bool:
    propulsion = [
        row for row in equipment(snapshot) if row.get("system_category") == "propulsion"
    ]
    if len(propulsion) >= 2:
        return True
    vessel_type = (snapshot.get("vessel") or {}).get("vessel_type") or ""
    return "catamaran" in vessel_type


def vessel_name(snapshot: dict[str, Any]) -> str:
    return (snapshot.get("vessel") or {}).get("name") or "the vessel"


def company_name(snapshot: dict[str, Any]) -> str:
    return (snapshot.get("charter_company") or {}).get("name") or ""


def company_or_charter(snapshot: dict[str, Any]) -> str:
    return company_name(snapshot) or "the charter company"


def office_vhf(snapshot: dict[str, Any]) -> dict[str, str]:
    vhf = (snapshot.get("guide_context") or {}).get("officeVhf") or {}
    return {
        "label": (vhf.get("label") or "").strip(),
        "channel": (vhf.get("channel") or "").strip(),
        "hours": (vhf.get("hours") or "").strip(),
    }


def contact_step(snapshot: dict[str, Any]) -> str:
    company = company_name(snapshot)
    vhf = office_vhf(snapshot)
    if company and vhf["channel"]:
        hours = f" ({vhf['hours']})" if vhf["hours"] else ""
        return (
            f"Contact {company} — {vhf['channel']} during office hours{hours}, "
            "or use the emergency contacts on the Home tab"
        )
    if company:
        return f"Contact {company} — see emergency contacts on the Home tab"
    return "If you cannot resolve it, use the emergency contacts on the Home tab"


def local_rules_text(snapshot: dict[str, Any]) -> list[str]:
    return [
        rule.strip()
        for rule in (snapshot.get("guide_context") or {}).get("localRules") or []
        if isinstance(rule, str) and rule.strip()
    ]


def local_rules_joined_lower(snapshot: dict[str, Any]) -> str:
    return " ".join(local_rules_text(snapshot)).lower()


def slot_values(snapshot: dict[str, Any]) -> dict[str, str]:
    vhf = office_vhf(snapshot)
    company = company_name(snapshot)
    hours_paren = f" during office hours ({vhf['hours']})" if vhf["hours"] else ""
    twin = is_twin_engine(snapshot)
    return {
        "vessel_name": vessel_name(snapshot),
        "company": company,
        "company_or_charter": company_or_charter(snapshot),
        "contact_step": contact_step(snapshot),
        "vhf_channel": vhf["channel"],
        "vhf_hours_paren": hours_paren,
        "engine_group_title": (
            "Engine Compartments — Both" if twin else "Engine Compartment"
        ),
        "both_engines": "both engines" if twin else "the engine",
        "engine_compartments": "engine compartments" if twin else "engine compartment",
        "both_engines_cap": "Both engines" if twin else "Engine",
        "mayday_verbal_script": (
            f"MAYDAY x3 · This is {vessel_name(snapshot)} x3 · "
            f"MAYDAY {vessel_name(snapshot)} · Position · Nature of distress · "
            "Assistance required · Persons on board · Over"
        ),
        "vhf_working_channel_line": (
            f"Explain {vhf['channel']}: {company} working channel{hours_paren}"
            if company and vhf["channel"]
            else ""
        ),
        "vhf_monitor_suffix": (
            f" — call {company} on {vhf['channel']} during office hours{hours_paren}"
            if company and vhf["channel"]
            else ""
        ),
    }


def apply_slots(text: str, snapshot: dict[str, Any]) -> str:
    values = slot_values(snapshot)

    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        return values.get(key, match.group(0))

    return _SLOT_RE.sub(replace, text)
