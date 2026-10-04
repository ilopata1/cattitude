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
    for banned in ("not provided", "extinguisher", "engine room", "sleek", "luxury", "Cabins"):
        if banned.lower() in overview_text.lower():
            failures.append(f"overview invented or advertised {banned!r}")
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
            },
            {"t": "Using fresh water", "type": "list", "items": ["Short showers."]},
            {
                "t": "Turning it on",
                "type": "prose",
                "c": "Start the watermaker from the NAVIGATOR control panel when you need to begin fresh water production.",
            },
            {
                "t": "Monitoring",
                "type": "prose",
                "c": "While producing, use the NAVIGATOR control panel.",
            },
            {
                "t": "Operating",
                "type": "prose",
                "c": "Stop the watermaker from the NAVIGATOR control panel.\n\nRestart from the same panel.",
            },
            {
                "t": "If something's not right",
                "type": "prose",
                "c": "then retry start from the panel.",
            },
            {
                "t": "Care & upkeep",
                "type": "prose",
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


def _check_audience_plumbing(failures: list[str]) -> None:
    """Crew tags publish; omitted and guest do not; a bad value is an error.

    The full fixture is built from shipped YAML, which is still untagged.
    Tagged cases use a temporary in-memory spec.
    """
    full = next(snapshot for name, snapshot in FIXTURES if name == "full")
    for key, builder in LIBRARY_MODULE_BUILDERS.items():
        payload = builder(full)
        if _has_audience_key(payload):
            failures.append(f"full fixture {key[0]}/{key[1]} published an audience key")

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
    preserved = _apply_fix_overrides(
        cards,
        {"replace": {"crew_card": {"title": "Retitled", "steps": ["Again"]}}},
        full,
    )
    retitled = next(card for card in preserved if card["key"] == "crew_card")
    if retitled.get("audience") != "crew" or retitled.get("title") != "Retitled":
        failures.append("fix override dropped audience")

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
            }
        ],
        [
            {
                "fragment": {
                    "fix_card_overrides": {
                        "x": {
                            "steps": ["Equipment step"],
                            "audience": "guest",
                            "title": "Retitled",
                        }
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
