"""Verify content assembler output matches guide_content_library_legacy.py."""

from __future__ import annotations

import json
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

import guide_content_library_legacy as legacy
from content.audience import guest_steps_problem
from content.assembler import (
    LIBRARY_MODULE_BUILDERS,
    _apply_checklist_overrides,
    _apply_fix_overrides,
    _sections_from_spec,
    apply_crew_layers,
    apply_guest_layers,
    apply_vessel_guest_layers,
    build_checklist_module,
    build_fix_cards_module,
    build_home_rules_module,
    build_overview_module,
    build_safety_module,
    factual_tender_summary,
)
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
    ("checklist", "gh"),
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

    old_heads_summary = "Blackwater discharge valves stay shut in harbour."
    composed_heads = {
        "id": "heads",
        "summary": old_heads_summary,
        "subtitle": "Blackwater discharge valves",
        "sections": [
            {"t": "How it works", "type": "prose", "c": "Holding tanks."},
            {"t": "Related", "type": "prose", "c": "See Fix It."},
        ],
    }
    headed = apply_guest_layers("heads", composed_heads, catamaran)
    expected_heads_summary = (
        "The heads on Test Vessel flush with fresh water, so every flush comes out of the tanks. "
        "Nothing but human waste goes in them. Paper goes in the bin."
    )
    if headed.get("summary") != expected_heads_summary:
        failures.append(f"heads guest summary: {headed.get('summary')!r}")
    if headed.get("subtitle") != (
        "The heads on Test Vessel flush with fresh water, so every flush comes out of the tanks"
    ):
        failures.append(f"heads guest subtitle: {headed.get('subtitle')!r}")
    preserved = next(
        (
            section
            for section in headed["sections"]
            if section.get("t") == "How the waste system is set up"
        ),
        None,
    )
    if (
        not isinstance(preserved, dict)
        or preserved.get("type") != "prose"
        or preserved.get("audience") != "crew"
        or preserved.get("c") != old_heads_summary
    ):
        failures.append(f"heads crew summary section: {preserved}")
    heads_titles = [section.get("t") for section in headed["sections"]]
    if heads_titles[-1] != "Related":
        failures.append(f"heads Related is not last: {heads_titles}")
    if "Using the heads" not in heads_titles or heads_titles.index(
        "How the waste system is set up"
    ) > heads_titles.index("Using the heads"):
        failures.append(f"crew summary landed after guest sections: {heads_titles}")

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

    recorded = dict(catamaran)
    recorded["vessel"] = {
        "name": "Supernova",
        "slug": "supernova",
        "vessel_type": "sailing_catamaran",
    }
    recorded["hull_model"] = {"manufacturer": "Outremer", "display_name": "55"}
    built_overview = apply_guest_layers(
        "overview",
        build_overview_module(
            recorded,
            {"sections": [{"t": "Layout", "type": "photo", "html": "<img class='layout'>"}]},
        ),
        recorded,
    )
    overview_text = _texts(built_overview)
    if built_overview.get("summary") != "Supernova is an Outremer 55 sailing catamaran.":
        failures.append(f"overview sentence: {built_overview.get('summary')}")
    if built_overview.get("subtitle") != "Outremer 55":
        failures.append(f"overview subtitle: {built_overview.get('subtitle')}")
    overview_titles = [section.get("t") for section in built_overview["sections"]]
    if overview_titles[0] != "Layout" or "Trampoline" not in overview_titles:
        failures.append(f"overview photo or trampoline missing: {overview_titles}")
    if "Life raft — under the seat at the aft of the cockpit" not in overview_text:
        failures.append("overview day 1 missing the life raft")
    day_one = _section_items(built_overview, "Find these on day 1")
    if any(str(item).startswith("Life jackets") for item in day_one):
        failures.append("day 1 lists life jackets when the location is blank")
    gear_facts = dict(recorded["guide_context"]["guestFacts"])
    gear_facts.update(
        {
            "lifeJackets": {"location": "in the cockpit locker"},
            "fireExtinguishers": {"location": "by each companionway"},
            "firstAidKit": {"location": "in the saloon cupboard"},
            "throwable": {"location": "on the pushpit"},
            "epirb": {"location": "beside the grab bag"},
            "grabBag": {"location": "under the helm seat"},
            "flares": {"location": "in the grab bag"},
        }
    )
    gear_snapshot = dict(recorded)
    gear_snapshot["guide_context"] = {
        **recorded["guide_context"],
        "guestFacts": gear_facts,
    }
    gear_items = _section_items(
        build_overview_module(gear_snapshot), "Find these on day 1"
    )
    gear_prefix = [
        "Life raft — under the seat at the aft of the cockpit",
        "Life jackets — in the cockpit locker",
        "Fire extinguishers — by each companionway",
        "First-aid kit — in the saloon cupboard",
        "Throwable buoy — on the pushpit",
        "EPIRB — beside the grab bag",
        "Grab bag — under the helm seat",
        "Flares — in the grab bag",
        "Manual bilge pump — the cockpit",
    ]
    if gear_items[: len(gear_prefix)] != gear_prefix:
        failures.append(f"day 1 gear order: {gear_items}")
    elif not any(str(item).startswith("Stern ladder") for item in gear_items[len(gear_prefix) :]):
        failures.append(f"day 1 dropped the swim ladders: {gear_items}")
    for banned in ("not provided", "extinguisher", "engine room", "sleek", "luxury"):
        if banned.lower() in overview_text.lower():
            failures.append(f"overview invented or advertised {banned!r}")
    if "Cabins" in overview_text:
        failures.append("overview invented a Cabins heading")
    built_safety = apply_guest_layers("safety", build_safety_module(recorded), recorded)
    safety_text = _texts(built_safety)
    if "It is kept under the seat at the aft of the cockpit." not in safety_text:
        failures.append("safety life raft sentence missing")
    if "from the cockpit" not in safety_text:
        failures.append("safety manual bilge missing")
    if "Familiarize" in safety_text or "stored in the cockpit area" in safety_text:
        failures.append("safety still has the generic life-raft section")
    tender = factual_tender_summary(
        {
            "equipment": [
                {
                    "manufacturer": "Highfield",
                    "model": "Classic 360",
                    "system_category": "tenders_and_watersports",
                }
            ]
        }
    )
    if tender != "The tender is a Highfield Classic 360.":
        failures.append(f"tender summary: {tender}")

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

    _check_shared_guest_sections(failures)


def _layer(system_id: str, snapshot: dict[str, Any]) -> dict[str, Any]:
    return apply_guest_layers(system_id, {"id": system_id, "sections": []}, snapshot)


def _require(failures: list[str], label: str, text: str, phrase: str) -> None:
    if phrase not in text:
        failures.append(f"{label} missing {phrase!r}")


def _forbid(failures: list[str], label: str, text: str, phrase: str) -> None:
    if phrase in text:
        failures.append(f"{label} includes {phrase!r}")


def _check_shared_guest_sections(failures: list[str]) -> None:
    """Gated guest sections appear only on a boat that qualifies."""
    filled = make_snapshot(
        [
            "propulsion_and_machinery",
            "electrical_dc",
            "electrical_ac",
            "navigation_and_electronics",
            "ground_tackle_and_mooring",
            "tenders_and_watersports",
            "hvac",
            "galley_appliances",
            "fresh_water_and_plumbing",
            "sanitation",
            "rigging_and_sail_handling",
        ],
        vessel_type="sailing_catamaran",
        twin_propulsion=True,
        watermaker_model=True,
    )
    filled["equipment"].extend(
        [
            {
                "manufacturer": "CZone",
                "model": "Touch 7",
                "system_category": "electrical_dc",
                "zone": "helm",
            },
            {
                "manufacturer": "Fischer Panda",
                "model": "Panda 8000i",
                "system_category": "electrical_ac",
                "zone": "engine",
            },
        ]
    )
    filled["guide_context"] = {
        **BASE_CONTEXT,
        "guestFacts": {
            "lifeJackets": {"location": "in the cockpit locker"},
            "fireExtinguishers": {"location": "by each companionway"},
            "firstAidKit": {"location": "in the saloon cupboard"},
            "flares": {"location": "in the grab bag"},
            "epirb": {"location": "beside the grab bag"},
            "grabBag": {"location": "under the helm seat"},
            "throwable": {"location": "on the pushpit"},
            "vhfDsc": {"location": "the fixed VHF at the nav station"},
            "hotWater": {"source": "the 90 L tank in the starboard engine bay"},
            "waterTanks": {"summary": "two 270 L tanks"},
            "autopilot": {"standby": "press STANDBY on the pilot control"},
            "galleyStove": "induction",
            "galleyTapNote": "the tap on the left",
            "cabinNames": ["port forward", "port aft"],
            "hatchNotes": "The saloon hatch dogs to starboard.",
            "lifejacketPolicy": "Wear one whenever the skipper asks.",
            "moorsSternTo": True,
            "marinaRoutine": "Pass the lines ashore, then the power lead.",
            "headsDrive": "electric",
            "holdToDim": True,
            "hasTrampoline": True,
        },
    }
    bare = make_snapshot([], vessel_type="motor_yacht")

    layers = (
        "safety",
        "water",
        "heads",
        "electrical",
        "batteries",
        "engines",
        "nav",
        "controls",
        "ac",
        "dinghy",
        "galley",
        "overview",
        "anchoring",
    )
    filled_modules = {sid: _layer(sid, filled) for sid in layers}
    bare_modules = {sid: _layer(sid, bare) for sid in layers}
    filled_modules["seamanship"] = LIBRARY_MODULE_BUILDERS[("system", "seamanship")](filled)
    bare_modules["seamanship"] = LIBRARY_MODULE_BUILDERS[("system", "seamanship")](bare)

    for sid, module in {**filled_modules, **bare_modules}.items():
        for section in module.get("sections") or []:
            if "audience" in section:
                failures.append(
                    f"{sid} {section.get('t')!r} carries audience {section.get('audience')!r}"
                )

    filled_text = {sid: _texts(module) for sid, module in filled_modules.items()}
    bare_text = {sid: _texts(module) for sid, module in bare_modules.items()}

    for sid, phrase in (
        ("safety", "Life jackets — in the cockpit locker"),
        ("safety", "Fire extinguishers — by each companionway"),
        ("safety", "Shout MAN OVERBOARD."),
        ("safety", "Press MOB on the chartplotter."),
        ("safety", "Wear one whenever the skipper asks."),
        ("safety", "Jacklines run along the edge of either deck."),
        ("safety", "Put the levers for both engines into neutral"),
        ("safety", "turn the boat into the wind"),
        ("safety", "let all the chain out"),
        ("safety", "red DISTRESS button on the fixed VHF at the nav station"),
        ("safety", "Call for help on VHF channel 16."),
        ("water", "two 270 L tanks"),
        ("water", "the 90 L tank in the starboard engine bay"),
        ("water", "If there is no hot water, that is usually why."),
        ("water", "It makes fresh water from the sea"),
        ("heads", "the water pump is probably off"),
        ("heads", "Press the flush button once."),
        ("heads", "Nothing wet goes in it."),
        ("electrical", "If everything goes dark at once"),
        ("batteries", "The skipper checks the batteries morning and evening."),
        ("engines", "Both engines live under the aft steps, in the engine compartments."),
        ("engines", "Never swim with an engine running."),
        ("nav", "The chartplotters show where we are."),
        ("nav", "press STANDBY on the pilot control"),
        ("controls", "Favourites is where the cabin lights"),
        ("ac", "It only runs on shore power or the generator."),
        ("ac", "unless the skipper runs the generator"),
        ("dinghy", "The kill cord stays on the driver."),
        ("galley", "Pans must be magnetic."),
        ("galley", "the tap on the left"),
        ("galley", "Use one bowl of soapy water."),
        ("galley", "Used the hob once with someone watching"),
        ("overview", "Port is left when you look forward."),
        ("overview", "The cabins are called: port forward, and port aft."),
        ("overview", "The saloon hatch dogs to starboard."),
        ("overview", "Some switches dim when you hold them."),
        ("overview", "square 230 V sockets"),
        ("overview", "Use only red lights"),
        ("anchoring", "Stay off the trampoline and the bow"),
        ("anchoring", "wake the skipper"),
        ("seamanship", "A line goes round a cleat"),
        ("seamanship", "Wait until the passerelle is secured."),
        ("seamanship", "Pass the lines ashore, then the power lead."),
        ("seamanship", "Held a dock line round a cleat under load"),
    ):
        _require(failures, f"filled {sid}", filled_text[sid], phrase)

    for sid, phrase in (
        ("safety", "Life jackets —"),
        ("safety", "Press MOB on the chartplotter."),
        ("safety", "Wear one whenever the skipper asks."),
        ("safety", "clip on"),
        ("safety", "into neutral"),
        ("safety", "into the wind"),
        ("safety", "chain out"),
        ("safety", "nav station"),
        ("water", "two 270 L tanks"),
        ("water", "watermaker"),
        ("water", "fresh water from the sea"),
        ("heads", "Press the flush button once."),
        ("batteries", "morning and evening"),
        ("engines", "propellers"),
        ("nav", "chartplotters"),
        ("nav", "STANDBY"),
        ("controls", "Favourites"),
        ("ac", "Air conditioning"),
        ("dinghy", "kill cord"),
        ("galley", "magnetic"),
        ("galley", "the tap on the left"),
        ("galley", "solenoid"),
        ("overview", "The cabins are called"),
        ("overview", "dogs to starboard"),
        ("overview", "dim when you hold"),
        ("overview", "230 V"),
        ("overview", "Trampoline"),
        ("anchoring", "windlass"),
        ("seamanship", "passerelle"),
        ("seamanship", "Pass the lines ashore"),
    ):
        _forbid(failures, f"bare {sid}", bare_text[sid], phrase)

    for sid, phrase in (
        ("safety", "Shout MAN OVERBOARD."),
        ("safety", "Wear a life jacket at night."),
        ("safety", "Wear one when we are reefed."),
        ("safety", "on the fixed VHF."),
        ("safety", "Call for help on VHF channel 16."),
        ("heads", "Nothing wet goes in it."),
        ("heads", "the water pump is probably off"),
        ("electrical", "If everything goes dark at once"),
        ("galley", "Use one bowl of soapy water."),
        ("galley", "Open it briefly."),
        ("overview", "Port is left when you look forward."),
        ("overview", "Use only red lights"),
        ("overview", "undo the dogs"),
        ("seamanship", "Never jump."),
        ("seamanship", "A line goes round a cleat"),
    ):
        _require(failures, f"bare {sid}", bare_text[sid], phrase)

    _forbid(failures, "filled safety", filled_text["safety"], "when we are reefed")
    _forbid(failures, "filled safety", filled_text["safety"], "Wear a life jacket at night.")
    _require(
        failures,
        "filled safety",
        filled_text["safety"],
        "Found the life jackets and the fire extinguishers",
    )
    _require(
        failures,
        "filled safety",
        filled_text["safety"],
        "Can say what to do if someone else goes in the water",
    )

    bare_find = [section.get("t") for section in bare_modules["safety"]["sections"]]
    if "Find these" in bare_find:
        failures.append("bare safety published an empty Find these list")
    if "Cooking" in [section.get("t") for section in bare_modules["galley"]["sections"]]:
        failures.append("bare galley published Cooking without a stove")
    ac_items = _section_items(filled_modules["ac"], "Air conditioning, for guests")
    if "It only runs on shore power." in ac_items:
        failures.append(f"generator boat used the shore-power-only line: {ac_items}")

    gas = make_snapshot(["galley_appliances"], vessel_type="sailing_monohull")
    gas["guide_context"] = {**BASE_CONTEXT, "guestFacts": {"galleyStove": "gas"}}
    gas_items = _section_items(_layer("galley", gas), "Cooking")
    if "Turn the gas on at the bottle and the solenoid only while you are cooking. Turn it off after." not in gas_items:
        failures.append(f"gas cooking: {gas_items}")
    if any("induction" in item.lower() or "magnetic" in item.lower() for item in gas_items):
        failures.append(f"gas cooking includes induction: {gas_items}")

    electric = make_snapshot([], vessel_type="motor_yacht")
    electric["guide_context"] = {**BASE_CONTEXT, "guestFacts": {"galleyStove": "electric"}}
    electric_items = _section_items(_layer("galley", electric), "Cooking")
    if electric_items != ["The hob needs shore power, the generator, or the inverter."]:
        failures.append(f"electric cooking: {electric_items}")

    shore_only = make_snapshot(["hvac"], vessel_type="motor_yacht")
    shore_items = _section_items(_layer("ac", shore_only), "Air conditioning, for guests")
    if "It only runs on shore power." not in shore_items:
        failures.append(f"shore-only air conditioning: {shore_items}")
    if any("generator" in item for item in shore_items):
        failures.append(f"shore-only air conditioning mentions a generator: {shore_items}")

    single = make_snapshot(
        ["propulsion_and_machinery"], vessel_type="sailing_monohull"
    )
    engine_items = _section_items(_layer("engines", single), "Engines, for guests")
    if "The engine lives under the aft steps, in the engine compartment." not in engine_items:
        failures.append(f"single engine location: {engine_items}")
    if any(item.startswith("Both engines") for item in engine_items):
        failures.append(f"single engine used the twin sentence: {engine_items}")


def _check_section_audience(failures: list[str]) -> None:
    built = _sections_from_spec(
        [
            {"t": "Showers", "type": "list", "items": [{"c": "Short showers."}]},
            {
                "t": "Hull connections",
                "type": "list",
                "audience": "crew",
                "items": [{"c": "Open both."}],
            },
            {
                "t": "Day use",
                "type": "prose",
                "audience": "guest",
                "c": "Hot water is limited.",
            },
        ],
        {},
    )
    by_title = {section["t"]: section for section in built}
    if "audience" in by_title["Showers"]:
        failures.append("untagged section gained an audience")
    if by_title["Hull connections"].get("audience") != "crew":
        failures.append("crew audience was dropped")
    if "audience" in by_title["Day use"]:
        failures.append("guest audience was copied onto the section")
    try:
        _sections_from_spec(
            [{"t": "Bad", "type": "list", "audience": "captain", "items": [{"c": "x"}]}],
            {},
        )
    except ValueError:
        return
    failures.append("unknown audience was accepted")


def _check_crew_layers(failures: list[str]) -> None:
    supernova = {"vessel": {"slug": "supernova", "name": "Supernova"}}
    other = {"vessel": {"slug": "other", "name": "Other"}}
    base = {"id": "water", "sections": [{"t": "Using fresh water", "type": "list", "items": ["Short showers."]}]}
    water = apply_crew_layers("water", base, supernova)
    titles = [section.get("t") for section in water["sections"]]
    if titles[0] != "Using fresh water":
        failures.append("crew water replaced the guest section")
    if "Running the watermaker" not in titles:
        failures.append("supernova watermaker crew section missing")
    body = _texts(water)
    if "100 L/h" not in body:
        failures.append("watermaker crew section missing 100 L/h")
    if "100 L/min" in body or "L/min" in body:
        failures.append("watermaker crew section still says litres per minute")
    if "crew-watermaker-engine-bay-" not in body:
        failures.append("watermaker crew section missing its photograph")
    crew_sections = [section for section in water["sections"] if section.get("audience") == "crew"]
    if len(crew_sections) < 5:
        failures.append("water crew sections were not tagged")
    untouched = apply_crew_layers("water", base, other)
    if untouched["sections"] != base["sections"]:
        failures.append("crew water leaked onto another vessel")

    nav = apply_crew_layers("nav", {"id": "nav", "sections": []}, supernova)
    nav_sections = {section.get("t"): section for section in nav["sections"]}
    if nav_sections.get("Autopilots", {}).get("audience") == "crew":
        failures.append("the short autopilot note was hidden from guests")
    if "backup" not in _texts(nav_sections.get("Autopilots", {})).lower():
        failures.append("guest autopilot sentence missing")
    if nav_sections.get("Using the backup autopilot", {}).get("audience") != "crew":
        failures.append("backup autopilot procedure was not tagged crew")
    if "port aft cabin" not in _texts(nav).lower():
        failures.append("pilot switch cabin missing")

    batteries = apply_crew_layers("batteries", {"id": "batteries", "sections": []}, supernova)
    generator = next(section for section in batteries["sections"] if section.get("t") == "Generator control")
    if generator.get("audience") == "crew":
        failures.append("Panda panel location was hidden from guests")
    if "nav station" not in _texts(generator).lower():
        failures.append("Panda panel location missing")

    sails = apply_crew_layers("sails", {"id": "sails", "sections": []}, supernova)
    if not any(section.get("audience") == "crew" for section in sails["sections"]):
        failures.append("code zero procedure missing")
    heads = apply_crew_layers("heads", {"id": "heads", "sections": []}, supernova)
    if "sea water" not in _texts(heads).lower():
        failures.append("heads fresh/sea note missing")


def _check_vessel_guest_layers(failures: list[str]) -> None:
    supernova = {"vessel": {"slug": "supernova", "name": "Supernova"}}
    other = {"vessel": {"slug": "other", "name": "Other"}}
    base = {
        "id": "water",
        "summary": (
            "On Supernova, fresh water can be made on board with the watermaker "
            "(Dessalator Duo AC & DC Navigator). It is a standalone unit operated "
            "from its NAVIGATOR control panel."
        ),
        "sections": [
            {
                "t": "How it works",
                "type": "prose",
                "c": "The NAVIGATOR control panel selects AC or DC supply.",
                "html": "<p>old</p>",
                "audience": "crew",
            },
            {"t": "Using fresh water", "type": "list", "items": ["Short showers."]},
            {
                "t": "Turning it on",
                "type": "prose",
                "audience": "crew",
                "c": "Start the watermaker from the NAVIGATOR control panel when you need to begin fresh water production.",
            },
            {
                "t": "Monitoring",
                "type": "prose",
                "audience": "crew",
                "c": "While producing, use the NAVIGATOR control panel.",
            },
            {
                "t": "Operating",
                "type": "prose",
                "audience": "crew",
                "c": "Stop the watermaker from the NAVIGATOR control panel.\n\nRestart from the same panel.",
            },
            {
                "t": "If something's not right",
                "type": "prose",
                "audience": "crew",
                "c": "then retry start from the panel.",
            },
            {
                "t": "Care & upkeep",
                "type": "prose",
                "audience": "crew",
                "c": "Rinse the membranes from the panel after prolonged inactivity to protect membrane quality.",
            },
            {"t": "Related", "type": "prose", "c": "Open the Fix It cards."},
        ],
    }
    water = apply_vessel_guest_layers("water", base, supernova)
    titles = [section.get("t") for section in water["sections"]]
    expected = [
        "How it works",
        "Using fresh water",
        "Turning it on",
        "Monitoring",
        "Operating",
        "If something's not right",
        "Care & upkeep",
        "Related",
    ]
    if titles != expected:
        failures.append("guest watermaker corrections moved the chapter")
    body = _texts(water)
    if "NAVIGATOR control panel" in body or "Rinse the membranes from the panel" in body:
        failures.append("guest watermaker still sends the reader to the panel by the old instruction")
    if "port engine compartment" not in body:
        failures.append("guest watermaker start location missing")
    if "about five minutes" not in body:
        failures.append("guest flush duration missing")
    if "repeater" in body.lower():
        failures.append("guest watermaker states the repeater")
    how = next(section for section in water["sections"] if section.get("t") == "How it works")
    html = str(how.get("html") or "")
    if "system:batteries" not in html or "system:electrical" not in html:
        failures.append("guest how-it-works lost its section links")
    care = next(section for section in water["sections"] if section.get("t") == "Care & upkeep")
    if "crew-watermaker-plumbing-" not in str(care.get("html") or ""):
        failures.append("guest flush missing its photograph")
    if water["sections"][1].get("items") != ["Short showers."]:
        failures.append("guest watermaker correction replaced a handbook section")
    for title in (
        "How it works",
        "Turning it on",
        "Monitoring",
        "Operating",
        "If something's not right",
        "Care & upkeep",
    ):
        section = next(item for item in water["sections"] if item.get("t") == title)
        if section.get("audience") != "crew":
            failures.append(f"guest watermaker re-exposed {title!r} to guests")
    if "audience" in water["sections"][1]:
        failures.append("Using fresh water inherited a crew tag")
    shared = apply_guest_layers(
        "water",
        {
            "id": "water",
            "sections": [
                {
                    "t": "Using fresh water",
                    "type": "list",
                    "items": ["Old sentence."],
                    "audience": "crew",
                }
            ],
        },
        supernova,
    )
    shared_fresh = next(
        section for section in shared["sections"] if section.get("t") == "Using fresh water"
    )
    if shared_fresh.get("audience") != "crew":
        failures.append("shared guest layer dropped the replaced section's audience")
    with _yaml_override(
        {
            "guest_layers/water.yaml": {
                "sections": [
                    {
                        "t": "Using fresh water",
                        "type": "list",
                        "audience": "guest",
                        "items": [{"c": "Short showers."}],
                    }
                ]
            }
        }
    ):
        explicit = apply_guest_layers(
            "water",
            {
                "id": "water",
                "sections": [
                    {
                        "t": "Using fresh water",
                        "type": "list",
                        "items": ["Old sentence."],
                        "audience": "crew",
                    }
                ],
            },
            supernova,
        )
    explicit_fresh = next(
        section for section in explicit["sections"] if section.get("t") == "Using fresh water"
    )
    if "audience" in explicit_fresh:
        failures.append("explicit guest audience inherited the crew tag")
    untouched = apply_vessel_guest_layers("water", base, other)
    if untouched != base:
        failures.append("watermaker corrections leaked onto another vessel")


def _has_audience_key(value: Any) -> bool:
    if isinstance(value, dict):
        if "audience" in value:
            return True
        return any(_has_audience_key(child) for child in value.values())
    if isinstance(value, list):
        return any(_has_audience_key(child) for child in value)
    return False


def _checklist_items(module: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for group in module.get("groups") or []:
        items.extend(group.get("items") or [])
    return items


def _rule_text(sections: list[dict[str, Any]], text: str) -> dict[str, Any] | None:
    for section in sections:
        for rule in section.get("rules") or []:
            if rule.get("text") == text:
                return rule
    return None


@contextmanager
def _yaml_override(files: dict[str, Any]):
    """Serve an in-memory spec from the assembler loader. Shipped YAML stays put."""
    import content.assembler as assembler_module

    original = assembler_module.load_yaml_cached

    def fake(path: str) -> Any:
        if path in files:
            return files[path]
        return original(path)

    assembler_module.load_yaml_cached = fake
    try:
        yield
    finally:
        assembler_module.load_yaml_cached = original


_GUEST_FIX_KEYS = {
    "something_stopped",
    "fridge_not_cooling",
    "ac_not_working",
    "no_fresh_water",
    "toilet_wont_flush",
}


def _check_full_fixture_fixes(cards: Any, failures: list[str]) -> None:
    """Shared cards publish guestSteps. Every other card is crew."""
    if not isinstance(cards, list):
        failures.append("full fixture fixes were not a list")
        return
    guest = [card for card in cards if "audience" not in card]
    guest_keys = {card.get("key") for card in guest}
    unexpected = guest_keys - _GUEST_FIX_KEYS
    if unexpected:
        failures.append(f"unexpected shared fix cards: {sorted(unexpected)}")
    if not 4 <= len(guest) <= 5:
        failures.append(f"full fixture published {len(guest)} shared fix cards")
    if "toilet_wont_flush" in guest_keys:
        failures.append("full fixture published the electric toilet card")
    for card in cards:
        key = card.get("key")
        if card.get("audience") == "crew":
            if key in _GUEST_FIX_KEYS:
                failures.append(f"{key} was tagged crew")
            if "guestSteps" in card:
                failures.append(f"crew card {key} published guestSteps")
            continue
        if key not in _GUEST_FIX_KEYS:
            failures.append(f"fix card {key} has audience {card.get('audience')!r}")
            continue
        steps = card.get("guestSteps") or []
        if not steps or not all(isinstance(step, str) and step.strip() for step in steps):
            failures.append(f"{key} missing guestSteps")
        elif not any("skipper" in step.lower() for step in steps):
            failures.append(f"{key} guest steps do not tell the skipper")
    stopped = next((card for card in guest if card.get("key") == "something_stopped"), None)
    generic = " ".join((stopped or {}).get("guestSteps") or [])
    if stopped and "Favourites" in generic:
        failures.append("breaker boat published the touchscreen guest step")
    if stopped and "turn it off, then on" not in generic:
        failures.append("something_stopped lost the generic guest step")

    digital = make_snapshot(ALL_CATEGORIES, twin_propulsion=True, watermaker_model=True)
    for row in digital["equipment"]:
        if row.get("system_category") == "electrical_dc":
            row["manufacturer"] = "CZone"
            row["model"] = "Touch 7"
    digital_cards = {card["key"]: card for card in build_fix_cards_module(digital)}
    touch = " ".join(digital_cards["something_stopped"].get("guestSteps") or [])
    if "Favourites" not in touch:
        failures.append("digital boat missed the Favourites guest step")
    if "turn it off, then on" in touch:
        failures.append("digital boat kept the generic switch step")
    if guest_steps_problem({"audience": "crew", "guestSteps": ["Tell the skipper."]}, label="crew card"):
        pass
    else:
        failures.append("crew fix card with guestSteps was accepted")
    if guest_steps_problem({"guestSteps": ["", "Tell the skipper."]}, label="guest card") is None:
        failures.append("blank guestSteps text was accepted")
    if guest_steps_problem({"guestSteps": ["Tell the skipper."]}, label="guest card") is not None:
        failures.append("guestSteps list was rejected")


def _check_full_fixture_home_rules(sections: list[dict[str, Any]], failures: list[str]) -> None:
    """Crew duties are tagged. The two guest-voice rules stay in both views."""
    rules = [rule for section in sections for rule in section.get("rules") or []]
    crew_prefixes = (
        "Never leave the helm",
        "Run the Safety Briefing",
        "Check house battery",
    )
    both_texts = (
        "Wear a life jacket at night, in the dinghy, and whenever you are asked.",
        "If you hear an alarm, find the skipper. Do not silence it.",
    )
    for prefix in crew_prefixes:
        match = next((rule for rule in rules if str(rule.get("text") or "").startswith(prefix)), None)
        if match is None or match.get("audience") != "crew":
            failures.append(f"full fixture home rule {prefix!r} is not crew")
    for text in both_texts:
        match = _rule_text(sections, text)
        if match is None or "audience" in match:
            failures.append(f"full fixture home rule {text!r} published an audience key")
    local = _rule_text(sections, "Never anchor on coral")
    if local is None or "audience" in local:
        failures.append("full fixture local rule published an audience key")
    extra = [
        rule.get("text")
        for rule in rules
        if rule.get("audience") == "crew"
        and not str(rule.get("text") or "").startswith(crew_prefixes)
    ]
    if extra:
        failures.append(f"unexpected crew home rules: {extra}")


def _check_audience_plumbing(failures: list[str]) -> None:
    """Crew tags publish; omitted and guest do not; a bad value is an error.

    Operating checklists in shipped YAML are crew. Giving a hand and the
    safety briefing stay in both views. The briefing publishes a guest line
    on every item. Other tagged cases use a temporary in-memory spec.
    """
    full = next(snapshot for name, snapshot in FIXTURES if name == "full")
    crew_checklists = {"pd", "anch", "lu", "ec"}
    for key, builder in LIBRARY_MODULE_BUILDERS.items():
        payload = builder(full)
        if key[0] == "checklist" and key[1] in crew_checklists:
            if payload.get("audience") != "crew":
                failures.append(f"full fixture {key[1]} checklist is not crew")
            if any("audience" in item for item in _checklist_items(payload)):
                failures.append(f"full fixture {key[1]} item published an audience key")
            continue
        if key == ("checklist", "gh"):
            items = _checklist_items(payload)
            if "audience" in payload or any("audience" in item for item in items):
                failures.append("giving a hand published an audience key")
            if "Stay out of the cockpit working area" not in _texts(payload):
                failures.append("giving a hand dropped the under-sail line on a sailing boat")
            if not items or not all(str(item.get("key") or "").startswith("gh/") for item in items):
                failures.append("giving a hand item is missing a gh/ key")
            continue
        if key == ("checklist", "safety-brief"):
            items = _checklist_items(payload)
            if _has_audience_key(payload):
                failures.append("safety briefing published an audience key")
            missing = [item.get("key") for item in items if not str(item.get("gc") or "").strip()]
            if missing:
                failures.append(f"safety briefing items missing gc: {missing}")
            if not any(item.get("gc") == "I know where my life jacket is" for item in items):
                failures.append("life jacket guest line missing")
            continue
        if key == ("fix_card_set", "all"):
            _check_full_fixture_fixes(payload, failures)
            continue
        if key == ("ui", "homeRuleSections"):
            _check_full_fixture_home_rules(payload, failures)
            continue
        if _has_audience_key(payload):
            failures.append(f"full fixture {key[0]}/{key[1]} published an audience key")

    power_gh = build_checklist_module("gh", make_snapshot([], vessel_type="motor_yacht"))
    if "cockpit working area" in _texts(power_gh):
        failures.append("power boat published the under-sail helper line")

    with _yaml_override(
        {
            "checklists/pd.yaml": {
                "audience": "crew",
                "groups": [
                    {
                        "t": "Prep",
                        "items": [
                            {"key": "tagged", "c": "Tagged step", "audience": "crew"},
                            {"key": "plain", "c": "Plain step"},
                            {"key": "guest", "c": "Guest step", "audience": "guest"},
                            {"key": "both", "c": "Both step", "audience": "both"},
                        ],
                    }
                ],
            }
        }
    ):
        checklist = build_checklist_module("pd", full)
    if checklist.get("audience") != "crew":
        failures.append("crew checklist file did not publish audience crew")
    by_key = {item["key"]: item for item in _checklist_items(checklist)}
    if by_key["tagged"].get("audience") != "crew":
        failures.append("YAML item tagged crew did not publish audience crew")
    if "audience" in by_key["plain"]:
        failures.append("untagged item published an audience key")
    if "audience" in by_key["guest"] or "audience" in by_key["both"]:
        failures.append("guest or both audience was copied onto the item")

    try:
        with _yaml_override(
            {
                "checklists/pd.yaml": {
                    "groups": [
                        {"t": "Prep", "items": [{"c": "Nope", "audience": "captain"}]}
                    ]
                }
            }
        ):
            build_checklist_module("pd", full)
    except ValueError:
        pass
    else:
        failures.append("invalid audience was accepted")

    carried = _apply_checklist_overrides(
        [
            {
                "t": "Prep",
                "items": [
                    {"key": "a", "c": "Original", "s": "", "audience": "crew"},
                    {"key": "b", "c": "Keep", "s": ""},
                ],
            }
        ],
        {
            "replace": {"a": "New wording"},
            "insert_after": {"b": {"key": "c", "c": "Inserted", "audience": "crew"}},
        },
        full,
    )
    carried_items = {item["key"]: item for item in carried[0]["items"]}
    if carried_items["a"].get("audience") != "crew" or carried_items["a"].get("c") != "New wording":
        failures.append("checklist replace dropped audience")
    if "audience" in carried_items["b"]:
        failures.append("untagged checklist item gained an audience from insert")
    if carried_items["c"].get("audience") != "crew":
        failures.append("insert_after did not carry audience crew")
    shared = _apply_checklist_overrides(
        [
            {
                "t": "Prep",
                "items": [{"key": "a", "c": "Original", "s": "", "audience": "crew"}],
            }
        ],
        {"replace": {"a": {"c": "Now shared", "audience": "guest"}}},
        full,
    )
    if "audience" in shared[0]["items"][0]:
        failures.append("checklist replace did not clear audience when set to guest")

    with _yaml_override(
        {
            "fix_cards/cards.yaml": {
                "cards": [
                    {
                        "key": "crew_card",
                        "icon": "🔴",
                        "cat": "engine",
                        "catL": "Engine",
                        "title": "Crew card",
                        "audience": "crew",
                        "steps": ["Look"],
                    },
                    {
                        "key": "plain_card",
                        "icon": "🔴",
                        "cat": "engine",
                        "catL": "Engine",
                        "title": "Plain card",
                        "steps": ["Look"],
                    },
                ]
            }
        }
    ):
        cards = build_fix_cards_module(full)
    cards_by_key = {card["key"]: card for card in cards}
    if cards_by_key["crew_card"].get("audience") != "crew":
        failures.append("crew fix card did not publish audience crew")
    if "audience" in cards_by_key["plain_card"]:
        failures.append("untagged fix card published an audience key")
    cards_by_key["plain_card"]["guestSteps"] = ["Tell the skipper."]
    preserved = _apply_fix_overrides(
        cards,
        {"replace": {"crew_card": {"title": "Retitled", "steps": ["Again"]}}},
        full,
    )
    retitled = next(card for card in preserved if card["key"] == "crew_card")
    if retitled.get("audience") != "crew" or retitled.get("title") != "Retitled":
        failures.append("fix override dropped audience")
    shared = next(card for card in preserved if card["key"] == "plain_card")
    if shared.get("guestSteps") != ["Tell the skipper."]:
        failures.append("fix override dropped guestSteps")

    from guide_equipment_fragments import apply_fix_card_fragments

    applied = apply_fix_card_fragments(
        [
            {
                "key": "x",
                "icon": "🔴",
                "cat": "engine",
                "catL": "Engine",
                "title": "Old",
                "steps": ["Look", "Call the base"],
                "audience": "crew",
            },
            {
                "key": "shared",
                "icon": "🧊",
                "cat": "electrical",
                "catL": "Electrical",
                "title": "Fridge not cooling",
                "steps": ["Check the breaker", "Call the base"],
                "guestSteps": ["Tell the skipper."],
            },
        ],
        [
            {
                "fragment": {
                    "fix_card_overrides": {
                        "x": {
                            "steps": ["Equipment step"],
                            "audience": "guest",
                            "title": "Retitled",
                        },
                        "shared": {"steps": ["Equipment step"]},
                    },
                    "extra_fix_cards": [
                        {
                            "key": "extra",
                            "icon": "⚡",
                            "cat": "e",
                            "catL": "E",
                            "title": "Extra",
                            "steps": ["Start"],
                        },
                        {
                            "key": "guest_extra",
                            "icon": "⚡",
                            "cat": "e",
                            "catL": "E",
                            "title": "Guest extra",
                            "steps": ["Look"],
                            "audience": "guest",
                        },
                        {
                            "key": "generator_wont_start",
                            "icon": "⚡",
                            "cat": "electrical",
                            "catL": "Electrical",
                            "title": "Generator won't start",
                            "steps": ["Press Start on the panel"],
                        },
                        {
                            "key": "watchkeeper_no_video",
                            "icon": "🧭",
                            "cat": "nav",
                            "catL": "Navigation",
                            "title": "Watchkeeper no video feed",
                            "steps": ["Reboot the Watchkeeper system"],
                        },
                    ],
                }
            }
        ],
    )
    applied_by_key = {card["key"]: card for card in applied}
    if applied_by_key["x"].get("audience") != "crew" or applied_by_key["x"].get("title") != "Retitled":
        failures.append("fragment override did not keep the card audience")
    if applied_by_key["extra"].get("audience") != "crew":
        failures.append("extra fix card did not default to crew")
    if "audience" in applied_by_key["guest_extra"]:
        failures.append("guest extra fix card published an audience key")
    if applied_by_key["shared"].get("guestSteps") != ["Tell the skipper."]:
        failures.append("fragment override dropped guestSteps")
    if applied_by_key["generator_wont_start"].get("audience") != "crew":
        failures.append("generator extra was not crew")
    watchkeeper = next(card for card in applied if card.get("title") == "Watchkeeper no video feed")
    if watchkeeper.get("audience") != "crew":
        failures.append("Watchkeeper extra was not crew")
    try:
        apply_fix_card_fragments(
            [],
            [
                {
                    "fragment": {
                        "extra_fix_cards": [
                            {
                                "key": "bad",
                                "title": "Bad",
                                "steps": ["x"],
                                "audience": "captain",
                            }
                        ]
                    }
                }
            ],
        )
    except ValueError:
        pass
    else:
        failures.append("invalid extra fix card audience was accepted")

    with _yaml_override(
        {
            "home_rules/static_rules.yaml": {
                "rules": [
                    {
                        "section": "caution",
                        "icon": "🛟",
                        "text": "Crew helm rule",
                        "audience": "crew",
                    },
                    {"section": "good", "icon": "👍", "text": "Shared helm rule"},
                ]
            }
        }
    ):
        home = build_home_rules_module(full)
    crew_rule = _rule_text(home, "Crew helm rule")
    shared_rule = _rule_text(home, "Shared helm rule")
    local_rule = _rule_text(home, "Never anchor on coral")
    if crew_rule is None or crew_rule.get("audience") != "crew":
        failures.append("static home rule tagged crew did not publish audience crew")
    if shared_rule is None or "audience" in shared_rule:
        failures.append("untagged home rule published an audience key")
    if local_rule is None or "audience" in local_rule:
        failures.append("local rule published an audience key")

    from guide_template_assembly import _normalize_contact

    crew_contact = _normalize_contact(
        {"label": "Yard", "value": "VHF 72", "audience": "crew"}
    )
    guest_contact = _normalize_contact(
        {"label": "Coastguard", "value": "VHF 16", "audience": "guest"}
    )
    if crew_contact is None or crew_contact.get("audience") != "crew":
        failures.append("crew emergency contact did not publish audience crew")
    if guest_contact is None or "audience" in guest_contact:
        failures.append("guest emergency contact published an audience key")
    try:
        _normalize_contact({"label": "X", "value": "Y", "audience": "secret"})
    except ValueError:
        pass
    else:
        failures.append("invalid emergency contact audience was accepted")

    from guide_generation import GuideGenerationError, _validate_module_payload

    checklist_ok = {
        "audience": "crew",
        "groups": [
            {
                "t": "Prep",
                "items": [{"c": "Do it", "audience": "crew"}, {"c": "Shared"}],
            }
        ],
    }
    try:
        _validate_module_payload("checklist", "pd", checklist_ok)
    except GuideGenerationError as exc:
        failures.append(f"crew checklist audience was rejected: {exc}")
    bad_item = {
        "groups": [{"t": "Prep", "items": [{"c": "Do it", "audience": "guest"}]}]
    }
    try:
        _validate_module_payload("checklist", "pd", bad_item)
    except GuideGenerationError:
        pass
    else:
        failures.append("published checklist item audience guest was accepted")

    try:
        _validate_module_payload(
            "fix_card_set",
            "all",
            [
                {
                    "icon": "🔴",
                    "cat": "engine",
                    "catL": "Engine",
                    "title": "Crew card",
                    "steps": ["Look"],
                    "audience": "crew",
                }
            ],
        )
    except GuideGenerationError as exc:
        failures.append(f"crew fix card audience was rejected: {exc}")
    try:
        _validate_module_payload(
            "fix_card_set",
            "all",
            [
                {
                    "icon": "🔴",
                    "cat": "engine",
                    "catL": "Engine",
                    "title": "Bad card",
                    "steps": ["Look"],
                    "audience": "captain",
                }
            ],
        )
    except GuideGenerationError:
        pass
    else:
        failures.append("published fix card audience captain was accepted")

    try:
        _validate_module_payload(
            "ui",
            "homeRuleSections",
            [
                {
                    "title": "Caution",
                    "tone": "caution",
                    "rules": [
                        {
                            "icon": "🛟",
                            "tone": "caution",
                            "text": "Crew helm rule",
                            "audience": "crew",
                        }
                    ],
                }
            ],
        )
    except GuideGenerationError as exc:
        failures.append(f"crew home rule audience was rejected: {exc}")
    try:
        _validate_module_payload(
            "ui",
            "homeRuleSections",
            [
                {
                    "title": "Caution",
                    "tone": "caution",
                    "rules": [
                        {"icon": "🛟", "tone": "caution", "text": "Shared", "audience": "guest"}
                    ],
                }
            ],
        )
    except GuideGenerationError:
        pass
    else:
        failures.append("published home rule audience guest was accepted")

    system_ok = {
        "id": "water",
        "icon": "💧",
        "title": "Water",
        "subtitle": "Fresh water",
        "summary": "Tanks on board.",
        "sections": [
            {"t": "Using it", "type": "prose", "c": "Short showers.", "audience": "crew"}
        ],
    }
    try:
        _validate_module_payload("system", "water", system_ok)
    except GuideGenerationError as exc:
        failures.append(f"crew section audience was rejected: {exc}")
    system_bad = {
        **system_ok,
        "sections": [
            {"t": "Using it", "type": "prose", "c": "Short showers.", "audience": "guest"}
        ],
    }
    try:
        _validate_module_payload("system", "water", system_bad)
    except GuideGenerationError:
        pass
    else:
        failures.append("published section audience guest was accepted")


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
    _check_section_audience(failures)
    _check_audience_plumbing(failures)
    _check_crew_layers(failures)
    _check_vessel_guest_layers(failures)

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
