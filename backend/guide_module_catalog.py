"""Catalog of vessel guide modules (excluding Ask / manualTitles)."""

from __future__ import annotations

from typing import Any

STARTER_MODULES: list[tuple[str, str]] = [
    ("branding", "branding"),
    ("emergency", "emergency"),
    ("ui", "homeRuleSections"),
]

SYSTEM_IDS: list[str] = [
    "overview",
    "safety",
    "sails",
    "engines",
    "controls",
    "electrical",
    "batteries",
    "water",
    "heads",
    "galley",
    "ac",
    "nav",
    "anchoring",
    "dinghy",
]

CHECKLIST_IDS: list[str] = ["safety-brief", "pd", "anch", "lu", "ec"]

SYSTEM_MODULES: list[tuple[str, str]] = [("system", sid) for sid in SYSTEM_IDS]
CHECKLIST_MODULES: list[tuple[str, str]] = [("checklist", cid) for cid in CHECKLIST_IDS]
FIXES_MODULE: list[tuple[str, str]] = [("fix_card_set", "all")]

# Generated per vessel (branding/emergency via template assembly; overview/safety via LLM;
# equipment-backed systems via approved fragments).
GENERATED_GUIDE_MODULES: list[tuple[str, str]] = (
    STARTER_MODULES + SYSTEM_MODULES + CHECKLIST_MODULES + FIXES_MODULE
)

FULL_GUIDE_MODULES: list[tuple[str, str]] = list(GENERATED_GUIDE_MODULES)

# Per-system generation hints (equipment categories are Postgres system_category values).
SYSTEM_CATALOG: dict[str, dict[str, Any]] = {
    "overview": {
        "icon": "🗺️",
        "locs": ["cockpit", "helm", "saloon"],
        "equipment_categories": [],
        "focus": "Boat layout, cabins, day-one safety gear locations",
        "review_title": "Boat overview & layout",
        "guest_label": "Learn + Know — layout",
    },
    "safety": {
        "icon": "🛟",
        "locs": ["cockpit", "saloon", "helm"],
        "equipment_categories": [],
        "focus": "Life jackets, EPIRB, flares, fire extinguishers, life raft locations",
        "review_title": "Safety gear",
        "guest_label": "Learn + Know — safety",
    },
    "sails": {
        "icon": "⛵",
        "locs": ["cockpit", "helm", "bow"],
        "equipment_categories": ["rigging_and_sail_handling"],
        "focus": "Main, jib, gennaker, Karver/KMS hardware, reefing and sail handling",
        "review_title": "Sails & rigging",
        "guest_label": "Learn + Know — sails",
    },
    "engines": {
        "icon": "⚙️",
        "locs": ["port-hull", "stbd-hull", "cockpit"],
        "equipment_categories": ["propulsion_and_machinery"],
        "focus": "Twin diesel engines, compartments, start/stop, raw water seacocks",
        "review_title": "Engines & compartments",
        "guest_label": "Learn + Know — propulsion",
    },
    "controls": {
        "icon": "🎛️",
        "locs": ["saloon", "helm"],
        "equipment_categories": ["electrical_dc"],
        "focus": "CZone / digital switching station — modes, circuits, monitoring, alarms",
        "review_title": "Controls and Monitoring",
        "guest_label": "Learn + Know — controls",
    },
    "electrical": {
        "icon": "⚡",
        "locs": ["saloon"],
        "equipment_categories": ["electrical_dc", "electrical_ac"],
        "focus": "DC panel, bilge pump switches, shore power, Victron Multi Control",
        "review_title": "Electrical panel",
        "guest_section_title": "Electrical Panel",
        "guest_label": "Learn + Know — electrical",
    },
    "batteries": {
        "icon": "🔋",
        "locs": ["saloon", "stbd-hull"],
        "equipment_categories": ["electrical_dc"],
        "focus": "House batteries, Victron Cerbo GX / HUB-1, solar, charging targets",
        "review_title": "Batteries & energy",
        "guest_section_title": "Batteries & Energy",
        "guest_label": "Learn + Know — batteries",
    },
    "water": {
        "icon": "💧",
        "locs": ["port-hull", "stbd-hull", "galley"],
        "equipment_categories": ["fresh_water_and_plumbing"],
        "focus": "Fresh water tanks, pumps, watermaker (Spectra/Aqua-Base), fills",
        "review_title": "Water systems",
        "guest_label": "Learn + Know — water",
    },
    "heads": {
        "icon": "🚽",
        "locs": ["port-hull", "stbd-hull"],
        "equipment_categories": ["sanitation"],
        "focus": "Tecma electric heads, waste rules, breakers, macerator",
        "review_title": "Heads & waste",
        "guest_label": "Learn + Know — heads",
    },
    "galley": {
        "icon": "🍳",
        "locs": ["galley", "saloon"],
        "equipment_categories": ["galley_appliances"],
        "focus": "Induction cooktop (240V), fridges, propane if any, galley breakers",
        "review_title": "Galley",
        "guest_label": "Learn + Know — galley",
    },
    "nav": {
        "icon": "🧭",
        "locs": ["helm", "saloon"],
        "equipment_categories": ["navigation_and_electronics", "communications"],
        "focus": "Garmin MFD/VHF/autopilot, chartplotter, AIS, helm instruments",
        "review_title": "Navigation & helm",
        "guest_label": "Learn + Know — nav",
    },
    "anchoring": {
        "icon": "⚓",
        "locs": ["bow", "cockpit"],
        "equipment_categories": ["ground_tackle_and_mooring"],
        "focus": "Quick windlass, chain counter, anchor, coral/sand rules for Abacos",
        "review_title": "Anchoring & windlass",
        "guest_label": "Learn + Know — anchoring",
    },
    "dinghy": {
        "icon": "🚤",
        "locs": ["swim", "cockpit"],
        "equipment_categories": ["tenders_and_watersports"],
        "focus": "RIB tender, swim platform lift, outboard if known",
        "review_title": "Tender & swim platform",
        "guest_label": "Learn + Know — dinghy",
    },
    "ac": {
        "icon": "❄️",
        "locs": ["saloon", "port-hull", "stbd-hull"],
        "equipment_categories": ["hvac"],
        "focus": "Dometic CapTouch panels, CruiseAir units, inverter/generator requirements",
        "review_title": "Air conditioning",
        "guest_label": "Learn + Know — AC",
    },
}

CHECKLIST_CATALOG: dict[str, dict[str, str]] = {
    "safety-brief": {
        "title": "Safety briefing",
        "focus": "Guest safety briefing before every departure — MOB, hatches, emergency gear",
        "guest_label": "Do — safety brief",
    },
    "pd": {
        "title": "Pre-departure",
        "focus": "Engine, electrical, sails, nav checks before leaving the dock",
        "guest_label": "Do — pre-departure",
    },
    "anch": {
        "title": "Anchoring",
        "focus": "Setting anchor in Abacos — depth, scope, coral avoidance, windlass",
        "guest_label": "Do — anchoring",
    },
    "lu": {
        "title": "Leaving unattended",
        "focus": "Securing vessel when crew goes ashore — pumps, AC, hatches, dinghy",
        "guest_label": "Do — leaving unattended",
    },
    "ec": {
        "title": "End of charter",
        "focus": "Return checklist — tanks, cleaning, marina handover",
        "guest_label": "Do — end of charter",
    },
}

# Legacy module types — navigation is assembled at publish; rows may still exist in DB.
LEGACY_NAVIGATION_REVIEW: dict[tuple[str, str], dict[str, str]] = {
    ("locations", "locations"): {
        "section_title": "Know by location",
        "guest_label": "Know tab — zones",
        "review_title": "Location zones",
        "review_blurb": "Maps each boat zone to relevant systems on the Know tab.",
        "preview_context": "Know tab",
    },
    ("ui", "doMenu"): {
        "section_title": "Do menu",
        "guest_label": "Do tab navigation",
        "review_title": "Do tab menu",
        "review_blurb": "Legacy module — Do/Know navigation is now assembled automatically at publish.",
        "preview_context": "Do tab",
    },
    ("ui", "checklistMeta"): {
        "section_title": "Checklist labels",
        "guest_label": "Do — checklist headers",
        "review_title": "Checklist metadata",
        "review_blurb": "Titles and icons for each checklist screen.",
        "preview_context": "Do tab",
    },
    ("ui", "systemOrder"): {
        "section_title": "System order",
        "guest_label": "Learn + Know ordering",
        "review_title": "System display order",
        "review_blurb": "Order of systems in Learn the Boat and Know by Topic.",
        "preview_context": "Do / Know",
    },
    ("ui", "locationLayout"): {
        "section_title": "Location layout",
        "guest_label": "Know — zone picker",
        "review_title": "Location picker layout",
        "review_blurb": "Zone buttons on the Know by Location view.",
        "preview_context": "Know tab",
    },
}

FIXES_REVIEW = {
    "section_title": "Fix troubleshooting",
    "guest_label": "Fix tab cards",
    "review_title": "Fix It cards",
    "review_blurb": "Quick troubleshooting steps guests see on the Fix tab.",
    "preview_context": "Fix tab",
}

# Admin “Generate drafts” checkbox sections (value → modules_for_set key).
GENERATION_SET_OPTIONS: list[dict[str, str]] = [
    {
        "value": "shell",
        "label": "Home tab",
        "description": "Welcome banner, MAYDAY & contacts, home rules",
    },
    {
        "value": "systems",
        "label": "Equipment",
        "description": "All system guides — Learn the Boat & Know (13 topics)",
    },
    {
        "value": "checklists",
        "label": "Checklists",
        "description": "Safety brief, pre-departure, anchoring, leaving unattended, end of charter",
    },
    {
        "value": "fixes",
        "label": "Fix tab",
        "description": "Troubleshooting cards for common problems",
    },
]


def modules_for_set(module_set: str) -> list[tuple[str, str]]:
    if module_set == "shell":
        return list(STARTER_MODULES)
    if module_set == "systems":
        return list(SYSTEM_MODULES)
    if module_set == "checklists":
        return list(CHECKLIST_MODULES)
    if module_set == "fixes":
        return list(FIXES_MODULE)
    if module_set in ("all", "full"):
        return list(FULL_GUIDE_MODULES)
    raise ValueError(f"Unknown module_set: {module_set}")


def modules_for_sets(module_sets: list[str]) -> list[tuple[str, str]]:
    """Combine selected generation sets, preserving order and deduplicating modules."""
    seen: set[tuple[str, str]] = set()
    combined: list[tuple[str, str]] = []
    for module_set in module_sets:
        for module in modules_for_set(module_set):
            if module not in seen:
                seen.add(module)
                combined.append(module)
    return combined
