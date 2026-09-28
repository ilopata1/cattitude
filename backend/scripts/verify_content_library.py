"""Verify content assembler output matches guide_content_library_legacy.py."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

import guide_content_library_legacy as legacy
from content.assembler import LIBRARY_MODULE_BUILDERS, apply_guest_layers
from content.loader import load_yaml

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
    "localRules": [
        "Never anchor on coral",
        "Monitor VHF Ch 16 underway",
    ],
    "emergencyContacts": [{"label": "Base", "value": "test", "action": "call", "tel": "1"}],
}


def make_snapshot(
    categories: list[str] | None = None,
    *,
    vessel_type: str = "sailing_catamaran",
    twin_propulsion: bool = False,
    watermaker_model: bool = False,
) -> dict[str, Any]:
    equipment: list[dict[str, Any]] = []
    for category in categories or []:
        if category == "propulsion_and_machinery" and twin_propulsion:
            equipment.extend(
                [
                    {
                        "manufacturer": "Yanmar",
                        "model": "4JH45",
                        "system_category": "propulsion_and_machinery",
                        "zone": "port-hull",
                        "zone_instance": "port",
                    },
                    {
                        "manufacturer": "Yanmar",
                        "model": "4JH45",
                        "system_category": "propulsion_and_machinery",
                        "zone": "stbd-hull",
                        "zone_instance": "starboard",
                    },
                ]
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
        "guide_context": BASE_CONTEXT,
        "equipment": equipment,
    }


FIXTURES = [
    ("minimal", make_snapshot([])),
    ("full", make_snapshot(ALL_CATEGORIES, twin_propulsion=True, watermaker_model=True)),
    ("twin-engines", make_snapshot(["propulsion_and_machinery"], twin_propulsion=True)),
    ("monohull", make_snapshot(["propulsion_and_machinery"], vessel_type="sailing_monohull")),
]

# Home rules, seamanship, and the checklists/fix cards follow the vessel
# profile (operating mode, panel, engine count). Those modules are checked
# by verify_library_profile.py. Compare every other module to legacy.
LEGACY_SKIP = {
    ("ui", "homeRuleSections"),
    ("checklist", "safety-brief"),
    ("checklist", "pd"),
    ("checklist", "anch"),
    ("checklist", "lu"),
    ("checklist", "ec"),
    ("fix_card_set", "all"),
    ("system", "seamanship"),
}


def _texts(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False)


def _section_items(module: dict[str, Any], title: str) -> list[str]:
    for section in module.get("sections") or []:
        if section.get("t") == title:
            return list(section.get("items") or [])
    return []


def _check_handbook(failures: list[str]) -> None:
    supernova_facts = load_yaml("guest_facts/supernova.yaml")
    catamaran = make_snapshot(
        [
            "hvac",
            "galley_appliances",
            "fresh_water_and_plumbing",
            "rigging_and_sail_handling",
            "sanitation",
        ],
        vessel_type="sailing_catamaran",
    )
    catamaran["guide_context"] = {
        **BASE_CONTEXT,
        "guestFacts": supernova_facts,
    }
    catamaran["equipment"] = [
        row
        if row.get("system_category") != "fresh_water_and_plumbing"
        else {**row, "description": "calorifier hot water"}
        for row in catamaran["equipment"]
    ]
    catamaran["sail_plan"] = {
        "sails": [
            "Main",
            "Self-tacking jib",
            "Code 0",
            "Gennaker",
            "A2",
            "S4",
        ]
    }
    for row in catamaran["equipment"]:
        if row.get("system_category") == "rigging_and_sail_handling":
            row["description"] = "winch, not a sail name"
    monohull = make_snapshot(
        ["rigging_and_sail_handling", "sanitation", "galley_appliances"],
        vessel_type="cruising_monohull",
    )

    home = LIBRARY_MODULE_BUILDERS[("ui", "homeRuleSections")](catamaran)
    home_text = _texts(home)
    for phrase in (
        "Shore shoes stay ashore",
        "Never sit on lifelines",
        "stay clear of sheets",
        "do not bounce",
        "one hand for you",
    ):
        if phrase not in home_text:
            failures.append(f"supernova home rules missing {phrase!r}")

    mono_home = _texts(LIBRARY_MODULE_BUILDERS[("ui", "homeRuleSections")](monohull))
    if "do not bounce" in mono_home or "Trampoline" in mono_home:
        failures.append("monohull home rules include a trampoline")
    if "starboard hull" in mono_home:
        failures.append("monohull home rules invent a ladder")

    safety_replaced = apply_guest_layers(
        "safety",
        {
            "id": "safety",
            "sections": [
                {
                    "t": "Life Raft",
                    "type": "prose",
                    "c": "The life raft is stored in the cockpit area.",
                }
            ],
        },
        catamaran,
    )
    life_titles = [
        section.get("t")
        for section in safety_replaced["sections"]
        if str(section.get("t") or "").casefold() == "life raft"
    ]
    if life_titles != ["Life raft"]:
        failures.append(f"life raft title was not replaced by the guest layer: {life_titles}")
    if any("stored in the cockpit area" in str(section) for section in safety_replaced["sections"]):
        failures.append("generated Life Raft prose was kept beside the guest layer")

    safety = apply_guest_layers("safety", {"id": "safety", "sections": [], "learnChecks": []}, catamaran)
    safety_text = _texts(safety)
    if "under the seat at the aft of the cockpit" not in safety_text:
        failures.append("supernova life raft location missing")
    if "the cockpit" not in safety_text:
        failures.append("supernova manual bilge location missing")
    bare_safety = _texts(
        apply_guest_layers("safety", {"id": "safety", "sections": []}, monohull)
    )
    if "under the seat" in bare_safety or "Manual bilge pumps can be worked" in bare_safety:
        failures.append("monohull safety invented a life raft or bilge location")
    if "skipper will show you where the life raft" not in bare_safety:
        failures.append("missing life raft location should point to the skipper")

    galley = apply_guest_layers("galley", {"id": "galley", "sections": []}, catamaran)
    galley_text = _texts(galley)
    if "circular hatches" not in galley_text:
        failures.append("supernova waste routing missing")
    if "discharged overboard" not in galley_text:
        failures.append("supernova organic-overboard sentence missing")
    mono_galley = _texts(apply_guest_layers("galley", {"id": "galley", "sections": []}, monohull))
    if "overboard" in mono_galley or "circular hatches" in mono_galley:
        failures.append("monohull galley includes organic-overboard or Supernova hatches")

    dinghy = apply_guest_layers("dinghy", {"id": "dinghy", "sections": []}, catamaran)
    ladders = _section_items(dinghy, "Swimming")
    if not any("starboard hull" in item for item in ladders):
        failures.append("supernova swim ladders missing")
    if not any("Pull down on the rope" in item for item in ladders):
        failures.append("supernova emergency ladder deploy missing")
    mono_swim = _texts(apply_guest_layers("dinghy", {"id": "dinghy", "sections": []}, monohull))
    if "starboard" in mono_swim or "Pull down" in mono_swim:
        failures.append("monohull swimming invented a ladder")

    heads = _texts(apply_guest_layers("heads", {"id": "heads", "sections": []}, catamaran))
    if "flush with fresh water" not in heads:
        failures.append("supernova fresh-water heads sentence missing")
    mono_heads = _texts(apply_guest_layers("heads", {"id": "heads", "sections": []}, monohull))
    if "flush with fresh water" in mono_heads or "flush with seawater" in mono_heads:
        failures.append("monohull heads invented a flush-water source")

    electrical = _texts(
        apply_guest_layers("electrical", {"id": "electrical", "sections": []}, catamaran)
    )
    for phrase in ("Heating water", "Air conditioning", "Cooking", "dim when you hold"):
        if phrase not in electrical:
            failures.append(f"supernova electrical missing {phrase!r}")
    mono_electrical = _texts(
        apply_guest_layers("electrical", {"id": "electrical", "sections": []}, monohull)
    )
    if "dim when you hold" in mono_electrical or "Heating water" in mono_electrical:
        failures.append("monohull electrical includes hold-to-dim or a water heater")

    overview = apply_guest_layers(
        "overview",
        {"id": "overview", "sections": [{"t": "Layout", "type": "photo", "html": "<img>"}]},
        catamaran,
    )
    titles = [section.get("t") for section in overview["sections"]]
    if titles[0] != "Layout" or "Trampoline" not in titles:
        failures.append(f"layout photo was not kept ahead of the trampoline note: {titles}")
    mono_overview = apply_guest_layers(
        "overview",
        {"id": "overview", "sections": [{"t": "Layout", "type": "photo", "html": "<img>"}]},
        monohull,
    )
    if any(section.get("t") == "Trampoline" for section in mono_overview["sections"]):
        failures.append("monohull overview includes a trampoline")

    seamanship = LIBRARY_MODULE_BUILDERS[("system", "seamanship")](catamaran)
    seam_text = _texts(seamanship)
    if "clove-hitch.png" not in seam_text or "bowline.png" not in seam_text:
        failures.append("seamanship knots missing diagrams")
    if "along the edge of either deck" not in seam_text:
        failures.append("catamaran jackline wording missing")
    sail_line = "Sails on this boat: Main, Self-tacking jib, Code 0, Gennaker, A2, and S4."
    if sail_line in seam_text:
        failures.append("sail plan inventory still in seamanship")
    if "winch, not a sail name" in seam_text:
        failures.append("rigging equipment was used as a sail name")
    sails = apply_guest_layers("sails", {"id": "sails", "sections": []}, catamaran)
    if sail_line not in _texts(sails):
        failures.append("sail plan inventory missing from sails")
    without_plan = make_snapshot(
        ["rigging_and_sail_handling"], vessel_type="sailing_catamaran"
    )
    without_plan["equipment"][0]["description"] = "mainsail"
    without_text = _texts(LIBRARY_MODULE_BUILDERS[("system", "seamanship")](without_plan))
    if "Sails on this boat" in without_text:
        failures.append("seamanship invented a sail list without a sail plan")
    without_sails = _texts(
        apply_guest_layers("sails", {"id": "sails", "sections": []}, without_plan)
    )
    if "Sails on this boat" in without_sails:
        failures.append("sails invented a sail list without a sail plan")
    mono_seam = _texts(LIBRARY_MODULE_BUILDERS[("system", "seamanship")](monohull))
    if "along the side decks" not in mono_seam:
        failures.append("monohull jackline wording missing")
    power = make_snapshot([], vessel_type="motor_yacht")
    power_seam = LIBRARY_MODULE_BUILDERS[("system", "seamanship")](power)
    power_titles = [section.get("t") for section in power_seam["sections"]]
    if "What the lines are called" in power_titles:
        failures.append("power boat seamanship includes line names")
    if "Knots" not in power_titles:
        failures.append("power boat seamanship dropped the knots")

    brief = _texts(LIBRARY_MODULE_BUILDERS[("checklist", "safety-brief")](catamaran))
    if "the stern of the starboard hull" not in brief:
        failures.append("safety brief missing the primary ladder location")


def main() -> int:
    failures: list[str] = []
    for fixture_name, snapshot in FIXTURES:
        for key, builder in LIBRARY_MODULE_BUILDERS.items():
            if key in LEGACY_SKIP or key not in legacy.LIBRARY_MODULE_BUILDERS:
                continue
            legacy_builder = legacy.LIBRARY_MODULE_BUILDERS[key]
            expected = legacy_builder(snapshot)
            actual = builder(snapshot)
            if expected != actual:
                failures.append(
                    f"{fixture_name} {key[0]}/{key[1]}:\n"
                    f"expected={json.dumps(expected, ensure_ascii=False, sort_keys=True)}\n"
                    f"actual  ={json.dumps(actual, ensure_ascii=False, sort_keys=True)}"
                )

    _check_handbook(failures)

    if failures:
        print(f"FAILED: {len(failures)} mismatch(es)")
        for failure in failures[:12]:
            print(failure)
            print("---")
        return 1

    print(f"OK: {len(FIXTURES)} fixtures × legacy modules, plus handbook snapshots")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
