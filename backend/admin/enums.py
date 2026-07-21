"""Postgres enum values for admin forms."""

from equipment_category import EQUIPMENT_CATEGORY_SLUGS

VESSEL_TYPES = [
    "sailing_catamaran",
    "cruising_monohull",
    "sailing_trimaran",
    "power_catamaran",
    "motor_yacht",
    "sport_fishing",
]

# Canonical equipment-type taxonomy lives in equipment_category.py.
SYSTEM_CATEGORIES = list(EQUIPMENT_CATEGORY_SLUGS)

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
