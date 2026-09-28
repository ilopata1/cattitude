"""Assemble curated guide modules from backend/content/*.yaml."""

from __future__ import annotations

from typing import Any, Callable

from content import conditions, slots
from content.loader import CONTENT_ROOT, load_yaml, load_yaml_cached
from guide_fix_icons import normalize_fix_icon
from guide_section_duplicates import normalise_title

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


def _published_system(when: Any) -> str | None:
    """System id this entry needs in the guest guide. Checked at publish."""
    if not isinstance(when, dict):
        return None
    value = when.get("published_system")
    if isinstance(value, str) and value.strip():
        return value.strip()
    for key in ("all", "any"):
        for child in when.get(key) or []:
            found = _published_system(child)
            if found:
                return found
    return None


def _vessel_overrides(snapshot: dict[str, Any]) -> dict[str, Any]:
    slug = str((snapshot.get("vessel") or {}).get("slug") or "").strip()
    if not slug or slug.startswith(".") or "/" in slug or "\\" in slug:
        return {}
    relative = f"vessels/{slug}.yaml"
    if not (CONTENT_ROOT / relative).is_file():
        return {}
    loaded = load_yaml(relative)
    return loaded if isinstance(loaded, dict) else {}


def _resolve_checklist_items(
    items: list[dict[str, Any]],
    snapshot: dict[str, Any],
    seen: set[str],
) -> list[dict[str, Any]]:
    resolved: list[dict[str, Any]] = []
    for item in items or []:
        if not conditions.matches(item.get("when"), snapshot):
            continue
        key = str(item.get("key") or "").strip()
        if key and key in seen:
            continue
        text = slots.apply_slots(str(item.get("c") or ""), snapshot).strip()
        if not text:
            continue
        subtitle = slots.apply_slots(str(item.get("s") or ""), snapshot).strip()
        entry: dict[str, Any] = {"c": text, "s": subtitle}
        if key:
            entry["key"] = key
            seen.add(key)
        system = _published_system(item.get("when"))
        if system:
            entry["requiresSystem"] = system
        resolved.append(entry)
    return resolved


def _override_item(extra: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any] | None:
    text = slots.apply_slots(str(extra.get("c") or ""), snapshot).strip()
    if not text:
        return None
    entry: dict[str, Any] = {
        "c": text,
        "s": slots.apply_slots(str(extra.get("s") or ""), snapshot).strip(),
    }
    key = str(extra.get("key") or "").strip()
    if key:
        entry["key"] = key
    system = _published_system(extra.get("when"))
    if system:
        entry["requiresSystem"] = system
    return entry


def _apply_checklist_overrides(
    groups: list[dict[str, Any]],
    spec: dict[str, Any],
    snapshot: dict[str, Any],
) -> list[dict[str, Any]]:
    omit = {str(key) for key in (spec.get("omit") or [])}
    replace = spec.get("replace") if isinstance(spec.get("replace"), dict) else {}
    insert_after = (
        spec.get("insert_after") if isinstance(spec.get("insert_after"), dict) else {}
    )
    result: list[dict[str, Any]] = []
    for group in groups:
        kept: list[dict[str, Any]] = []
        for item in group.get("items") or []:
            key = item.get("key")
            if key in omit:
                continue
            if key in replace:
                item = dict(item)
                replacement = replace[key]
                if isinstance(replacement, str):
                    item["c"] = slots.apply_slots(replacement, snapshot).strip()
                elif isinstance(replacement, dict):
                    if replacement.get("c"):
                        item["c"] = slots.apply_slots(str(replacement["c"]), snapshot).strip()
                    if "s" in replacement:
                        item["s"] = slots.apply_slots(
                            str(replacement.get("s") or ""), snapshot
                        ).strip()
            kept.append(item)
            extra = insert_after.get(key) if key else None
            if isinstance(extra, dict):
                inserted = _override_item(extra, snapshot)
                if inserted is not None and inserted.get("key") not in omit:
                    kept.append(inserted)
        if kept:
            updated = dict(group)
            updated["items"] = kept
            result.append(updated)
    return result


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
    seen: set[str] = set()
    groups: list[dict[str, Any]] = []
    for group in data.get("groups") or []:
        if not conditions.matches(group.get("when"), snapshot):
            continue
        items = _resolve_checklist_items(group.get("items") or [], snapshot, seen)
        if not items:
            continue
        title = slots.apply_slots(str(group.get("t") or ""), snapshot)
        built: dict[str, Any] = {"t": title, "items": items}
        group_key = str(group.get("key") or "").strip()
        if group_key:
            built["key"] = group_key
        groups.append(built)
    overrides = (_vessel_overrides(snapshot).get("checklists") or {}).get(checklist_id) or {}
    if isinstance(overrides, dict) and overrides:
        groups = _apply_checklist_overrides(groups, overrides, snapshot)
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
        system = _published_system(card.get("when"))
        if system:
            payload["requiresSystem"] = system
        cards.append(payload)
    fix_overrides = _vessel_overrides(snapshot).get("fixes") or {}
    if isinstance(fix_overrides, dict) and fix_overrides:
        cards = _apply_fix_overrides(cards, fix_overrides, snapshot)
    return cards


def _apply_fix_overrides(
    cards: list[dict[str, Any]],
    spec: dict[str, Any],
    snapshot: dict[str, Any],
) -> list[dict[str, Any]]:
    omit = {str(key) for key in (spec.get("omit") or [])}
    replace = spec.get("replace") if isinstance(spec.get("replace"), dict) else {}
    kept: list[dict[str, Any]] = []
    seen: set[str] = set()
    for card in cards:
        key = card.get("key")
        if key in omit or (key and key in seen):
            continue
        if key in replace and isinstance(replace[key], dict):
            card = dict(card)
            replacement = replace[key]
            if replacement.get("title"):
                card["title"] = slots.apply_slots(str(replacement["title"]), snapshot)
            if replacement.get("steps"):
                card["steps"] = _resolve_steps(replacement["steps"], snapshot)
        if key:
            seen.add(key)
        kept.append(card)
    return kept


def _knot_cards_html() -> str:
    cards = (
        (
            "assets/images/guide/knots/clove-hitch.png",
            "Clove hitch",
            "Used for fenders.",
        ),
        (
            "assets/images/guide/knots/round-turn.png",
            "Round turn and two half hitches",
            "A general knot for fenders, dinghies, and similar jobs.",
        ),
        (
            "assets/images/guide/knots/bowline.png",
            "Bowline",
            "Makes a loop for joining to another rope, a sheet on a sail, or a mooring line around a cleat or bollard.",
        ),
    )
    parts: list[str] = []
    for path, title, caption in cards:
        alt = title.replace('"', "&quot;")
        parts.append(
            '<div class="photo-card">'
            f'<img style="max-width:384px;width:100%;" src="{path}" alt="{alt}" '
            f"onclick=\"openPhoto(this.src,'{alt}')\">"
            '<div class="photo-caption"><span class="photo-caption-icon">🪢</span>'
            f"<div><div class=\"photo-caption-text\">{alt}</div>"
            f'<div class="photo-caption-sub">{caption}</div></div></div></div>'
        )
    return "".join(parts)


def _resolve_guest_items(
    items: list[Any], snapshot: dict[str, Any]
) -> list[str]:
    resolved: list[str] = []
    for item in items or []:
        if isinstance(item, str):
            text = slots.apply_slots(item, snapshot).strip()
            if text:
                resolved.append(text)
            continue
        if not isinstance(item, dict):
            continue
        if item.get("repeat") == "swim_ladders":
            for ladder in slots.swim_ladders(snapshot):
                sentence = f"{ladder['label']}: {ladder['location']}."
                if ladder["deploy"]:
                    sentence = f"{sentence} {ladder['deploy']}"
                resolved.append(sentence)
            continue
        if not conditions.matches(item.get("when"), snapshot):
            continue
        text = slots.apply_slots(str(item.get("c") or ""), snapshot).strip()
        if text:
            resolved.append(text)
    return resolved


def _sections_from_spec(
    specs: list[dict[str, Any]], snapshot: dict[str, Any]
) -> list[dict[str, Any]]:
    built: list[dict[str, Any]] = []
    for spec in specs or []:
        if not isinstance(spec, dict):
            continue
        if not conditions.matches(spec.get("when"), snapshot):
            continue
        section_type = str(spec.get("type") or "list")
        section: dict[str, Any] = {"t": spec.get("t") or "Section", "type": section_type}
        if section_type == "prose":
            text = slots.apply_slots(str(spec.get("c") or ""), snapshot).strip()
            if not text:
                continue
            section["c"] = text
        elif section_type == "photo":
            html = spec.get("html")
            if html == "knots":
                html = _knot_cards_html()
            if not isinstance(html, str) or not html.strip():
                continue
            section["html"] = html
        else:
            items = _resolve_guest_items(spec.get("items") or [], snapshot)
            if not items:
                continue
            section["items"] = items
        built.append(section)
    return built


def _check_text(check: Any) -> str:
    if isinstance(check, str):
        return check.strip()
    if isinstance(check, dict):
        return str(check.get("text") or check.get("c") or "").strip()
    return ""


def _learn_checks_from_spec(specs: list[Any], snapshot: dict[str, Any]) -> list[Any]:
    checks: list[Any] = []
    seen: set[str] = set()
    for item in specs or []:
        key = ""
        if isinstance(item, str):
            text = slots.apply_slots(item, snapshot).strip()
        elif isinstance(item, dict):
            if not conditions.matches(item.get("when"), snapshot):
                continue
            text = slots.apply_slots(str(item.get("c") or item.get("text") or ""), snapshot).strip()
            key = str(item.get("key") or "").strip()
        else:
            continue
        if not text or text in seen:
            continue
        seen.add(text)
        checks.append({"key": key, "text": text} if key else text)
    return checks


def apply_guest_layers(
    system_id: str, payload: dict[str, Any], snapshot: dict[str, Any]
) -> dict[str, Any]:
    """Append curated handbook sections. Same titles are replaced, not duplicated.

    Title match ignores case and extra whitespace. The curated section wins.
    """
    relative = f"guest_layers/{system_id}.yaml"
    if not (CONTENT_ROOT / relative).is_file():
        return payload
    data = load_yaml_cached(relative)
    incoming = _sections_from_spec(data.get("sections") or [], snapshot)
    titles = {
        normalise_title(str(section.get("t") or ""))
        for section in incoming
        if normalise_title(str(section.get("t") or ""))
    }
    merged = dict(payload)
    existing = [
        section
        for section in (payload.get("sections") or [])
        if not (
            isinstance(section, dict)
            and normalise_title(str(section.get("t") or "")) in titles
        )
    ]
    merged["sections"] = existing + incoming
    extra = _learn_checks_from_spec(data.get("learnChecks") or [], snapshot)
    if extra:
        current = [
            check for check in (payload.get("learnChecks") or []) if _check_text(check)
        ]
        seen = {_check_text(check) for check in current}
        for check in extra:
            text = _check_text(check)
            if text and text not in seen:
                current.append(check)
                seen.add(text)
        merged["learnChecks"] = current
    return merged


def build_seamanship_module(
    snapshot: dict[str, Any], reference: Any = None
) -> dict[str, Any]:
    del reference
    data = load_yaml_cached("systems/seamanship.yaml")
    payload: dict[str, Any] = {
        "id": data["id"],
        "icon": data["icon"],
        "title": data["title"],
        "subtitle": data["subtitle"],
        "locs": list(data.get("locs") or []),
        "summary": data["summary"],
        "sections": _sections_from_spec(data.get("sections") or [], snapshot),
    }
    checks = _learn_checks_from_spec(data.get("learnChecks") or [], snapshot)
    if checks:
        payload["learnChecks"] = checks
    return payload


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
    ("system", "seamanship"): build_seamanship_module,
    **{
        ("checklist", checklist_id): _make_checklist_builder(checklist_id)
        for checklist_id in _CHECKLIST_IDS
    },
}
