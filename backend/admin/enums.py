"""Postgres enum values for admin forms."""

VESSEL_TYPES = [
    "sailing_catamaran",
    "cruising_monohull",
    "sailing_trimaran",
    "power_catamaran",
    "motor_yacht",
    "sport_fishing",
]

SYSTEM_CATEGORIES = [
    "propulsion",
    "fuel_system",
    "electrical_dc",
    "electrical_ac_shore_power",
    "freshwater_system",
    "sanitation",
    "bilge_and_drainage",
    "steering",
    "anchoring_ground_tackle",
    "rigging_sail_handling",
    "sails",
    "navigation_electronics",
    "communications",
    "refrigeration_galley",
    "hvac_climate",
    "safety_equipment",
    "tenders_davits",
    "stabilisation",
    "entertainment_connectivity",
    "hull_and_structure",
]

EQUIPMENT_CLASSES = [
    "branded_major",
    "branded_minor",
    "generic_hardware",
    "built_installed",
    "structural_fixed",
    "consumable_dated",
]

CONFIGURATION_TIERS = [
    "structural",
    "option_pack",
    "discrete_option",
    "aftermarket",
]

IDENTIFICATION_METHODS = [
    "nameplate",
    "visual_description",
    "builder_spec",
]

ZONE_CARDINALITIES = [
    "fixed",
    "configurable",
]

ZONES = [
    "bow_foredeck",
    "helm_station",
    "cockpit_aft_deck",
    "saloon_main_cabin",
    "galley",
    "engine_room",
    "lazarette_aft_storage",
    "swim_platform_transom",
    "below_decks_bilge",
    "port_hull",
    "starboard_hull",
    "bridgedeck_coachroof",
    "trampoline_foredeck_netting",
    "mast_base_deck_step",
    "keel_centreboard_trunk",
    "quarter_berth_aft_cabin",
    "flybridge",
    "engine_room_walkin",
    "bait_tackle_station",
]

PACK_SOURCES = [
    "manufacturer_published",
    "team_researched",
    "owner_confirmed",
]

CONSTRAINT_TYPES = [
    "excludes",
    "requires",
    "mutually_exclusive_group",
]

MANUAL_TYPES = [
    "operators",
    "service",
    "installation",
    "parts",
]

SOURCE_TIERS = [
    "tier_1",
    "tier_2",
    "tier_3",
]

LEGAL_STATUSES = [
    "pending",
    "cleared",
    "dmca_removed",
]

MANUAL_LANGUAGES = [
    ("en", "English"),
    ("fr", "French"),
    ("de", "German"),
    ("es", "Spanish"),
    ("it", "Italian"),
    ("nl", "Dutch"),
    ("pt", "Portuguese"),
    ("sv", "Swedish"),
    ("no", "Norwegian"),
    ("da", "Danish"),
    ("fi", "Finnish"),
]
