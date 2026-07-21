"""Canonical equipment-type (system category) taxonomy.

Single source of truth for the flat, single-select equipment type on every
equipment registry record. Replaces the earlier 20-value ``system_category``
enum. The stored/DB values are the slugs below; ``EQUIPMENT_CATEGORY_LABELS``
supplies the human display labels (including acronyms/en-dashes that the
generic ``format_label`` helper cannot produce).

Filtering rule: the taxonomy is flat with a single exception — "Rigging and
Sail Handling" is only offered when the equipment applies **exclusively** to
sailing vessel types (see :func:`categories_for` / :func:`validate_category`).
Because equipment is registry-level and applies to a set of ``vessel_types``,
the "boat is a sailing vessel" test is: at least one vessel type is selected
and every selected vessel type is a sailing type. If even one non-sailing
vessel type is selected, Rigging is omitted. This is enforced server-side,
not just in the UI.
"""

from __future__ import annotations

# Ordered canonical list: (slug, display label).
_CATEGORY_ORDER: list[tuple[str, str]] = [
    ("hull_and_structure", "Hull and Structure"),
    ("propulsion_and_machinery", "Propulsion and Machinery"),
    ("steering_and_controls", "Steering and Controls"),
    ("electrical_dc", "Electrical \u2013 DC"),
    ("electrical_ac", "Electrical \u2013 AC"),
    ("fuel_system", "Fuel System"),
    ("fresh_water_and_plumbing", "Fresh Water and Plumbing"),
    ("sanitation", "Sanitation"),
    ("bilge_and_drainage", "Bilge and Drainage"),
    ("hvac", "HVAC"),
    ("navigation_and_electronics", "Navigation and Electronics"),
    ("communications", "Communications"),
    ("safety_and_emergency_equipment", "Safety and Emergency Equipment"),
    ("ground_tackle_and_mooring", "Ground Tackle and Mooring"),
    ("rigging_and_sail_handling", "Rigging and Sail Handling"),
    ("deck_hardware_and_equipment", "Deck Hardware and Equipment"),
    ("galley_appliances", "Galley Appliances"),
    ("tenders_and_watersports", "Tenders and Watersports"),
]

EQUIPMENT_CATEGORY_SLUGS: list[str] = [slug for slug, _ in _CATEGORY_ORDER]
EQUIPMENT_CATEGORY_LABELS: dict[str, str] = dict(_CATEGORY_ORDER)
EQUIPMENT_CATEGORIES: list[dict[str, str]] = [
    {"slug": slug, "label": label} for slug, label in _CATEGORY_ORDER
]

# Sailing vessel types (share the definition used by the rigging zone filter).
SAIL_VESSEL_TYPES = frozenset(
    {"cruising_monohull", "sailing_catamaran", "sailing_trimaran"}
)

# Categories that require a sailing vessel type to be offered/valid.
SAIL_ONLY_CATEGORIES = frozenset({"rigging_and_sail_handling"})

# Best-effort migration mapping from the retired 20-value ``system_category``
# enum to the new taxonomy. Merges are deliberate (see the second-pass notes):
#   sails                    -> rigging_and_sail_handling
#   refrigeration_galley     -> galley_appliances
#   stabilisation            -> propulsion_and_machinery
#   entertainment_connectivity -> communications
# The new "deck_hardware_and_equipment" bucket has no legacy source.
OLD_TO_NEW: dict[str, str] = {
    "propulsion": "propulsion_and_machinery",
    "fuel_system": "fuel_system",
    "electrical_dc": "electrical_dc",
    "electrical_ac_shore_power": "electrical_ac",
    "freshwater_system": "fresh_water_and_plumbing",
    "sanitation": "sanitation",
    "bilge_and_drainage": "bilge_and_drainage",
    "steering": "steering_and_controls",
    "anchoring_ground_tackle": "ground_tackle_and_mooring",
    "rigging_sail_handling": "rigging_and_sail_handling",
    "sails": "rigging_and_sail_handling",
    "navigation_electronics": "navigation_and_electronics",
    "communications": "communications",
    "refrigeration_galley": "galley_appliances",
    "hvac_climate": "hvac",
    "safety_equipment": "safety_and_emergency_equipment",
    "tenders_davits": "tenders_and_watersports",
    "stabilisation": "propulsion_and_machinery",
    "entertainment_connectivity": "communications",
    "hull_and_structure": "hull_and_structure",
}


class EquipmentCategoryError(ValueError):
    pass


def label(slug: str | None) -> str:
    if not slug:
        return "\u2014"
    return EQUIPMENT_CATEGORY_LABELS.get(slug, slug)


def _sail_only_selection(vessel_types: list[str] | None) -> bool:
    """True only when at least one vessel type is selected and all are sailing."""
    types = vessel_types or []
    return bool(types) and all(vt in SAIL_VESSEL_TYPES for vt in types)


def category_available(slug: str, vessel_types: list[str] | None) -> bool:
    if slug not in EQUIPMENT_CATEGORY_LABELS:
        return False
    if slug in SAIL_ONLY_CATEGORIES and not _sail_only_selection(vessel_types):
        return False
    return True


def categories_for(vessel_types: list[str] | None) -> list[dict[str, str]]:
    """Category options offered for equipment applying to these vessel types."""
    return [
        {"slug": slug, "label": lbl}
        for slug, lbl in _CATEGORY_ORDER
        if category_available(slug, vessel_types)
    ]


def validate_category(slug: str, vessel_types: list[str] | None) -> str:
    """Validate an equipment-type selection server-side.

    Rejects unknown categories and sail-only categories (Rigging and Sail
    Handling) on equipment that does not apply to any sailing vessel type.
    """
    if slug not in EQUIPMENT_CATEGORY_LABELS:
        raise EquipmentCategoryError(f"Invalid equipment type: {slug}")
    if slug in SAIL_ONLY_CATEGORIES and not _sail_only_selection(vessel_types):
        raise EquipmentCategoryError(
            f"{EQUIPMENT_CATEGORY_LABELS[slug]!r} is only allowed when every "
            "selected vessel type is a sailing type."
        )
    return slug
