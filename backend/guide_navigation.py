"""Assemble Do/Know navigation from published guide content at publish time."""

from __future__ import annotations

from typing import Any

from guide_module_catalog import (
    CHECKLIST_CATALOG,
    CHECKLIST_IDS,
    SYSTEM_CATALOG,
    SYSTEM_IDS,
)

# Legacy guide_content rows for these keys are ignored at publish (computed instead).
NAVIGATION_MODULE_KEYS: frozenset[tuple[str, str]] = frozenset(
    {
        ("locations", "locations"),
        ("ui", "doMenu"),
        ("ui", "checklistMeta"),
        ("ui", "systemOrder"),
        ("ui", "locationLayout"),
    }
)

_CATAMARAN_LAYOUT: list[dict[str, str]] = [
    {"id": "bow", "label": "⬆ Bow / Foredeck", "rowClass": "center"},
    {"id": "port-hull", "label": "◀ Port Hull"},
    {"id": "saloon", "label": "🏠 Saloon"},
    {"id": "stbd-hull", "label": "Stbd Hull ▶"},
    {"id": "galley", "label": "🍳 Galley"},
    {"id": "cockpit", "label": "☀️ Cockpit"},
    {"id": "helm", "label": "🧭 Helm Station"},
    {"id": "swim", "label": "🏊 Swim Platform"},
]

_MONOHULL_LAYOUT: list[dict[str, str]] = [
    {"id": "bow", "label": "⬆ Bow / Foredeck", "rowClass": "center"},
    {"id": "saloon", "label": "🏠 Saloon"},
    {"id": "galley", "label": "🍳 Galley"},
    {"id": "cockpit", "label": "☀️ Cockpit"},
    {"id": "helm", "label": "🧭 Helm Station"},
    {"id": "swim", "label": "🏊 Swim Platform"},
]

_MOTOR_YACHT_LAYOUT: list[dict[str, str]] = [
    {"id": "bow", "label": "⬆ Bow", "rowClass": "center"},
    {"id": "saloon", "label": "🏠 Main Saloon"},
    {"id": "galley", "label": "🍳 Galley"},
    {"id": "cockpit", "label": "☀️ Cockpit / Aft Deck"},
    {"id": "helm", "label": "🧭 Helm / Flybridge"},
    {"id": "swim", "label": "🏊 Swim Platform"},
]

LAYOUT_PROFILES: dict[str, list[dict[str, str]]] = {
    "sailing_catamaran": _CATAMARAN_LAYOUT,
    "power_catamaran": _CATAMARAN_LAYOUT,
    "cruising_monohull": _MONOHULL_LAYOUT,
    "sailing_trimaran": _MONOHULL_LAYOUT,
    "motor_yacht": _MOTOR_YACHT_LAYOUT,
}

_ZONE_LABELS: dict[str, str] = {
    "bow": "Bow / Foredeck",
    "port-hull": "Port Hull",
    "stbd-hull": "Starboard Hull",
    "saloon": "Saloon",
    "galley": "Galley",
    "cockpit": "Cockpit",
    "helm": "Helm Station",
    "swim": "Swim Platform",
}

_CHECKLIST_ICONS: dict[str, tuple[str, str]] = {
    "safety-brief": ("🛟", "ic-coral"),
    "pd": ("🚀", "ic-green"),
    "anch": ("⚓", "ic-amber"),
    "lu": ("🔒", "ic-coral"),
    "ec": ("🏁", "ic-navy"),
}

_CHECKLIST_META_SUBTITLES: dict[str, str] = {
    "safety-brief": "Run with all guests before every departure",
    "pd": "Complete before every departure",
    "anch": "Setting the hook safely",
    "lu": "Going ashore — secure the boat first",
    "ec": "Return checklist — tanks, cleaning, handover",
}

_EC_SUBTITLE_PRIVATE = "Secure and shut down before leaving"

# Recurring checklists, in trip order. Learn is a separate path.
_DO_TRIP_ORDER: list[str] = ["safety-brief", "pd", "anch", "lu", "ec"]

_POWER_PART_IDS = ("electrical", "controls", "batteries")

# (stage id, title, lesson ids). ``power`` is emitted when any power part exists.
_LEARN_STAGE_SPECS: list[tuple[str, str, list[str]]] = [
    ("walk", "Walk-around", ["overview"]),
    ("safety", "Safety briefing", ["safety-brief"]),
    ("living", "Living aboard", ["heads", "water", "power", "galley", "ac"]),
    ("underway", "Underway", ["engines", "sails", "nav", "anchoring"]),
    ("ashore", "Going ashore", ["dinghy"]),
]


def is_navigation_module(content_type: str, content_key: str) -> bool:
    return (content_type, content_key) in NAVIGATION_MODULE_KEYS


def _vessel_name(branding: dict[str, Any]) -> str:
    return (branding.get("vesselName") or "").strip() or "the vessel"


def _region_label(branding: dict[str, Any]) -> str:
    return (branding.get("location") or "").strip() or "your cruising area"


def _is_charter_vessel(branding: dict[str, Any]) -> bool:
    return bool(str(branding.get("charterCompany") or "").strip())


def _checklist_title(
    checklist_id: str, *, branding: dict[str, Any] | None = None
) -> str:
    if checklist_id == "ec":
        if branding is not None and _is_charter_vessel(branding):
            return "End of Charter"
        if branding is not None:
            return "Closing Up"
        # Catalog / unknown branding — keep the charter-facing default.
        return "End of Charter"
    return CHECKLIST_CATALOG[checklist_id]["title"].title()


def _system_zones(system_id: str, system: dict[str, Any]) -> list[str]:
    locs = system.get("locs")
    if isinstance(locs, list) and locs:
        return [str(zone) for zone in locs]
    catalog = SYSTEM_CATALOG.get(system_id) or {}
    return list(catalog.get("locs") or [])


def build_system_order(systems: dict[str, Any]) -> list[str]:
    published = set(systems)
    return [system_id for system_id in SYSTEM_IDS if system_id in published]


def build_checklist_meta(
    published_checklists: set[str],
    *,
    branding: dict[str, Any] | None = None,
) -> dict[str, dict[str, str]]:
    branding = branding or {}
    meta: dict[str, dict[str, str]] = {}
    for checklist_id in CHECKLIST_IDS:
        if checklist_id not in published_checklists:
            continue
        icon, _icon_class = _CHECKLIST_ICONS[checklist_id]
        subtitle = _CHECKLIST_META_SUBTITLES[checklist_id]
        if checklist_id == "ec" and not _is_charter_vessel(branding):
            subtitle = _EC_SUBTITLE_PRIVATE
        elif checklist_id == "ec" and branding.get("marina"):
            subtitle = f"Return to {branding['marina']}"
        meta[checklist_id] = {
            "title": _checklist_title(checklist_id, branding=branding),
            "subtitle": subtitle,
            "icon": icon,
        }
    return meta


def build_do_menu(
    branding: dict[str, Any],
    *,
    published_checklists: set[str],
) -> list[dict[str, Any]]:
    vessel = _vessel_name(branding)
    region = _region_label(branding)
    items: list[dict[str, Any]] = []
    for key in _DO_TRIP_ORDER:
        if key not in published_checklists:
            continue
        icon, icon_class = _CHECKLIST_ICONS[key]
        subtitle = _CHECKLIST_META_SUBTITLES[key]
        if key == "anch":
            subtitle = f"Setting the hook safely in {region}"
        elif key == "lu":
            subtitle = f"Going ashore — secure {vessel} first"
        elif key == "ec":
            if _is_charter_vessel(branding):
                if branding.get("marina"):
                    subtitle = f"Return to {branding['marina']}"
            else:
                subtitle = _EC_SUBTITLE_PRIVATE
        items.append(
            {
                "key": key,
                "route": f"/tabs/do/checklist/{key}",
                "progressType": "checklist",
                "title": _checklist_title(key, branding=branding),
                "subtitle": subtitle,
                "icon": icon,
                "iconClass": icon_class,
            }
        )
    if not items:
        return []
    return [{"label": "This trip", "items": items}]


def build_learn_path(
    systems: dict[str, Any],
    published_checklists: set[str],
) -> list[dict[str, Any]]:
    """Stages for Learn. A stage with no published lesson is omitted."""
    present = set(systems)
    has_power = any(system_id in present for system_id in _POWER_PART_IDS)
    stages: list[dict[str, Any]] = []
    for stage_id, title, lesson_ids in _LEARN_STAGE_SPECS:
        lessons: list[dict[str, str]] = []
        for lesson_id in lesson_ids:
            if lesson_id == "safety-brief":
                if lesson_id not in published_checklists:
                    continue
                lessons.append({"id": lesson_id, "kind": "checklist"})
                continue
            if lesson_id == "power":
                if not has_power:
                    continue
                lessons.append({"id": "power", "kind": "power"})
                continue
            if lesson_id not in present:
                continue
            lessons.append({"id": lesson_id, "kind": "chapter"})
        if lessons:
            stages.append({"id": stage_id, "title": title, "lessons": lessons})
    return stages


def build_location_layout(vessel_type: str) -> list[dict[str, str]]:
    return list(
        LAYOUT_PROFILES.get(vessel_type) or LAYOUT_PROFILES["sailing_catamaran"]
    )


def build_locations(
    systems: dict[str, Any],
    *,
    vessel_type: str,
) -> dict[str, dict[str, Any]]:
    layout = build_location_layout(vessel_type)
    zone_ids = {zone["id"] for zone in layout}
    zones: dict[str, dict[str, Any]] = {
        zone_id: {"label": _ZONE_LABELS.get(zone_id, zone_id), "sys": []}
        for zone_id in zone_ids
    }

    for system_id in SYSTEM_IDS:
        system = systems.get(system_id)
        if not isinstance(system, dict):
            continue
        for zone_id in _system_zones(system_id, system):
            if zone_id not in zones:
                continue
            if system_id not in zones[zone_id]["sys"]:
                zones[zone_id]["sys"].append(system_id)

    return {
        zone_id: payload
        for zone_id, payload in zones.items()
        if payload["sys"]
    }


def enrich_navigation(bootstrap: dict[str, Any], *, vessel_type: str) -> dict[str, Any]:
    """Add computed Do/Know navigation to an assembled bootstrap payload."""
    branding = bootstrap.get("branding") or {}
    systems = bootstrap.get("systems") or {}
    checklists = bootstrap.get("checklists") or {}
    published_checklists = set(checklists)

    ui = dict(bootstrap.get("ui") or {})
    home_rules = ui.get("homeRuleSections")

    ui["systemOrder"] = build_system_order(systems)
    ui["checklistMeta"] = build_checklist_meta(
        published_checklists, branding=branding
    )
    ui["doMenu"] = build_do_menu(
        branding,
        published_checklists=published_checklists,
    )
    ui["learnPath"] = build_learn_path(systems, published_checklists)
    ui["locationLayout"] = build_location_layout(vessel_type)
    if home_rules is not None:
        ui["homeRuleSections"] = home_rules

    bootstrap["ui"] = ui
    bootstrap["locations"] = build_locations(systems, vessel_type=vessel_type)
    return bootstrap
