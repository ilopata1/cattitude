"""Shared guide_context parsing and merge helpers."""

from __future__ import annotations

import json
from typing import Any


def merge_guide_context(
    base_context: dict[str, Any] | None,
    vessel_context: dict[str, Any] | None,
) -> dict[str, Any]:
    """Merge operating-base context with vessel overrides (vessel wins when set)."""
    merged = dict(base_context or {})
    for key, value in (vessel_context or {}).items():
        if value in (None, "", [], {}):
            continue
        merged[key] = value
    return merged


def parse_emergency_contacts(raw: str) -> list[dict[str, Any]]:
    raw = raw.strip()
    if not raw:
        return []
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError("emergencyContacts must be a JSON array.")
    return data


def parse_local_rules(raw: str) -> list[str]:
    return [line.strip() for line in raw.splitlines() if line.strip()]


def build_guide_context_from_form(
    *,
    display_name: str,
    region_label: str,
    marina: str,
    country_code: str,
    timezone: str,
    vessel_callsign: str,
    office_vhf_label: str,
    office_vhf_channel: str,
    office_vhf_hours: str,
    marina_vhf_label: str,
    marina_vhf_channel: str,
    marina_vhf_detail: str,
    emergency_contacts_json: str,
    local_rules_text: str,
) -> dict[str, Any]:
    return {
        "displayName": display_name.strip(),
        "regionLabel": region_label.strip(),
        "marina": marina.strip(),
        "countryCode": country_code.strip(),
        "timezone": timezone.strip(),
        "vesselCallsign": vessel_callsign.strip(),
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
        "emergencyContacts": parse_emergency_contacts(emergency_contacts_json),
        "localRules": parse_local_rules(local_rules_text),
    }


def emergency_contacts_count(context: dict[str, Any] | None) -> int:
    contacts = (context or {}).get("emergencyContacts")
    return len(contacts) if isinstance(contacts, list) else 0
