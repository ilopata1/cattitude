"""Deterministic (no-LLM) assembly for guide modules that are pure field mappings.

Branding and emergency are built directly from the generation input snapshot:
every output field already exists as structured data (vessel row, hull model,
guide_context). Using an LLM here added latency and hallucination risk for
zero expressive gain — and the emergency module (MAYDAY procedure) is the
last place paraphrasing should be tolerated.

Builders receive the input snapshot plus the current reference module (the
latest approved/published payload) so hand-maintained values that cannot be
derived from data — logo asset paths — are preserved exactly.
"""

from __future__ import annotations

from typing import Any, Callable

MAYDAY_CHANNEL = "VHF Ch 16"


def _mayday_steps(callsign: str) -> list[str]:
    return [
        "Tune VHF to Channel 16 — switch to high power (25W)",
        'Say "MAYDAY MAYDAY MAYDAY"',
        f'Say "This is {callsign}, {callsign}, {callsign}"',
        f'Say "MAYDAY {callsign}"',
        "State your position — GPS lat/long or bearing and distance from known landmark",
        "State nature of distress — fire, sinking, medical, etc.",
        "State assistance required",
        "State number of persons on board",
        "Release transmit button and listen for response",
    ]


def _clean(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _model_label(snapshot: dict[str, Any], reference: dict[str, Any]) -> str:
    hull = snapshot.get("hull_model") or {}
    manufacturer = _clean(hull.get("manufacturer"))
    display = _clean(hull.get("display_name"))
    if manufacturer and display:
        if display.lower().startswith(manufacturer.lower()):
            return display
        return f"{manufacturer} {display}"
    if manufacturer or display:
        return manufacturer or display
    if _clean(reference.get("model")):
        return _clean(reference.get("model"))
    vessel_type = _clean((snapshot.get("vessel") or {}).get("vessel_type"))
    return vessel_type.replace("_", " ").title() if vessel_type else "Vessel"


def build_branding_module(
    snapshot: dict[str, Any], reference: Any = None
) -> dict[str, Any]:
    reference = reference if isinstance(reference, dict) else {}
    vessel = snapshot.get("vessel") or {}
    context = snapshot.get("guide_context") or {}
    charter_company = _clean((snapshot.get("charter_company") or {}).get("name"))
    base_name = _clean((snapshot.get("operating_base") or {}).get("name"))

    model = _model_label(snapshot, reference)
    location = (
        _clean(context.get("regionLabel"))
        or _clean(context.get("displayName"))
        or _clean(reference.get("location"))
    )

    if base_name:
        tagline = f"{model} · {base_name} Charter Guide"
    elif location:
        tagline = f"{model} · {location}"
    else:
        tagline = f"{model} · Vessel Guide"

    return {
        "vesselName": vessel.get("name"),
        "vesselSlug": vessel.get("slug"),
        "vesselType": vessel.get("vessel_type"),
        "model": model,
        "charterCompany": charter_company or _clean(reference.get("charterCompany")),
        "location": location,
        "marina": _clean(context.get("marina")) or _clean(reference.get("marina")),
        "tagline": tagline,
        "headerLogo": reference.get("headerLogo"),
        "heroLogo": reference.get("heroLogo"),
    }


def _normalize_contact(contact: dict[str, Any]) -> dict[str, Any] | None:
    label = _clean(contact.get("label"))
    value = _clean(contact.get("value"))
    if not label or not value:
        return None
    normalized: dict[str, Any] = {"label": label}
    if _clean(contact.get("detail")):
        normalized["detail"] = _clean(contact.get("detail"))
    normalized["value"] = value
    if _clean(contact.get("tel")):
        normalized["tel"] = _clean(contact.get("tel"))
    action = contact.get("action")
    if action not in ("call", "vhf"):
        action = "call" if normalized.get("tel") else "vhf"
    normalized["action"] = action
    return normalized


def build_emergency_module(
    snapshot: dict[str, Any], reference: Any = None
) -> dict[str, Any]:
    vessel = snapshot.get("vessel") or {}
    context = snapshot.get("guide_context") or {}

    callsign = _clean(context.get("vesselCallsign")) or _clean(vessel.get("name"))

    contacts = []
    for raw in context.get("emergencyContacts") or []:
        if not isinstance(raw, dict):
            continue
        contact = _normalize_contact(raw)
        if contact:
            contacts.append(contact)

    subtitle_parts = [
        _clean(vessel.get("name")),
        _clean((snapshot.get("charter_company") or {}).get("name")),
        _clean(context.get("regionLabel")) or _clean(context.get("displayName")),
    ]

    return {
        "mayday": {
            "channel": MAYDAY_CHANNEL,
            "vesselCallsign": callsign,
            "steps": _mayday_steps(callsign),
        },
        "contacts": contacts,
        "modalSubtitle": " · ".join(part for part in subtitle_parts if part),
    }


# Modules assembled deterministically instead of via LLM generation.
TEMPLATE_MODULE_BUILDERS: dict[
    tuple[str, str], Callable[[dict[str, Any], Any], dict[str, Any]]
] = {
    ("branding", "branding"): build_branding_module,
    ("emergency", "emergency"): build_emergency_module,
}
