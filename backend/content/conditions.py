"""Evaluate when: blocks on curated content entries."""

from __future__ import annotations

from typing import Any

from content import slots


def matches(when: dict[str, Any] | None, snapshot: dict[str, Any]) -> bool:
    if not when:
        return True
    if when.get("always"):
        return True

    if "all" in when:
        return all(matches(child, snapshot) for child in when["all"])
    if "any" in when:
        return any(matches(child, snapshot) for child in when["any"])

    if "has_category" in when:
        categories = when["has_category"]
        if isinstance(categories, str):
            categories = [categories]
        if not slots.has_category(snapshot, *categories):
            return False

    if when.get("has_watermaker") and not slots.has_watermaker(snapshot):
        return False
    if when.get("is_sailing") and not slots.is_sailing(snapshot):
        return False
    if when.get("twin_engine") and not slots.is_twin_engine(snapshot):
        return False
    if when.get("not_twin_engine") and slots.is_twin_engine(snapshot):
        return False

    if when.get("has_company_vhf"):
        vhf = slots.office_vhf(snapshot)
        if not (slots.company_name(snapshot) and vhf["channel"]):
            return False

    flag_checks = {
        "has_life_raft_location": slots.life_raft_location(snapshot),
        "has_manual_bilge_location": slots.manual_bilge_location(snapshot),
        "has_waste_routing": slots.waste_routing(snapshot),
        "organic_overboard": slots.organic_overboard(snapshot),
        "heads_flush_fresh": slots.heads_flush_water(snapshot) == "fresh",
        "heads_flush_sea": slots.heads_flush_water(snapshot) == "sea",
        "hold_to_dim": slots.hold_to_dim(snapshot),
        "has_trampoline": slots.has_trampoline(snapshot),
        "has_jacklines": slots.has_jacklines(snapshot),
        "has_sail_inventory": bool(slots.sail_inventory(snapshot)),
        "has_water_heater": slots.has_water_heater(snapshot),
        "has_swim_ladders": bool(slots.swim_ladders(snapshot)),
    }
    for key, actual in flag_checks.items():
        if key in when and bool(when[key]) != bool(actual):
            return False

    excludes = when.get("local_rules_exclude") or []
    joined = slots.local_rules_joined_lower(snapshot)
    for token in excludes:
        if token.lower() in joined:
            return False

    return True
