"""One-shot: infer content YAML from guide_content_library_legacy.py and write files."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import yaml

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

import guide_content_library_legacy as legacy  # noqa: E402

CONTENT_DIR = _BACKEND / "content"

ALL_CATEGORIES = [
    "propulsion_and_machinery",
    "sanitation",
    "fresh_water_and_plumbing",
    "electrical_dc",
    "electrical_ac",
    "galley_appliances",
    "navigation_and_electronics",
    "communications",
    "ground_tackle_and_mooring",
    "rigging_and_sail_handling",
    "hvac",
    "tenders_and_watersports",
]

BASE_CONTEXT = {
    "displayName": "Abacos",
    "regionLabel": "Abacos",
    "officeVhf": {"label": "Cruise Abaco", "channel": "VHF 68", "hours": "08:00–17:00"},
    "localRules": [],
    "emergencyContacts": [{"label": "Base", "value": "test", "action": "call", "tel": "1"}],
}


def make_snapshot(
    categories: list[str] | None = None,
    *,
    vessel_type: str = "sailing_catamaran",
    twin_propulsion: bool = False,
    watermaker_model: bool = False,
    local_rules: list[str] | None = None,
) -> dict[str, Any]:
    equipment: list[dict[str, Any]] = []
    for category in categories or []:
        if category == "propulsion_and_machinery" and twin_propulsion:
            equipment.append(
                {
                    "manufacturer": "Yanmar",
                    "model": "4JH45",
                    "system_category": "propulsion_and_machinery",
                    "zone": "port-hull",
                    "zone_instance": "port",
                }
            )
            equipment.append(
                {
                    "manufacturer": "Yanmar",
                    "model": "4JH45",
                    "system_category": "propulsion_and_machinery",
                    "zone": "stbd-hull",
                    "zone_instance": "starboard",
                }
            )
            continue
        row: dict[str, Any] = {
            "manufacturer": "Generic",
            "model": "Unit",
            "system_category": category,
            "zone": "cockpit",
        }
        if category == "fresh_water_and_plumbing" and watermaker_model:
            row["model"] = "Spectra watermaker"
        equipment.append(row)

    return {
        "vessel": {"name": "Test Vessel", "slug": "test", "vessel_type": vessel_type},
        "charter_company": {"name": "Cruise Abaco"},
        "operating_base": {"name": "Boat Harbour"},
        "guide_context": {
            **BASE_CONTEXT,
            "localRules": local_rules or [],
        },
        "equipment": equipment,
    }


def snapshot_variants() -> list[tuple[str, dict[str, Any]]]:
    variants: list[tuple[str, dict[str, Any]]] = [
        ("none", make_snapshot([])),
        ("full", make_snapshot(ALL_CATEGORIES)),
        ("twin", make_snapshot(["propulsion_and_machinery"], twin_propulsion=True)),
        ("sailing", make_snapshot(["rigging_and_sail_handling"], vessel_type="sailing_catamaran")),
        ("watermaker", make_snapshot(["fresh_water_and_plumbing"], watermaker_model=True)),
        ("monohull", make_snapshot(["propulsion_and_machinery"], vessel_type="sailing_monohull")),
    ]
    for category in ALL_CATEGORIES:
        variants.append((category, make_snapshot([category])))
    return variants


def _minimal_category_when(predicate) -> dict[str, Any] | None:
    from itertools import combinations

    matching: list[tuple[str, ...]] = []
    for size in range(1, len(ALL_CATEGORIES) + 1):
        for combo in combinations(ALL_CATEGORIES, size):
            if predicate(make_snapshot(list(combo))):
                matching.append(combo)
    if not matching:
        return None
    matching.sort(key=len)
    minimal = matching[0]
    if len(minimal) == 1:
        return {"has_category": [minimal[0]]}
    return {"all": [{"has_category": [category]} for category in minimal]}


def infer_when(predicate) -> dict[str, Any]:
    if predicate(make_snapshot([])):
        return {"always": True}

    when_parts: list[dict[str, Any]] = []

    category_when = _minimal_category_when(predicate)
    if category_when:
        if "all" in category_when:
            when_parts.extend(category_when["all"])
        else:
            when_parts.append(category_when)

    twin_only = predicate(make_snapshot(["propulsion_and_machinery"], twin_propulsion=True)) and not (
        predicate(make_snapshot(["propulsion_and_machinery"]))
    )
    if twin_only:
        when_parts.append({"twin_engine": True})

    watermaker_only = predicate(
        make_snapshot(["fresh_water_and_plumbing"], watermaker_model=True)
    ) and not predicate(make_snapshot(["fresh_water_and_plumbing"]))
    if watermaker_only:
        when_parts.append({"has_watermaker": True})

    sailing_only = predicate(
        make_snapshot([], vessel_type="sailing_catamaran")
    ) and not predicate(make_snapshot([], vessel_type="motor_yacht"))
    if sailing_only:
        when_parts.append({"is_sailing": True})

    company_vhf_only = predicate(make_snapshot([])) is False and predicate(
        make_snapshot([])
    )  # placeholder
    del company_vhf_only

    if not when_parts:
        return {"always": True}
    if len(when_parts) == 1:
        return when_parts[0]
    return {"all": when_parts}


def dump_yaml(path: Path, header: str, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    body = yaml.dump(data, sort_keys=False, allow_unicode=True, width=1000)
    path.write_text(header + "\n" + body, encoding="utf-8")


def export_home_rules() -> None:
    sections_header = """# Purpose: Home rules section headings and tones.
# Used by: content.assembler.build_home_rules_module
# Module: ui / homeRuleSections
#
"""
    sections = {
        "sections": [
            {"title": "⛔ Never Do This", "tone": "danger"},
            {"title": "⚠️ Always Do This", "tone": "caution"},
            {"title": "✅ Good Habits", "tone": "good"},
        ]
    }
    dump_yaml(CONTENT_DIR / "home_rules/sections.yaml", sections_header, sections)

    static_rules = []
    full = make_snapshot(ALL_CATEGORIES)
    empty_local = make_snapshot(ALL_CATEGORIES, local_rules=[])

  # Reconstruct static-only rules by comparing with only local rules from snapshot
    # Use explicit definitions from legacy static appends
    static_defs = [
        {
            "when": {"has_category": ["sanitation"], "local_rules_exclude": ["toilet"]},
            "section": "danger",
            "icon": "🚽",
            "text": (
                "Never put ANYTHING in the toilet except human waste — no toilet "
                "paper, no wipes, no paper towels. Paper goes in the bin."
            ),
        },
        {
            "when": {
                "has_category": ["navigation_and_electronics"],
                "local_rules_exclude": ["autopilot"],
            },
            "section": "danger",
            "icon": "🛞",
            "text": (
                "Never leave the helm unattended with autopilot on in traffic, "
                "channels, or near shore"
            ),
        },
        {
            "section": "caution",
            "icon": "🛟",
            "text": "Run the Safety Briefing with all guests before every departure",
            "link": "/tabs/do/checklist/safety-brief",
        },
        {
            "when": {"has_category": ["electrical_dc"]},
            "section": "caution",
            "icon": "🔋",
            "text": (
                "Check house battery state of charge morning and evening — "
                "charge before it gets low, not after"
            ),
        },
        {
            "when": {"has_category": ["galley_appliances"]},
            "section": "good",
            "icon": "🧊",
            "text": (
                "Minimise fridge/freezer door openings — refrigeration is your "
                "biggest continuous power draw"
            ),
        },
        {
            "when": {"has_category": ["fresh_water_and_plumbing"]},
            "section": "good",
            "icon": "💧",
            "text": "Treat fresh water as precious — short showers, taps off while soaping",
        },
    ]
    header = """# Purpose: Static home rules appended when equipment/local rules match.
# Used by: content.assembler.build_home_rules_module (plus guide_context.localRules)
# Module: ui / homeRuleSections
#
"""
    dump_yaml(
        CONTENT_DIR / "home_rules/static_rules.yaml",
        header,
        {"rules": static_defs},
    )


def export_fix_cards() -> None:
    full_snap = make_snapshot(ALL_CATEGORIES, twin_propulsion=True, watermaker_model=True)
    full_cards = legacy.build_fix_cards_module(full_snap)
    cards_out = []
    header = """# Purpose: Default Fix It troubleshooting cards (before equipment fragment enrichment).
# Used by: content.assembler.build_fix_cards_module
# Module: fix_card_set / all
# Slots: {contact_step}, twin_engine append on overheating step
#
"""

    for card in full_cards:
        key = card.get("key")
        steps = list(card.get("steps") or [])
        contact = legacy._contact_step(full_snap)
        if steps and steps[-1] == contact:
            steps = steps[:-1] + ["{contact_step}"]

        def pred(snap: dict[str, Any], k=key) -> bool:
            built = legacy.build_fix_cards_module(snap)
            return any(c.get("key") == k for c in built)

        when = infer_when(pred)
        if key == "bilge_alarm":
            when = {"always": True}

        step_payloads = []
        for step in steps:
            twin_suffix = " — switch to the other engine if possible"
            if step.startswith("IMMEDIATELY reduce RPM") and twin_suffix in step:
                step_payloads.append(
                    {
                        "text": "IMMEDIATELY reduce RPM",
                        "append_when": {"twin_engine": twin_suffix},
                    }
                )
            else:
                step_payloads.append(step)

        cards_out.append(
            {
                "key": key,
                "when": when,
                "icon": card["icon"],
                "cat": card["cat"],
                "catL": card["catL"],
                "title": card["title"],
                "steps": step_payloads,
            }
        )

    dump_yaml(CONTENT_DIR / "fix_cards/cards.yaml", header, {"cards": cards_out})


def export_checklist(checklist_id: str, builder) -> None:
    full_snap = make_snapshot(
        ALL_CATEGORIES,
        twin_propulsion=True,
        watermaker_model=True,
        vessel_type="sailing_catamaran",
    )
    full = builder(full_snap)
    groups_out = []

    for group in full.get("groups") or []:
        title = group["t"]
        items_out = []
        for item in group.get("items") or []:
            text = item["c"]

            def pred(snap: dict[str, Any], t=text, b=builder) -> bool:
                built = b(snap)
                return any(
                    i.get("c") == t
                    for g in built.get("groups") or []
                    for i in g.get("items") or []
                )

            when = infer_when(pred)
            entry: dict[str, Any] = {"c": text}
            if item.get("s"):
                entry["s"] = item["s"]
            if when != {"always": True}:
                entry["when"] = when
            items_out.append(entry)

        if not items_out:
            continue
        groups_out.append({"t": title, "items": items_out})

    header = f"""# Purpose: {checklist_id} checklist content.
# Used by: content.assembler.build_checklist_module
# Module: checklist / {checklist_id}
# Slots: {{vessel_name}}, {{company}}, {{company_or_charter}}, {{engine_group_title}}, etc.
#
"""
    dump_yaml(
        CONTENT_DIR / f"checklists/{checklist_id}.yaml",
        header,
        {"groups": groups_out},
    )


def main() -> None:
    export_home_rules()
    export_fix_cards()
    builders = {
        "safety-brief": legacy._build_safety_brief,
        "pd": legacy._build_pre_departure,
        "anch": legacy._build_anchoring,
        "lu": legacy._build_leaving_unattended,
        "ec": legacy._build_end_of_charter,
    }
    for checklist_id, builder in builders.items():
        export_checklist(checklist_id, builder)
    print(f"Wrote content YAML under {CONTENT_DIR}")


if __name__ == "__main__":
    main()
