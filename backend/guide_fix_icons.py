"""Normalize Fix It card icons to guest-visible emoji.

Some LLM or fragment drafts store Material-style names (Warning, Battery_Alert)
instead of emoji. The mobile app renders icons as plain text, so those names
appear blank or as broken glyphs depending on the font.
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
    "thermostat": "⚠️",
    "device_thermostat": "⚠️",
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


def normalize_fix_icon(icon: Any, *, fallback: str = "🔧") -> str:
    """Return an emoji suitable for `<span>{{ icon }}</span>` rendering."""
    if not isinstance(icon, str):
        return fallback
    raw = icon.strip()
    if not raw:
        return fallback

    # Already an emoji / symbol (non-ASCII or common pictographs)
    if any(ord(ch) > 127 for ch in raw):
        # Prefer widely supported warning glyph over thermometer (poor Windows coverage)
        if raw.startswith("🌡"):
            return "⚠️"
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

    # ASCII identifier with no mapping — do not show the name as the "icon"
    if raw.replace("_", "").replace("-", "").isalnum():
        return fallback
    return raw


def normalize_fix_card_icons(cards: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for card in cards:
        if isinstance(card, dict):
            card["icon"] = normalize_fix_icon(card.get("icon"))
    return cards
