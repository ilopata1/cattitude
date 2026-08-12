"""Closed equipment plant-class vocabulary for Stage 4 composers.

``plant_class`` is model-level (same for every install of that model). Vessel
plant **role** (house bank, davit array, …) lives on substrate / facts — see
``guide-stage4-class-role-design-note.md``.

Resolution for a profile:
  1. Explicit ``profile.plant_class`` (set at promote / review)
  2. Deterministic normalize of ``device.category_freeform``
"""

from __future__ import annotations

import re
from typing import Any

# Classes already implied by frozen Stage 4 composers (Outremer / Supernova).
# Grow this list when a founding section needs a new kind — not per model.
PLANT_CLASSES: frozenset[str] = frozenset(
    {
        "solar_charge_controller",
        "lithium_battery",
        "inverter_charger",
        "alternator_regulator",
        "generator",
        "propulsion_engine",
        "watermaker",
        "air_conditioner",
        "chartplotter",
        "radar",
        "ai_camera",
        "digital_switching_touchscreen",
        "digital_switching_platform",
        "combination_output_interface",
        "automatic_charging_relay",
        "battery_switch",
        "class_t_fuse",
        "busbar",
        "masterbus_bridge",
        "masterbus_usb",
        "blackwater_discharge_valve",
        "electric_toilet",
        "wind_generator",
    }
)

# Freeform → class. First match wins; keep patterns specific before broad.
_CATEGORY_FREEFORM_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bmppt\b|\bsolar\s+charge", re.I), "solar_charge_controller"),
    (re.compile(r"\blithium\b|\bmli\b|\bli-?ion\b", re.I), "lithium_battery"),
    (re.compile(r"\binverter[- ]?charger\b|\bcombi\b", re.I), "inverter_charger"),
    (re.compile(r"\balternator\s+regulat", re.I), "alternator_regulator"),
    (re.compile(r"\bgenerator\b|\bpanda\b", re.I), "generator"),
    (re.compile(r"\bdiesel\s+engine\b|\bpropulsion\b|\binboard\b", re.I), "propulsion_engine"),
    (re.compile(r"\bwatermaker\b|\bdesalinat|\bnavigator\b", re.I), "watermaker"),
    (re.compile(r"\bair\s+condition|\bhvac\b|\bself-contained\b", re.I), "air_conditioner"),
    (re.compile(r"\bchartplotter\b|\bmfd\b|\bzeus\b", re.I), "chartplotter"),
    (re.compile(r"\bradar\b|\bhalo\b", re.I), "radar"),
    (re.compile(r"\bwatchkeeper\b|\bai\s+camera\b", re.I), "ai_camera"),
    (re.compile(r"\btouch\s*(?:screen|7)\b", re.I), "digital_switching_touchscreen"),
    (re.compile(r"\bczone\b.*\bplatform\b|\bdigital\s+switching\b", re.I), "digital_switching_platform"),
    (re.compile(r"\bcombination\s+output|\bcoi\b", re.I), "combination_output_interface"),
    (re.compile(r"\bacr\b|\bautomatic\s+charging\s+relay", re.I), "automatic_charging_relay"),
    (re.compile(r"\bbattery\s+switch\b|\brotary\s+battery", re.I), "battery_switch"),
    (re.compile(r"\bclass\s*t\b", re.I), "class_t_fuse"),
    (re.compile(r"\bbusbar\b", re.I), "busbar"),
    (re.compile(r"\bmasterbus\s+bridge", re.I), "masterbus_bridge"),
    (re.compile(r"\bmasterbus\s+usb", re.I), "masterbus_usb"),
    (re.compile(r"\bdischarge\s+valve\b|\bblackwater\b", re.I), "blackwater_discharge_valve"),
    (re.compile(r"\btoilet\b|\bheads?\b|\btecma\b", re.I), "electric_toilet"),
    (re.compile(r"\bwind\s+(?:generator|turbine)\b", re.I), "wind_generator"),
)


def normalize_plant_class(category_freeform: str | None) -> str | None:
    """Map Stage 1 ``category_freeform`` to a closed plant_class, or None."""
    text = str(category_freeform or "").strip()
    if not text:
        return None
    for pattern, plant_class in _CATEGORY_FREEFORM_RULES:
        if pattern.search(text):
            return plant_class
    return None


def profile_plant_class(profile: dict[str, Any] | None) -> str | None:
    """Return explicit or normalized plant_class for an interaction profile."""
    if not isinstance(profile, dict):
        return None
    explicit = str(profile.get("plant_class") or "").strip()
    if explicit:
        return explicit if explicit in PLANT_CLASSES else explicit
    device = profile.get("device") if isinstance(profile.get("device"), dict) else {}
    return normalize_plant_class(
        str(device.get("category_freeform") or "") if isinstance(device, dict) else ""
    )
