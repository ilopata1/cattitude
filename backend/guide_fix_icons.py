"""Normalize Fix It card icons before they are published.

The mobile app draws these with Ionicons. Material names become icon names.
Emoji already stored on a card are left for the app to map, except the
thermometer pictograph, which is stored as thermometer-outline.
"""

from __future__ import annotations

from typing import Any

# Material Icons / Flutter-style names → emoji
_ICON_NAME_MAP: dict[str, str] = {
    "warning": "⚠️",
    "warning_amber": "⚠️",
    "error": "🔴",
    "error_outline": "🔴",
    "battery_alert": "🪫",
    "battery_full": "🔋",
    "battery_charging_full": "🔋",
    "battery_std": "🔋",
    "thermostat": "thermometer-outline",
    "device_thermostat": "thermometer-outline",
    "water_drop": "💧",
    "bolt": "⚡",
    "electrical_services": "⚡",
    "build": "🔧",
    "handyman": "🔧",
    "anchor": "⚓",
    "sailing": "⛵",
    "directions_boat": "🚤",
    "ac_unit": "❄️",
    "kitchen": "🧊",
    "radio": "📻",
    "explore": "🧭",
    "navigation": "🧭",
}


def normalize_fix_icon(icon: Any, *, fallback: str = "build-outline") -> str:
    """Return an Ionicons name, or a legacy emoji the app maps to one."""
    if not isinstance(icon, str):
        return fallback
    raw = icon.strip()
    if not raw:
        return fallback

    if any(ord(ch) > 127 for ch in raw):
        if raw.startswith("🌡"):
            return "thermometer-outline"
        return raw

    key = raw.lower().replace("-", "_").replace(" ", "_")
    mapped = _ICON_NAME_MAP.get(key)
    if mapped:
        return mapped

    # CamelCase Material names e.g. BatteryAlert
    snake = "".join(
        ("_" + ch.lower()) if ch.isupper() and i else ch.lower()
        for i, ch in enumerate(raw)
    ).lstrip("_")
    mapped = _ICON_NAME_MAP.get(snake)
    if mapped:
        return mapped

    # Already an Ionicons name (book-outline, thermometer-outline).
    if raw == raw.lower() and "-" in raw and raw.replace("-", "").isalnum():
        return raw

    # ASCII identifier with no mapping — do not show the name as the icon.
    if raw.replace("_", "").replace("-", "").isalnum():
        return fallback
    return raw


def normalize_fix_card_icons(cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for card in cards:
        if isinstance(card, dict):
            card["icon"] = normalize_fix_icon(card.get("icon"))
    return cards
