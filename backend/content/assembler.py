"""Assemble curated guide modules from backend/content/*.yaml."""

from __future__ import annotations

from typing import Any, Callable

from content import conditions, slots
from content.loader import load_yaml_cached
from guide_fix_icons import normalize_fix_icon

_DANGER_PREFIXES = ("never", "do not", "don't", "no ")


def _local_rule_tone(rule_text: str) -> str:
    lowered = rule_text.strip().lower()
    return "danger" if lowered.startswith(_DANGER_PREFIXES) else "caution"


def _local_rule_icon(rule_text: str) -> str:
    lowered = rule_text.lower()
    if "anchor" in lowered or "coral" in lowered:
        return "⚓"
    if "vhf" in lowered or "radio" in lowered or "channel" in lowered:
        return "📻"
    if "toilet" in lowered or "head" in lowered:
        return "🚽"
    if "engine" in lowered:
        return "⚙️"
    if "water" in lowered:
        return "💧"
    return "📌"


def _resolve_step(step: Any, snapshot: dict[str, Any]) -> str | None:
    if isinstance(step, str):
        return slots.apply_slots(step, snapshot)
    if not isinstance(step, dict):
        return None
    text = slots.apply_slots(str(step.get("text") or ""), snapshot)
    append_when = step.get("append_when") or {}
    for key, suffix in append_when.items():
        if conditions.matches({key: True}, snapshot):
            text += slots.apply_slots(str(suffix), snapshot)
    return text


def _resolve_steps(steps: list[Any], snapshot: dict[str, Any]) -> list[str]:
    resolved: list[str] = []
    for step in steps or []:
        if step == "{contact_step}":
            resolved.append(slots.contact_step(snapshot))
            continue
        text = _resolve_step(step, snapshot)
        if text:
            resolved.append(text)
    return resolved


def _resolve_checklist_items(
    items: list[dict[str, Any]], snapshot: dict[str, Any]
) -> list[dict[str, str]]:
    resolved: list[dict[str, str]] = []
    for item in items or []:
        if not conditions.matches(item.get("when"), snapshot):
            continue
        text = slots.apply_slots(str(item.get("c") or ""), snapshot)
        if not text.strip():
            continue
        subtitle = slots.apply_slots(str(item.get("s") or ""), snapshot)
        resolved.append({"c": text, "s": subtitle})
    return resolved


def build_home_rules_module(
    snapshot: dict[str, Any], reference: Any = None
) -> list[dict[str, Any]]:
    del reference
    spec = load_yaml_cached("home_rules/sections.yaml")
    static_rules = load_yaml_cached("home_rules/static_rules.yaml").get("rules") or []

    danger_rules: list[dict[str, Any]] = []
    caution_rules: list[dict[str, Any]] = []
    good_rules: list[dict[str, Any]] = []

    for rule_text in slots.local_rules_text(snapshot):
        entry = {
            "icon": _local_rule_icon(rule_text),
            "tone": _local_rule_tone(rule_text),
            "text": rule_text,
        }
        (danger_rules if entry["tone"] == "danger" else caution_rules).append(entry)

    for rule in static_rules:
        if not conditions.matches(rule.get("when"), snapshot):
            continue
        entry = {
            "icon": rule["icon"],
            "tone": rule["section"],
            "text": slots.apply_slots(str(rule["text"]), snapshot),
        }
        if rule.get("link"):
            entry["link"] = rule["link"]
        section = rule["section"]
        if section == "danger":
            danger_rules.append(entry)
        elif section == "caution":
            caution_rules.append(entry)
        else:
            good_rules.append(entry)

    joined = slots.local_rules_joined_lower(snapshot)
    if "vhf" not in joined and "ch 16" not in joined:
        text = "Always monitor VHF Ch 16 underway" + slots.slot_values(snapshot)[
            "vhf_monitor_suffix"
        ]
        caution_rules.append({"icon": "📻", "tone": "caution", "text": text})

    sections = []
    for section_spec in spec.get("sections") or []:
        tone = section_spec["tone"]
        rules = {"danger": danger_rules, "caution": caution_rules, "good": good_rules}[
            tone
        ]
        if rules:
            sections.append(
                {
                    "title": section_spec["title"],
                    "tone": tone,
                    "rules": rules,
                }
            )
    return sections


def build_checklist_module(
    checklist_id: str, snapshot: dict[str, Any], reference: Any = None
) -> dict[str, Any]:
    del reference
    data = load_yaml_cached(f"checklists/{checklist_id}.yaml")
    groups: list[dict[str, Any]] = []
    for group in data.get("groups") or []:
        if not conditions.matches(group.get("when"), snapshot):
            continue
        items = _resolve_checklist_items(group.get("items") or [], snapshot)
        if not items:
            continue
        title = slots.apply_slots(str(group.get("t") or ""), snapshot)
        groups.append({"t": title, "items": items})
    return {"groups": groups}


def build_fix_cards_module(
    snapshot: dict[str, Any], reference: Any = None
) -> list[dict[str, Any]]:
    del reference
    data = load_yaml_cached("fix_cards/cards.yaml")
    cards: list[dict[str, Any]] = []
    for card in data.get("cards") or []:
        if not conditions.matches(card.get("when"), snapshot):
            continue
        payload = {
            key: card[key]
            for key in ("icon", "cat", "catL", "title", "key")
            if key in card
        }
        payload["icon"] = normalize_fix_icon(payload.get("icon"))
        payload["steps"] = _resolve_steps(card.get("steps") or [], snapshot)
        cards.append(payload)
    return cards


def _make_checklist_builder(
    checklist_id: str,
) -> Callable[[dict[str, Any], Any], dict[str, Any]]:
    def _builder(snapshot: dict[str, Any], reference: Any = None) -> dict[str, Any]:
        return build_checklist_module(checklist_id, snapshot, reference)

    return _builder


_CHECKLIST_IDS = ("safety-brief", "pd", "anch", "lu", "ec")

LIBRARY_MODULE_BUILDERS: dict[
    tuple[str, str], Callable[[dict[str, Any], Any], Any]
] = {
    ("ui", "homeRuleSections"): build_home_rules_module,
    ("fix_card_set", "all"): build_fix_cards_module,
    **{
        ("checklist", checklist_id): _make_checklist_builder(checklist_id)
        for checklist_id in _CHECKLIST_IDS
    },
}
