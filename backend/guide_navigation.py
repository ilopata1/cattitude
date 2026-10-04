"""Assemble Do/Know navigation from published guide content at publish time."""

from __future__ import annotations

from typing import Any

from guide_ask import build_ask_suggestions
from guide_module_catalog import (
    CHECKLIST_CATALOG,
    CHECKLIST_IDS,
    SYSTEM_IDS,
)
from location_model import (
    HULL_SIDES,
    generate_label,
    sub_zones_for,
    zones_for,
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

_CHECKLIST_ICONS: dict[str, tuple[str, str]] = {
    "safety-brief": ("🛟", "ic-coral"),
    "gh": ("🤝", "ic-green"),
    "pd": ("🚀", "ic-green"),
    "anch": ("⚓", "ic-amber"),
    "lu": ("🔒", "ic-coral"),
    "ec": ("🏁", "ic-navy"),
}

_CHECKLIST_META_SUBTITLES: dict[str, str] = {
    "safety-brief": "Run with all guests before every departure",
    "gh": "What a guest can do to help",
    "pd": "Complete before every departure",
    "anch": "Setting the hook safely",
    "lu": "Going ashore — secure the boat first",
    "ec": "Return checklist — tanks, cleaning, handover",
}

_EC_SUBTITLE_PRIVATE = "Secure and shut down before leaving"

# Recurring checklists, in trip order. Learn is a separate path.
_DO_TRIP_ORDER: list[str] = ["safety-brief", "gh", "pd", "anch", "lu", "ec"]

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
    """Cruising-area label only. A boat name or a country is not a place to anchor."""
    return str(branding.get("regionLabel") or "").strip()


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
            subtitle = (
                f"Setting the hook safely in {region}"
                if region
                else "Setting the hook safely"
            )
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
    """Level-1 zones this vessel type is allowed to use."""
    return [
        {"id": zone["slug"], "label": zone["label"]}
        for zone in zones_for(vessel_type)
    ]


def _zone_label_index(vessel_type: str) -> dict[str, set[str]]:
    """Exact ``generate_label`` strings for this vessel type, mapped to zone slugs.

    A label that two zones can produce maps to both. Callers leave that row
    unmapped rather than pick one.
    """
    index: dict[str, set[str]] = {}
    for zone in zones_for(vessel_type):
        slug = str(zone["slug"])
        subs = [str(item["slug"]) for item in sub_zones_for(slug, vessel_type)]
        subs.append("")
        hulls: list[str | None] = [None]
        if zone.get("hull_side"):
            hulls.extend(HULL_SIDES)
        for sub in subs:
            for hull in hulls:
                label = generate_label(slug, sub or None, hull, None)
                if not label:
                    continue
                index.setdefault(label, set()).add(slug)
    return index


def match_location_zone(location: str, labels: dict[str, set[str]]) -> str | None:
    """Return the zone slug for a published location string, or None."""
    raw = (location or "").strip()
    if not raw:
        return None
    candidates = [raw]
    if raw.endswith(")") and " (" in raw:
        prefix, _, _detail = raw.rpartition(" (")
        if prefix:
            candidates.append(prefix)
    for candidate in candidates:
        zones = labels.get(candidate)
        if not zones:
            continue
        if len(zones) == 1:
            return next(iter(zones))
        return None
    return None


def build_where_index(
    systems: dict[str, Any],
    vessel_type: str,
) -> tuple[dict[str, Any], list[str]]:
    """Equipment rows already on published chapters, grouped onto real zones.

    A blank equipment name continues the previous row in that table. A location
    that is not an exact zone label for this vessel type stays off the zone
    list and is reported for admin.
    """
    labels = _zone_label_index(vessel_type)
    zone_labels = {zone["slug"]: zone["label"] for zone in zones_for(vessel_type)}
    items: list[dict[str, Any]] = []
    warnings: list[str] = []
    for system_id in build_system_order(systems):
        system = systems.get(system_id)
        if not isinstance(system, dict):
            continue
        title = str(system.get("title") or system_id).strip() or system_id
        sections = system.get("sections") or []
        if not isinstance(sections, list):
            continue
        for section_index, section in enumerate(sections):
            if not isinstance(section, dict):
                continue
            if section.get("type") != "equipment_locations":
                continue
            rows = section.get("rows") or []
            if not isinstance(rows, list):
                continue
            previous = ""
            for row in rows:
                if not isinstance(row, dict):
                    continue
                name = str(row.get("name") or "").strip()
                location = str(row.get("location") or "").strip()
                if name:
                    previous = name
                elif previous:
                    name = previous
                if not location:
                    continue
                if not name:
                    warnings.append(
                        f"{title}: a location row has no equipment name ({location})."
                    )
                    continue
                zone = match_location_zone(location, labels)
                items.append(
                    {
                        "name": name,
                        "location": location,
                        "zone": zone,
                        "systemId": system_id,
                        "sectionIndex": section_index,
                    }
                )
                if zone is None:
                    warnings.append(
                        f"{title}: “{name}” is at “{location}”, "
                        "which is not on this boat's zone map."
                    )
    order = [zone["slug"] for zone in zones_for(vessel_type)]
    present = {item["zone"] for item in items if item.get("zone")}
    zones = [
        {"id": slug, "label": zone_labels.get(slug, slug)}
        for slug in order
        if slug in present
    ]
    return {"items": items, "zones": zones}, warnings


def build_locations(
    where_index: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    zones = where_index.get("zones") or []
    items = where_index.get("items") or []
    locations: dict[str, dict[str, Any]] = {}
    for zone in zones:
        zone_id = str(zone.get("id") or "")
        if not zone_id:
            continue
        locations[zone_id] = {
            "label": zone.get("label") or zone_id,
            "items": [item for item in items if item.get("zone") == zone_id],
        }
    return locations


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
    where_index, location_warnings = build_where_index(systems, vessel_type)
    ui["whereIndex"] = where_index
    if home_rules is not None:
        ui["homeRuleSections"] = home_rules
    authored = ui.get("askSuggestions")
    if not (
        isinstance(authored, list)
        and any(isinstance(item, str) and item.strip() for item in authored)
    ):
        ui["askSuggestions"] = build_ask_suggestions(systems)

    bootstrap["ui"] = ui
    bootstrap["locations"] = build_locations(where_index)
    bootstrap["_location_warnings"] = location_warnings
    return bootstrap
