"""Map vessel equipment to guide system modules and detect configuration gaps."""

from __future__ import annotations

from typing import Any

from guide_module_catalog import SYSTEM_CATALOG


def equipment_for_system_categories(
    equipment: list[dict[str, Any]],
    categories: list[str],
) -> list[dict[str, Any]]:
    category_set = set(categories)
    if not category_set:
        return equipment
    return [
        row for row in equipment if row.get("system_category") in category_set
    ]


def system_requires_equipment(system_id: str) -> bool:
    return bool(SYSTEM_CATALOG.get(system_id, {}).get("equipment_categories"))


def system_has_equipment(
    equipment: list[dict[str, Any]], system_id: str
) -> bool:
    meta = SYSTEM_CATALOG.get(system_id, {})
    categories = meta.get("equipment_categories") or []
    if not categories:
        return True
    return bool(equipment_for_system_categories(equipment, categories))


def list_system_equipment_gaps(
    equipment: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    gaps: list[dict[str, Any]] = []
    for system_id, meta in SYSTEM_CATALOG.items():
        categories = meta.get("equipment_categories") or []
        if not categories:
            continue
        if equipment_for_system_categories(equipment, categories):
            continue
        gaps.append(
            {
                "system_id": system_id,
                "title": meta.get("review_title", system_id),
                "guest_label": meta.get("guest_label", system_id),
                "categories": categories,
            }
        )
    return gaps


def gaps_for_modules(
    equipment: list[dict[str, Any]],
    modules: list[tuple[str, str]],
) -> list[dict[str, Any]]:
    system_keys = {
        content_key
        for content_type, content_key in modules
        if content_type == "system"
    }
    if not system_keys:
        return []
    return [
        gap
        for gap in list_system_equipment_gaps(equipment)
        if gap["system_id"] in system_keys
    ]


def build_placeholder_system_module(system_id: str) -> dict[str, Any]:
    """Deterministic system module when required equipment categories are empty."""
    meta = SYSTEM_CATALOG.get(system_id, {})
    title = meta.get("review_title", system_id.replace("_", " ").title())
    categories = meta.get("equipment_categories") or []
    category_labels = ", ".join(cat.replace("_", " ") for cat in categories)
    return {
        "id": system_id,
        "icon": meta.get("icon", "⚙️"),
        "title": title,
        "subtitle": "Equipment not yet configured",
        "locs": meta.get("locs", []),
        "summary": (
            "Detailed information for this system is not available yet. "
            "Link the relevant equipment on the vessel configuration page, "
            "then regenerate this section."
        ),
        "sections": [
            {
                "t": "Not yet available",
                "type": "prose",
                "c": (
                    f"No equipment has been linked for this guide section "
                    f"(expected categories: {category_labels}). "
                    "This placeholder will be replaced when equipment is "
                    "configured and the section is regenerated."
                ),
            }
        ],
    }
