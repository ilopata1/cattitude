"""Structured, boat-type-aware equipment location model.

This module is the single source of truth for the per-vessel equipment
location model. Location is stored on ``vessel_equipment`` as four fields:

    zone       required, one of the 14 canonical Level-1 zones (``location_zone`` enum)
    sub_zone   required, one of the Level-2 sub-zones for that zone
    hull_side  optional, "Port" | "Starboard" | None (multihulls only)
    detail     optional free text

A human-readable label is *derived* from these fields for display only
(:func:`generate_label`). The label is one-way — never parse it back into
structured fields.

The zone / sub-zone options offered for a given vessel are filtered by the
vessel's ``vessel_type`` (see :func:`zones_for` / :func:`sub_zones_for`).
Filtering is enforced server-side by :func:`validate_location`, not just in
the UI.

NOTE ON LABEL GENERATION: the written spec's step list and its worked
examples disagree for the "Storage / Lazarette -> Lazarette" case (the step
list yields "Port - Storage / Lazarette - Lazarette", the example yields
"Port - Lazarette"). We reconcile by collapsing a sub-zone that is already
contained in the zone name down to just the sub-zone, which reproduces both
worked examples.
"""

from __future__ import annotations

from typing import Any

# en dash used as the separator in generated labels (matches spec examples)
LABEL_SEP = "\u2013"
DECK_PREFIX = "Deck \u2014 "  # "Deck — " (em dash), stripped from labels

# --- Vessel type groupings -------------------------------------------------
# These reuse the existing ``vessel_type`` enum identifiers. Per product
# decision: "motor boat" == motor_yacht, "sailing monohull" == cruising_monohull.
MULTIHULL_TYPES = frozenset(
    {"sailing_catamaran", "sailing_trimaran", "power_catamaran"}
)
# Zone 10 (Flybridge / Upper Deck)
FLYBRIDGE_TYPES = frozenset({"power_catamaran", "motor_yacht", "sport_fishing"})
# Zone 11 (Rigging & Sail Handling)
RIGGING_TYPES = frozenset(
    {"cruising_monohull", "sailing_catamaran", "sailing_trimaran"}
)
# Sub-zone "Bridgedeck Saloon" (under zone 2)
BRIDGEDECK_TYPES = MULTIHULL_TYPES

HULL_SIDES = ("Port", "Starboard")


# --- Zone / sub-zone catalog ----------------------------------------------
# Each zone: slug -> (label, hull_side_eligible). Order is the canonical
# Level-1 order from the spec.
_ZONE_ORDER: list[tuple[str, str, bool]] = [
    ("accommodation_cabins", "Accommodation / Cabins", True),
    ("saloon_living_area", "Saloon / Living Area", False),
    ("galley", "Galley", False),
    ("head_bathroom", "Head / Bathroom", True),
    ("helm_nav_station", "Helm / Navigation Station", False),
    ("cockpit", "Cockpit", False),
    ("deck_bow_foredeck", "Deck \u2014 Bow / Foredeck", False),
    ("deck_side_decks_beam", "Deck \u2014 Side Decks & Beam", True),
    ("deck_stern_transom_swim_platform",
     "Deck \u2014 Stern / Transom / Swim Platform", False),
    ("flybridge_upper_deck", "Flybridge / Upper Deck", False),
    ("rigging_sail_handling", "Rigging & Sail Handling", False),
    ("engine_machinery_space", "Engine / Machinery Space", True),
    ("storage_lazarette", "Storage / Lazarette", True),
    ("bilge_underfloor", "Bilge / Underfloor", False),
]

ZONE_SLUGS: list[str] = [slug for slug, _, _ in _ZONE_ORDER]
ZONE_LABELS: dict[str, str] = {slug: label for slug, label, _ in _ZONE_ORDER}
HULL_SIDE_ELIGIBLE: frozenset[str] = frozenset(
    slug for slug, _, eligible in _ZONE_ORDER if eligible
)

# Sub-zones per zone: zone slug -> list of (sub_zone slug, label, is_generic).
# ``is_generic`` marks the "(general)" catch-all sub-zone whose name is
# omitted from the generated label.
_SUB_ZONES: dict[str, list[tuple[str, str, bool]]] = {
    "accommodation_cabins": [
        ("forward_cabin", "Forward Cabin", False),
        ("aft_cabin", "Aft Cabin", False),
        ("midships_cabin", "Midships Cabin", False),
        ("pilot_berth", "Pilot Berth", False),
        ("saloon_berth", "Saloon Berth", False),
        ("crew_cabin", "Crew Cabin", False),
    ],
    "saloon_living_area": [
        ("saloon_general", "Saloon (general)", True),
        ("dinette", "Dinette", False),
        ("bridgedeck_saloon", "Bridgedeck Saloon", False),
    ],
    "galley": [
        ("galley_general", "Galley (general)", True),
        ("fridge_freezer_area", "Fridge/Freezer Area", False),
        ("stove_oven_area", "Stove/Oven Area", False),
        ("pantry_dry_storage", "Pantry/Dry Storage", False),
    ],
    "head_bathroom": [
        ("forward_head", "Forward Head", False),
        ("aft_head", "Aft Head", False),
        ("day_head", "Day Head", False),
        ("shower_compartment", "Shower Compartment", False),
    ],
    "helm_nav_station": [
        ("interior_helm", "Interior Helm", False),
        ("cockpit_helm", "Cockpit Helm", False),
        ("flybridge_helm", "Flybridge Helm", False),
        ("nav_station_chart_table", "Nav Station/Chart Table", False),
    ],
    "cockpit": [
        ("cockpit_general", "Cockpit (general)", True),
        ("cockpit_locker", "Cockpit Locker", False),
        ("cockpit_seating_bench", "Cockpit Seating/Bench", False),
        ("winch_control_area", "Winch/Control Area", False),
    ],
    "deck_bow_foredeck": [
        ("foredeck", "Foredeck", False),
        ("anchor_locker_ground_tackle", "Anchor Locker/Ground Tackle", False),
        ("bow_roller_pulpit", "Bow Roller/Pulpit", False),
        ("forward_hatch", "Forward Hatch", False),
    ],
    "deck_side_decks_beam": [
        ("side_deck", "Side Deck", False),
        ("chainplates_shroud_area", "Chainplates/Shroud Area", False),
        ("beam_trampoline", "Beam/Trampoline", False),
    ],
    "deck_stern_transom_swim_platform": [
        ("transom", "Transom", False),
        ("swim_platform", "Swim Platform", False),
        ("boarding_ladder", "Boarding Ladder", False),
        ("stern_rail_pushpit", "Stern Rail/Pushpit", False),
    ],
    "flybridge_upper_deck": [
        ("flybridge_helm", "Flybridge Helm", False),
        ("flybridge_seating", "Flybridge Seating", False),
        ("radar_arch_mast", "Radar Arch/Mast", False),
        ("sun_deck", "Sun Deck", False),
    ],
    "rigging_sail_handling": [
        ("mast_base_step", "Mast Base/Step", False),
        ("boom", "Boom", False),
        ("mast_interior_compression_post",
         "Mast Interior/Compression Post", False),
        ("standing_rigging", "Standing Rigging", False),
        ("furler", "Furler", False),
        ("spreaders", "Spreaders", False),
    ],
    "engine_machinery_space": [
        ("engine_bay", "Engine Bay", False),
        ("saildrive_shaft_area", "Saildrive/Shaft Area", False),
        ("generator_compartment", "Generator Compartment", False),
        ("steering_gear_compartment", "Steering Gear Compartment", False),
    ],
    "storage_lazarette": [
        ("lazarette", "Lazarette", False),
        ("sail_locker", "Sail Locker", False),
        ("bosuns_locker", "Bosun's Locker", False),
        ("tender_garage", "Tender Garage", False),
    ],
    "bilge_underfloor": [
        ("forward_bilge", "Forward Bilge", False),
        ("midships_bilge", "Midships Bilge", False),
        ("aft_bilge", "Aft Bilge", False),
        ("keel_sump_under_sole_storage", "Keel Sump/Under-sole Storage", False),
    ],
}

# Sub-zones only offered for particular vessel types. Everything not listed
# here is offered for all vessel types.
_SUB_ZONE_VESSEL_RULE: dict[tuple[str, str], frozenset[str]] = {
    ("saloon_living_area", "bridgedeck_saloon"): BRIDGEDECK_TYPES,
}

SUB_ZONE_LABELS: dict[str, dict[str, str]] = {
    zone: {slug: label for slug, label, _ in subs}
    for zone, subs in _SUB_ZONES.items()
}
_SUB_ZONE_GENERIC: dict[str, set[str]] = {
    zone: {slug for slug, _, generic in subs if generic}
    for zone, subs in _SUB_ZONES.items()
}
MAX_DETAIL_LEN = 120


# --- Default location per system category ---------------------------------
# Net-new mapping. Not exposed in the admin UI; edited here only. When the
# equipment/system-category list changes (planned second pass), update THIS
# constant — no other location code hardcodes system_category values.
SYSTEM_DEFAULT_LOCATION: dict[str, tuple[str, str]] = {
    "hull_and_structure": ("bilge_underfloor", "midships_bilge"),
    "propulsion_and_machinery": ("engine_machinery_space", "engine_bay"),
    "steering_and_controls": (
        "engine_machinery_space", "steering_gear_compartment"),
    "electrical_dc": ("engine_machinery_space", "engine_bay"),
    "electrical_ac": ("engine_machinery_space", "engine_bay"),
    "fuel_system": ("engine_machinery_space", "engine_bay"),
    "fresh_water_and_plumbing": ("bilge_underfloor", "midships_bilge"),
    "sanitation": ("head_bathroom", "forward_head"),
    "bilge_and_drainage": ("bilge_underfloor", "midships_bilge"),
    "hvac": ("engine_machinery_space", "engine_bay"),
    "navigation_and_electronics": (
        "helm_nav_station", "nav_station_chart_table"),
    "communications": ("helm_nav_station", "nav_station_chart_table"),
    "safety_and_emergency_equipment": ("cockpit", "cockpit_locker"),
    "ground_tackle_and_mooring": (
        "deck_bow_foredeck", "anchor_locker_ground_tackle"),
    "rigging_and_sail_handling": ("rigging_sail_handling", "mast_base_step"),
    "deck_hardware_and_equipment": ("deck_side_decks_beam", "side_deck"),
    "galley_appliances": ("galley", "galley_general"),
    "tenders_and_watersports": (
        "deck_stern_transom_swim_platform", "swim_platform"),
}


# --- Migration mapping (old ``zone`` enum -> new fields) -------------------
# Used by the 020 migration to backfill vessel_equipment location from the
# retired registry-level equipment.zone. ``flag`` rows are written to the
# migration report for human review rather than trusted silently. The 020
# migration embeds its own copy for reproducibility; this copy is the
# authoritative reference and is exercised by the verification script.
MIGRATION_MAP: dict[str, dict[str, Any]] = {
    "bow_foredeck": {"zone": "deck_bow_foredeck", "sub_zone": "foredeck"},
    "cockpit_aft_deck": {"zone": "cockpit", "sub_zone": "cockpit_general"},
    "saloon_main_cabin": {
        "zone": "saloon_living_area", "sub_zone": "saloon_general"},
    "galley": {"zone": "galley", "sub_zone": "galley_general"},
    "engine_room": {"zone": "engine_machinery_space", "sub_zone": "engine_bay"},
    "engine_room_walkin": {
        "zone": "engine_machinery_space", "sub_zone": "engine_bay"},
    "lazarette_aft_storage": {
        "zone": "storage_lazarette", "sub_zone": "lazarette"},
    "swim_platform_transom": {
        "zone": "deck_stern_transom_swim_platform", "sub_zone": "swim_platform"},
    "quarter_berth_aft_cabin": {
        "zone": "accommodation_cabins", "sub_zone": "aft_cabin"},
    "trampoline_foredeck_netting": {
        "zone": "deck_side_decks_beam", "sub_zone": "beam_trampoline"},
    "mast_base_deck_step": {
        "zone": "rigging_sail_handling", "sub_zone": "mast_base_step"},
    "keel_centreboard_trunk": {
        "zone": "bilge_underfloor", "sub_zone": "keel_sump_under_sole_storage"},
    "bridgedeck_coachroof": {
        "zone": "saloon_living_area", "sub_zone": "bridgedeck_saloon",
        "flag_if_not_bridgedeck": True,
        "reason": "Bridgedeck Saloon is only valid on multihulls."},
    "helm_station": {
        "zone": "helm_nav_station", "sub_zone": None, "flag": True,
        "reason": "Helm sub-zone ambiguous (interior/cockpit/flybridge/nav)."},
    "below_decks_bilge": {
        "zone": "bilge_underfloor", "sub_zone": "midships_bilge", "flag": True,
        "reason": "Bilge location ambiguous (forward/midships/aft)."},
    "flybridge": {
        "zone": "flybridge_upper_deck", "sub_zone": None, "flag": True,
        "reason": "Flybridge sub-zone ambiguous (helm/seating/sun deck)."},
    "port_hull": {
        "zone": None, "sub_zone": None, "hull_side": "Port",
        "detail": "was: port hull", "flag": True,
        "reason": "Old port_hull has no specific zone/sub-zone."},
    "starboard_hull": {
        "zone": None, "sub_zone": None, "hull_side": "Starboard",
        "detail": "was: starboard hull", "flag": True,
        "reason": "Old starboard_hull has no specific zone/sub-zone."},
    "bait_tackle_station": {
        "zone": "cockpit", "sub_zone": "cockpit_general",
        "detail": "bait/tackle station", "flag": True,
        "reason": "No dedicated bait/tackle sub-zone; mapped to Cockpit."},
}


# --- Filtering -------------------------------------------------------------
def zone_available(zone_slug: str, vessel_type: str) -> bool:
    if zone_slug == "flybridge_upper_deck":
        return vessel_type in FLYBRIDGE_TYPES
    if zone_slug == "rigging_sail_handling":
        return vessel_type in RIGGING_TYPES
    return zone_slug in ZONE_LABELS


def sub_zone_available(zone_slug: str, sub_zone_slug: str, vessel_type: str) -> bool:
    if sub_zone_slug not in SUB_ZONE_LABELS.get(zone_slug, {}):
        return False
    rule = _SUB_ZONE_VESSEL_RULE.get((zone_slug, sub_zone_slug))
    if rule is not None and vessel_type not in rule:
        return False
    return True


def hull_side_applicable(zone_slug: str, vessel_type: str) -> bool:
    """Hull side is offered only on multihulls AND hull-side-eligible zones."""
    return vessel_type in MULTIHULL_TYPES and zone_slug in HULL_SIDE_ELIGIBLE


def zones_for(vessel_type: str) -> list[dict[str, Any]]:
    return [
        {
            "slug": slug,
            "label": ZONE_LABELS[slug],
            "hull_side": hull_side_applicable(slug, vessel_type),
        }
        for slug in ZONE_SLUGS
        if zone_available(slug, vessel_type)
    ]


def sub_zones_for(zone_slug: str, vessel_type: str) -> list[dict[str, Any]]:
    return [
        {"slug": slug, "label": label, "generic": generic}
        for slug, label, generic in _SUB_ZONES.get(zone_slug, [])
        if sub_zone_available(zone_slug, slug, vessel_type)
    ]


def default_location_for(
    system_category: str, vessel_type: str
) -> dict[str, str] | None:
    """Reasonable default (zone, sub_zone) for a system on a given boat type.

    Returns ``None`` when the system's default zone/sub-zone is not offered
    for the vessel type (e.g. rigging defaults on a motor yacht).
    """
    default = SYSTEM_DEFAULT_LOCATION.get(system_category)
    if not default:
        return None
    zone_slug, sub_zone_slug = default
    if not zone_available(zone_slug, vessel_type):
        return None
    if not sub_zone_available(zone_slug, sub_zone_slug, vessel_type):
        return None
    return {"zone": zone_slug, "sub_zone": sub_zone_slug}


# --- Validation (server-side enforcement) ----------------------------------
class LocationError(ValueError):
    pass


def normalize_hull_side(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    for canonical in HULL_SIDES:
        if value.lower() == canonical.lower():
            return canonical
    raise LocationError(f"Invalid hull side: {value!r}")


def validate_location(
    vessel_type: str,
    zone: str | None,
    sub_zone: str | None,
    hull_side: str | None,
    detail: str | None,
) -> dict[str, Any]:
    """Validate and normalize a location for a vessel type.

    Enforces the boat-type filtering rules so that combinations hidden in the
    UI cannot be persisted via the API/DB either. Returns a dict with the
    normalized ``zone``, ``sub_zone``, ``hull_side`` and ``detail``.
    """
    if not zone:
        raise LocationError("Zone is required.")
    if zone not in ZONE_LABELS:
        raise LocationError(f"Unknown zone: {zone!r}")
    if not zone_available(zone, vessel_type):
        raise LocationError(
            f"Zone {ZONE_LABELS[zone]!r} is not available for this vessel type."
        )

    if not sub_zone:
        raise LocationError("Sub-zone is required.")
    if sub_zone not in SUB_ZONE_LABELS.get(zone, {}):
        raise LocationError(f"Unknown sub-zone {sub_zone!r} for zone {zone!r}.")
    if not sub_zone_available(zone, sub_zone, vessel_type):
        raise LocationError(
            f"Sub-zone {SUB_ZONE_LABELS[zone][sub_zone]!r} is not available "
            "for this vessel type."
        )

    hull_side = normalize_hull_side(hull_side)
    if hull_side is not None and not hull_side_applicable(zone, vessel_type):
        raise LocationError(
            "Hull side is not applicable for this zone/vessel type."
        )

    detail = (detail or "").strip() or None
    if detail and len(detail) > MAX_DETAIL_LEN:
        raise LocationError(
            f"Detail must be at most {MAX_DETAIL_LEN} characters."
        )

    return {
        "zone": zone,
        "sub_zone": sub_zone,
        "hull_side": hull_side,
        "detail": detail,
    }


# --- Label generation (display only; never stored as source of truth) ------
def _zone_display(zone_slug: str) -> str:
    label = ZONE_LABELS[zone_slug]
    if label.startswith(DECK_PREFIX):
        return label[len(DECK_PREFIX):]
    return label


def generate_label(
    zone: str | None,
    sub_zone: str | None = None,
    hull_side: str | None = None,
    detail: str | None = None,
) -> str:
    """Build the human-readable display label from structured fields.

    Format: ``[hullSide " – "] core [" (" detail ")"]`` where ``core`` is the
    zone display name (with the "Deck — " prefix stripped), plus the sub-zone
    unless the sub-zone is the zone's generic "(general)" form or is already
    contained in the zone name (avoids "Storage / Lazarette – Lazarette").
    """
    parts: list[str] = []

    core = ""
    if zone and zone in ZONE_LABELS:
        zone_disp = _zone_display(zone)
        sub_label = SUB_ZONE_LABELS.get(zone, {}).get(sub_zone or "")
        is_generic = (sub_zone or "") in _SUB_ZONE_GENERIC.get(zone, set())
        if not sub_label or is_generic:
            core = zone_disp
        elif sub_label.lower() in zone_disp.lower():
            core = sub_label
        else:
            core = f"{zone_disp} {LABEL_SEP} {sub_label}"

    if hull_side:
        core = f"{hull_side} {LABEL_SEP} {core}".rstrip(f" {LABEL_SEP}").rstrip()
        core = core.strip()
    parts.append(core)

    label = "".join(parts).strip()
    detail = (detail or "").strip()
    if detail:
        label = f"{label} ({detail})" if label else f"({detail})"
    return label


def build_catalog(vessel_type: str) -> dict[str, Any]:
    """Vessel-type-filtered catalog for the admin location UI (JSON-safe).

    Includes zones (already filtered), their sub-zones (already filtered),
    per-zone hull-side applicability, the hull-side options, and the default
    location per system category (already validity-checked for this vessel
    type). The frontend uses this to drive dependent dropdowns and the live
    label preview.
    """
    zones = []
    for zone in zones_for(vessel_type):
        zones.append(
            {
                "slug": zone["slug"],
                "label": zone["label"],
                "displayLabel": _zone_display(zone["slug"]),
                "hullSide": zone["hull_side"],
                "subZones": sub_zones_for(zone["slug"], vessel_type),
            }
        )
    system_defaults = {
        system: default_location_for(system, vessel_type)
        for system in SYSTEM_DEFAULT_LOCATION
    }
    return {
        "vesselType": vessel_type,
        "zones": zones,
        "hullSides": list(HULL_SIDES),
        "systemDefaults": system_defaults,
        "labelSep": LABEL_SEP,
        "maxDetailLen": MAX_DETAIL_LEN,
    }
