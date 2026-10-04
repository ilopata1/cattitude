"""Vessel profile for checklists and fix cards.

Covers a private digital twin (Supernova), a thinned sister, a charter breaker
boat (Cattitude), and a single-engine private cruising monohull. Also checks
that a content/vessels/{slug}.yaml replace is applied on every assembly.
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from content.assembler import (  # noqa: E402
    build_checklist_module,
    build_fix_cards_module,
)
from content.conditions import matches  # noqa: E402
from content.slots import apply_slots, guest_fact_gaps, slot_values  # noqa: E402
from guide_context_utils import (  # noqa: E402
    build_guest_facts,
    guest_facts_form_values,
)
from content.loader import CONTENT_ROOT  # noqa: E402
from guide_equipment_fragments import apply_fix_card_fragments  # noqa: E402
from guide_navigation import build_do_menu  # noqa: E402
from guide_publish_consistency import apply_publish_consistency  # noqa: E402
from guide_template_assembly import build_branding_module  # noqa: E402

FAILURES: list[str] = []


def check(condition: bool, message: str) -> None:
    if not condition:
        FAILURES.append(message)


def row(category: str, manufacturer: str = "Generic", model: str = "Unit") -> dict:
    return {
        "manufacturer": manufacturer,
        "model": model,
        "system_category": category,
    }


def boat(
    slug: str,
    vessel_type: str,
    rows: list[dict],
    *,
    company: str = "",
    region: str = "",
    display_name: str = "",
    facts: dict | None = None,
) -> dict:
    return {
        "vessel": {"name": slug, "slug": slug, "vessel_type": vessel_type},
        "charter_company": {"name": company},
        "guide_context": {
            "regionLabel": region,
            "displayName": display_name,
            "guestFacts": facts or {},
        },
        "equipment": rows,
    }


def texts(module: dict) -> list[str]:
    return [item["c"] for group in module["groups"] for item in group["items"]]


def titles(module: dict) -> list[str]:
    return [group["t"] for group in module["groups"]]


def group_texts(module: dict, title: str) -> list[str]:
    for group in module["groups"]:
        if group["t"] == title:
            return [item["c"] for item in group["items"]]
    return []


def card_keys(cards: list[dict]) -> list[str]:
    return [card.get("key") for card in cards]


def joined(module: dict) -> str:
    return "\n".join(texts(module))


def publish(snapshot: dict, systems: list[str], fixes: list[dict] | None = None):
    payload = {
        "systems": {system_id: {"id": system_id, "sections": []} for system_id in systems},
        "checklists": {
            checklist_id: build_checklist_module(checklist_id, snapshot)
            for checklist_id in ("pd", "anch", "lu", "ec", "safety-brief")
        },
        "fixes": fixes if fixes is not None else build_fix_cards_module(snapshot),
    }
    warnings = apply_publish_consistency(payload)
    return payload, warnings


def menu_item(branding: dict, key: str) -> dict:
    menu = build_do_menu(branding, published_checklists={"pd", "anch", "lu", "ec"})
    items = [item for section in menu for item in section.get("items") or []]
    return next(item for item in items if item["key"] == key)


GENERATOR_FRAGMENT = [
    {
        "fragment": {
            "extra_fix_cards": [
                {
                    "key": "generator_wont_start",
                    "icon": "⚡",
                    "cat": "electrical",
                    "catL": "Electrical",
                    "title": "Generator won't start",
                    "steps": ["Press Start on the panel"],
                }
            ]
        }
    }
]


def test_supernova() -> None:
    snapshot = boat(
        "supernova",
        "sailing_catamaran",
        [
            row("propulsion_and_machinery", "Volvo", "D2"),
            row("propulsion_and_machinery", "Volvo", "D2"),
            row("electrical_dc", "CZone", "Touch 7"),
            row("electrical_ac", "Victron", "Quattro"),
            row("electrical_ac", "Fischer Panda", "Panda 8000i"),
            row("sanitation"),
            row("ground_tackle_and_mooring"),
            row("rigging_and_sail_handling"),
            row("tenders_and_watersports"),
            row("navigation_and_electronics"),
            row("fresh_water_and_plumbing"),
            row("hvac"),
        ],
        display_name="France",
    )
    payload, warnings = publish(
        snapshot,
        [
            "overview",
            "safety",
            "heads",
            "water",
            "electrical",
            "controls",
            "batteries",
            "galley",
            "ac",
            "engines",
            "sails",
            "nav",
            "dinghy",
        ],
    )
    pd = joined(payload["checklists"]["pd"])
    ec = texts(payload["checklists"]["ec"])
    lu = texts(payload["checklists"]["lu"])
    anch = texts(payload["checklists"]["anch"])
    check("Engine Compartments — Both" in titles(payload["checklists"]["pd"]), "supernova engine group")
    check("Engine circuits on at the switching panel — engine compartments" in pd, "supernova digital circuits")
    check("breaker" not in pd.lower(), "supernova pd has no breaker line")
    check("AUTO" not in pd, "supernova pd has no AUTO line")
    check("both engines" in pd, "supernova seacocks name both engines")
    check("Both engines started" in pd, "supernova start line")
    check("Shore power cables aboard and stowed" in pd, "supernova shore cables aboard")
    check("Water supply hoses disconnected" in pd, "supernova water hoses")
    lu_notes = " ".join(item.get("s") or "" for group in payload["checklists"]["lu"]["groups"] for item in group["items"])
    check("anchor light if night and at anchor" in lu_notes, "supernova anchor light only at anchor")
    check("Empty holding tanks before returning in a permitted location" in "\n".join(ec), "supernova permitted pump-out")
    check("Windlass" not in pd, "supernova pd windlass dropped")
    check("Windlass DC breaker" not in "\n".join(anch), "supernova anch windlass dropped")
    check("Snubber or bridle attached and taking the load" in anch, "supernova snubber stays")
    check("Backed down gently in reverse for 30 seconds" in anch, "supernova backing down stays")
    check("Note any damage before you leave." in ec, "supernova private damage line")
    check("Shut Down" in titles(payload["checklists"]["ec"]), "supernova shutdown heading")
    check(
        "hand back" not in "\n".join(titles(payload["checklists"]["ec"])).lower(),
        "supernova shutdown does not say hand back",
    )
    shutdown = group_texts(payload["checklists"]["ec"], "Shut Down")
    slip = group_texts(payload["checklists"]["ec"], "Returning to Slip")
    check("Shore power connected" in shutdown, "supernova shore power is in shutdown")
    check("Engines shut down after idling 3-5 minutes" in shutdown, "supernova engines off is in shutdown")
    check("Shore power connected" not in slip, "supernova shore power left the slip list")
    check(not any("sign" in line.lower() for line in ec), "supernova has no charter sign-off")
    check("the charter company" not in "\n".join(ec), "supernova does not invent a charter company")
    check("Generator off" in lu, "supernova generator off")
    check("Inverter off" in lu, "supernova inverter off")
    check("Dinghy secured" in lu and "davits" not in "\n".join(lu), "supernova dinghy is unnamed")
    keys = card_keys(payload["fixes"])
    check("toilet_wont_flush" not in keys, "supernova toilet card omitted")
    stopped = next(card for card in payload["fixes"] if card.get("key") == "something_stopped")
    check("audience" not in stopped, "something stopped stays in both views")
    check(
        any("Favourites" in step for step in stopped.get("guestSteps") or []),
        "supernova guest step uses the touchscreen",
    )
    check(
        all(
            card.get("audience") == "crew"
            for card in payload["fixes"]
            if card.get("key")
            not in {
                "something_stopped",
                "fridge_not_cooling",
                "ac_not_working",
                "no_fresh_water",
                "toilet_wont_flush",
            }
        ),
        "other supernova cards are crew",
    )
    check("windlass" not in keys, "supernova windlass card dropped")
    check("headsail_wont_furl" in keys, "supernova headsail card kept")
    check(all("requiresSystem" not in card for card in payload["fixes"]), "requiresSystem stripped")
    branding = build_branding_module(snapshot)
    check(branding["regionLabel"] == "", "supernova regionLabel empty")
    check(branding["location"] == "France", "home chip can still use displayName")
    anch_item = menu_item(
        {"vesselName": "Supernova", "charterCompany": "", "location": "France", "regionLabel": ""},
        "anch",
    )
    ec_item = menu_item(
        {"vesselName": "Supernova", "charterCompany": "", "location": "France", "regionLabel": ""},
        "ec",
    )
    check(anch_item["subtitle"] == "Setting the hook safely", "supernova anch subtitle has no place")
    check("France" not in anch_item["subtitle"], "supernova subtitle ignores displayName")
    check(ec_item["title"] == "Closing Up", "supernova closing up")
    fixes = apply_fix_card_fragments(
        build_fix_cards_module(snapshot), GENERATOR_FRAGMENT, has_generator=True
    )
    check(any(card.get("key") == "generator_wont_start" for card in fixes), "panda card kept")
    generator = next(card for card in fixes if card.get("key") == "generator_wont_start")
    check(generator.get("audience") == "crew", "generator extra is crew")
    check(fixes[0].get("key"), "fix card key survives fragment apply")
    rich, rich_warnings = publish(snapshot, ["electrical", "engines"], fixes)
    check(any(card.get("title") == "Generator won't start" for card in rich["fixes"]), "generator card stays")
    check(
        any("teaches how to start the generator" in message for message in rich_warnings),
        "generator chapter warning",
    )
    taught = {
        "electrical": {
            "sections": [{"t": "Generator Operation", "type": "steps", "items": ["Start it"]}]
        }
    }
    rich["systems"] = taught
    # Re-run on a copy that already had requiresSystem stripped. Build a fresh one.
    fresh_fixes = apply_fix_card_fragments(
        build_fix_cards_module(snapshot), GENERATOR_FRAGMENT, has_generator=True
    )
    taught_payload = {
        "systems": taught,
        "checklists": payload["checklists"],
        "fixes": fresh_fixes,
    }
    taught_warnings = apply_publish_consistency(taught_payload)
    check(
        not any("teaches how to start the generator" in message for message in taught_warnings),
        "generator warning clears when a chapter teaches it",
    )
    del warnings


def test_sister() -> None:
    rows = [
        row("propulsion_and_machinery", "Volvo", "D2"),
        row("propulsion_and_machinery", "Volvo", "D2"),
        row("electrical_dc", "CZone", "Touch 7"),
        row("electrical_ac"),
        row("fresh_water_and_plumbing"),
        row("sanitation"),
        row("navigation_and_electronics"),
        row("ground_tackle_and_mooring"),
    ]
    snapshot = boat("sister-test", "sailing_catamaran", rows)
    payload, _warnings = publish(
        snapshot,
        ["engines", "controls", "electrical", "batteries", "water", "heads", "nav"],
    )
    pd = joined(payload["checklists"]["pd"])
    lu = texts(payload["checklists"]["lu"])
    check("switching panel" in pd, "sister digital wording")
    check("Both engines" in pd, "sister twin wording")
    check("Air conditioning off" not in lu, "sister has no hvac line")
    check("Dinghy secured" not in lu, "sister has no tender line")
    check("Generator off" not in lu, "sister has no generator line")
    check("Windlass" not in pd, "sister windlass line dropped")
    keys = card_keys(payload["fixes"])
    check("headsail_wont_furl" not in keys, "sister headsail card dropped")
    check("windlass" not in keys, "sister windlass card dropped")
    check("ac_not_working" not in keys, "sister has no ac card")
    check("toilet_wont_flush" not in keys, "sister toilet card omitted")
    skipped = apply_fix_card_fragments(
        build_fix_cards_module(snapshot), GENERATOR_FRAGMENT, has_generator=False
    )
    check(
        not any("generator" in str(card.get("title") or "").lower() for card in skipped),
        "sister without a genset drops generator cards",
    )
    with_panda = boat(
        "sister-test",
        "sailing_catamaran",
        rows + [row("electrical_ac", "Fischer Panda", "Panda 8000i")],
    )
    kept = apply_fix_card_fragments(
        build_fix_cards_module(with_panda), GENERATOR_FRAGMENT, has_generator=True
    )
    check(any(card.get("key") == "generator_wont_start" for card in kept), "sister panda card kept")


def test_cattitude() -> None:
    snapshot = boat(
        "cattitude",
        "sailing_catamaran",
        [
            row("propulsion_and_machinery"),
            row("propulsion_and_machinery"),
            row("electrical_dc"),
            row("electrical_ac"),
            row("sanitation"),
            row("ground_tackle_and_mooring"),
            row("navigation_and_electronics"),
            row("fresh_water_and_plumbing"),
        ],
        company="Cruise Abaco",
        region="Abacos",
    )
    payload, warnings = publish(
        snapshot,
        ["engines", "electrical", "batteries", "water", "heads", "nav", "anchoring", "galley"],
    )
    pd = joined(payload["checklists"]["pd"])
    ec = texts(payload["checklists"]["ec"])
    anch = texts(payload["checklists"]["anch"])
    check("Engine circuit breakers connected — engine compartments" in pd, "cattitude breaker line")
    check("Bilge pump switches in AUTO position" in pd, "cattitude AUTO line")
    check("switching panel" not in pd, "cattitude is not digital")
    check("Windlass circuit breaker confirmed ON" in pd, "cattitude windlass line stays")
    check("Windlass DC breaker ON" in anch, "cattitude anch windlass stays")
    check("Any damage noted and reported to Cruise Abaco" in ec, "cattitude damage line")
    check("Shut Down & Hand Back" in titles(payload["checklists"]["ec"]), "cattitude hand back heading")
    charter_shutdown = group_texts(payload["checklists"]["ec"], "Shut Down & Hand Back")
    check("Shore power connected" in charter_shutdown, "cattitude shore power is in shutdown")
    check(
        "Engines shut down after idling 3-5 minutes" in charter_shutdown,
        "cattitude engines off is in shutdown",
    )
    check(
        "Complete and sign all charter sign-off documents with Cruise Abaco" in ec,
        "cattitude sign-off",
    )
    check("toilet_wont_flush" not in card_keys(payload["fixes"]), "cattitude toilet omitted")
    cattitude_stopped = next(
        card for card in payload["fixes"] if card.get("key") == "something_stopped"
    )
    cattitude_guest = " ".join(cattitude_stopped.get("guestSteps") or [])
    check("Favourites" not in cattitude_guest, "cattitude guest step stays generic")
    check("turn it off, then on" in cattitude_guest, "cattitude generic switch step")
    check("windlass" in card_keys(payload["fixes"]), "cattitude windlass card stays")
    branding = build_branding_module(snapshot)
    item = menu_item(
        {
            "vesselName": "Cattitude",
            "charterCompany": "Cruise Abaco",
            "regionLabel": branding["regionLabel"],
            "marina": "Boat Harbour",
        },
        "anch",
    )
    ec_item = menu_item(
        {"vesselName": "Cattitude", "charterCompany": "Cruise Abaco", "regionLabel": "Abacos"},
        "ec",
    )
    check(item["subtitle"] == "Setting the hook safely in Abacos", "cattitude anch subtitle")
    check(ec_item["title"] == "End of Charter", "cattitude end of charter")
    check(not any("generator" in message.lower() for message in warnings), "cattitude has no generator warning")


def test_monohull() -> None:
    snapshot = boat(
        "monohull",
        "cruising_monohull",
        [
            row("propulsion_and_machinery"),
            row("electrical_dc"),
            row("rigging_and_sail_handling"),
            row("navigation_and_electronics"),
            row("fresh_water_and_plumbing"),
        ],
        display_name="France",
    )
    payload, _warnings = publish(
        snapshot, ["engines", "electrical", "nav", "water"]
    )
    pd = payload["checklists"]["pd"]
    body = joined(pd)
    lu = texts(payload["checklists"]["lu"])
    check("Engine Compartment" in titles(pd), "monohull singular engine group")
    check("Engine Compartments" not in titles(pd), "monohull is not both compartments")
    check("the engine" in body, "monohull says the engine")
    check("both engines" not in body, "monohull does not say both engines")
    check("Engine started" in body, "monohull start line")
    check("Engine circuit breakers connected — engine compartment" in body, "monohull breaker line")
    check("Bilge pump switches in AUTO position" in body, "monohull AUTO line")
    check("Generator off" not in lu, "monohull has no generator line")
    check("Dinghy" not in lu, "monohull has no dinghy line")
    check("Windlass" not in body, "monohull has no windlass line")
    check("headsail_wont_furl" not in card_keys(payload["fixes"]), "monohull headsail dropped without sails")
    with_sails, _ignored = publish(snapshot, ["engines", "electrical", "nav", "water", "sails"])
    check("headsail_wont_furl" in card_keys(with_sails["fixes"]), "monohull headsail kept with sails")
    item = menu_item(
        {"vesselName": "Monohull", "charterCompany": "", "location": "France", "regionLabel": ""},
        "anch",
    )
    ec_item = menu_item(
        {"vesselName": "Monohull", "charterCompany": "", "location": "France", "regionLabel": ""},
        "ec",
    )
    check(item["subtitle"] == "Setting the hook safely", "monohull anch subtitle has no place")
    check(ec_item["title"] == "Closing Up", "monohull closing up")


def test_catamaran_is_not_automatically_twin() -> None:
    snapshot = boat(
        "one-engine-cat",
        "sailing_catamaran",
        [row("propulsion_and_machinery"), row("electrical_dc")],
    )
    pd = build_checklist_module("pd", snapshot)
    body = joined(pd)
    check("Engine Compartment" in titles(pd), "one-engine cat singular title")
    check("both engines" not in body and "Both engines" not in body, "one-engine cat is not twin")


def test_unknown_panel_omits_both_lines() -> None:
    snapshot = boat(
        "unknown-panel",
        "sailing_catamaran",
        [row("propulsion_and_machinery"), row("propulsion_and_machinery")],
    )
    body = joined(build_checklist_module("pd", snapshot))
    check("breaker" not in body.lower(), "unknown panel omits breaker line")
    check("switching panel" not in body, "unknown panel omits digital line")
    check("both engines" in body, "unknown panel still names both engines")


def test_heads_and_tender_facts() -> None:
    electric = boat(
        "heads",
        "sailing_catamaran",
        [row("sanitation", "Tecma", "Silence Plus")],
    )
    electric_cards = {card["key"]: card for card in build_fix_cards_module(electric)}
    check("toilet_wont_flush" in electric_cards, "tecma model keeps the toilet card")
    toilet = electric_cards.get("toilet_wont_flush") or {}
    check("audience" not in toilet, "toilet card stays in both views")
    check(
        any("skipper" in step.lower() for step in toilet.get("guestSteps") or []),
        "toilet guest steps tell the skipper",
    )
    manual = boat(
        "heads",
        "sailing_catamaran",
        [row("sanitation")],
        facts={"headsDrive": "manual"},
    )
    check(
        "toilet_wont_flush" not in card_keys(build_fix_cards_module(manual)),
        "manual head omits the electric toilet card",
    )
    davits = boat(
        "tender",
        "sailing_catamaran",
        [row("tenders_and_watersports")],
        facts={"tenderLaunch": "davits"},
    )
    check(
        "Dinghy secured — davits raised fully, straps buckled"
        in texts(build_checklist_module("lu", davits)),
        "davits named only from the fact",
    )
    none = boat(
        "tender",
        "sailing_catamaran",
        [row("tenders_and_watersports")],
        facts={"tenderLaunch": "none"},
    )
    check("Dinghy" not in texts(build_checklist_module("lu", none)), "tender none omits the line")


def test_owner_with_crew() -> None:
    snapshot = boat(
        "crewed",
        "sailing_catamaran",
        [row("electrical_dc")],
        facts={"operatingMode": "owner_with_crew"},
    )
    module = build_checklist_module("ec", snapshot)
    ec = texts(module)
    check("Shut Down" in titles(module), "owner with crew shutdown heading")
    check("hand back" not in "\n".join(titles(module)).lower(), "owner with crew does not say hand back")
    check("Note any damage before you leave." in ec, "owner with crew uses the private damage line")
    check(not any("sign-off" in line for line in ec), "owner with crew has no charter sign-off")
    chartered = boat(
        "crewed",
        "sailing_catamaran",
        [row("electrical_dc")],
        company="Cruise Abaco",
        facts={"operatingMode": "owner_with_crew"},
    )
    charter_lines = texts(build_checklist_module("ec", chartered))
    check(
        "Complete and sign all charter sign-off documents with Cruise Abaco" in charter_lines,
        "a charter company stays charter",
    )


def test_guest_fact_slots_and_flags() -> None:
    filled_facts = {
        "lifeJackets": {"location": "in the cockpit locker"},
        "fireExtinguishers": {"location": "by each companionway"},
        "firstAidKit": {"location": "in the saloon cupboard"},
        "flares": {"location": "in the grab bag"},
        "epirb": {"location": "beside the grab bag"},
        "grabBag": {"location": "under the helm seat"},
        "throwable": {"location": "on the pushpit"},
        "vhfDsc": {"location": "the fixed VHF at the nav station"},
        "hotWater": {"source": "the 90 L tank in the starboard engine bay"},
        "waterTanks": {"summary": "two 270 L tanks, one under the bed in each aft cabin"},
        "autopilot": {"standby": "press STANDBY on the pilot control beside the engine levers"},
        "galleyStove": "induction",
        "galleyTapNote": "the tap on the left",
        "cabinNames": ["port forward", "port aft", "starboard forward", "starboard aft"],
        "hatchNotes": "The saloon hatch dogs to starboard.",
        "lifejacketPolicy": "Wear one whenever you are asked.",
        "moorsSternTo": True,
        "marinaRoutine": "Pass the lines ashore, then the power lead.",
    }
    filled = boat(
        "facts",
        "sailing_catamaran",
        [
            row("fresh_water_and_plumbing", "Webasto", "calorifier"),
            row("navigation_and_electronics"),
        ],
        facts=filled_facts,
    )
    expected = {
        "life_jackets_location": "in the cockpit locker",
        "fire_extinguishers_location": "by each companionway",
        "first_aid_location": "in the saloon cupboard",
        "flares_location": "in the grab bag",
        "epirb_location": "beside the grab bag",
        "grab_bag_location": "under the helm seat",
        "throwable_location": "on the pushpit",
        "vhf_dsc_location": "the fixed VHF at the nav station",
        "hot_water_sentence": "the 90 L tank in the starboard engine bay",
        "water_tanks_sentence": "two 270 L tanks, one under the bed in each aft cabin",
        "autopilot_standby_sentence": (
            "press STANDBY on the pilot control beside the engine levers"
        ),
        "galley_stove": "induction",
        "galley_tap_note": "the tap on the left",
        "cabin_names_sentence": (
            "The cabins are called: port forward, port aft, starboard forward, "
            "and starboard aft."
        ),
        "hatch_notes": "The saloon hatch dogs to starboard.",
        "lifejacket_policy": "Wear one whenever you are asked.",
        "marina_routine": "Pass the lines ashore, then the power lead.",
    }
    values = slot_values(filled)
    for key, text in expected.items():
        check(values.get(key) == text, f"slot {key}: {values.get(key)!r}")
        check(apply_slots("{" + key + "}", filled) == text, f"render {key}")

    flags = (
        "has_life_jackets_location",
        "has_fire_extinguishers_location",
        "has_first_aid_location",
        "has_flares_location",
        "has_epirb_location",
        "has_grab_bag_location",
        "has_throwable_location",
        "has_vhf_dsc_location",
        "has_hot_water_sentence",
        "has_water_tanks_sentence",
        "has_autopilot_standby",
        "has_cabin_names",
        "has_hatch_notes",
        "has_lifejacket_policy",
        "moors_stern_to",
        "has_marina_routine",
        "has_galley_tap_note",
    )
    blank = boat("facts", "sailing_catamaran", [])
    for flag in flags:
        check(matches({flag: True}, filled), f"{flag} did not open")
        check(not matches({flag: True}, blank), f"{flag} opened on a blank boat")
    check(matches({"galley_stove": "induction"}, filled), "induction stove did not match")
    check(not matches({"galley_stove": "gas"}, filled), "gas stove matched an induction boat")
    check(not matches({"galley_stove": "induction"}, blank), "unset stove matched induction")

    heater_nav = boat(
        "gaps",
        "sailing_catamaran",
        [
            row("fresh_water_and_plumbing", "Webasto", "calorifier"),
            row("navigation_and_electronics"),
        ],
    )
    gaps = guest_fact_gaps(heater_nav)
    check(len(gaps) == 7, f"heater and nav boat should list 7 gaps, got {gaps}")
    check(guest_fact_gaps(blank) == gaps[:5], f"plain boat gaps: {guest_fact_gaps(blank)}")
    check(
        not any("hot water" in line.lower() or "autopilot" in line.lower() for line in guest_fact_gaps(blank)),
        "plain boat listed hot water or the autopilot",
    )
    check(guest_fact_gaps(filled) == [], f"filled boat still has gaps: {guest_fact_gaps(filled)}")
    standby_only = boat(
        "gaps",
        "sailing_catamaran",
        [row("navigation_and_electronics")],
        facts={"autopilot": {"standby": "press STANDBY"}},
    )
    standby_gaps = guest_fact_gaps(standby_only)
    check(len(standby_gaps) == 5, f"autopilot set should leave 5 gaps, got {standby_gaps}")
    check(
        not any("autopilot" in line.lower() for line in standby_gaps),
        "autopilot gap remained after the sentence was set",
    )

    built = build_guest_facts(
        life_jackets_location="  in the cockpit locker  ",
        galley_stove="Induction",
        cabin_names_text="port forward\n\nport aft\n",
        moors_stern_to=True,
        hot_water_source=" the 90 L tank ",
        autopilot_standby="press STANDBY",
    )
    check(built["lifeJackets"] == {"location": "in the cockpit locker"}, "location was not trimmed")
    check(built["galleyStove"] == "induction", f"stove: {built.get('galleyStove')!r}")
    check(built["cabinNames"] == ["port forward", "port aft"], f"cabins: {built.get('cabinNames')!r}")
    check(built["moorsSternTo"] is True, "stern-to was dropped")
    check(built["hotWater"] == {"source": "the 90 L tank"}, "hot water shape")
    check("fireExtinguishers" not in built, "blank extinguishers were stored")
    form = guest_facts_form_values(built)
    check(form["life_jackets_location"] == "in the cockpit locker", "form location")
    check(form["cabin_names_text"] == "port forward\nport aft", "form cabins")
    check(form["galley_stove"] == "induction", "form stove")
    check(form["moors_stern_to"] is True, "form stern-to")
    check(form["hot_water_source"] == "the 90 L tank", "form hot water")
    empty_form = guest_facts_form_values(None)
    for key in (
        "life_jackets_location",
        "galley_stove",
        "cabin_names_text",
        "moors_stern_to",
        "marina_routine",
        "autopilot_standby",
        "galley_tap_note",
    ):
        check(key in empty_form, f"empty form missing {key}")
    check(build_guest_facts(galley_stove="unset", cabin_names_text="\n") == {}, "unset stove was stored")
    try:
        build_guest_facts(galley_stove="wood")
        check(False, "invalid galley stove was accepted")
    except ValueError:
        pass


def test_vessel_override_survives_second_assembly() -> None:
    path = CONTENT_ROOT / "vessels" / "supernova.yaml"
    if path.exists():
        FAILURES.append("refusing to overwrite content/vessels/supernova.yaml")
        return
    snapshot = boat("supernova", "sailing_catamaran", [row("electrical_dc", "CZone", "Touch 7")])
    path.write_text(
        "checklists:\n"
        "  pd:\n"
        "    replace:\n"
        "      pd/fenders: Profile override sentence stays.\n",
        encoding="utf-8",
    )
    try:
        first = texts(build_checklist_module("pd", snapshot))
        second = texts(build_checklist_module("pd", snapshot))
        check(first == second, "override differs across assemblies")
        check("Profile override sentence stays." in first, "override replace missing")
        check("Fenders retrieved and stowed" not in first, "replaced fender line still present")
    finally:
        path.unlink(missing_ok=True)


def main() -> None:
    test_supernova()
    test_sister()
    test_cattitude()
    test_monohull()
    test_catamaran_is_not_automatically_twin()
    test_unknown_panel_omits_both_lines()
    test_heads_and_tender_facts()
    test_owner_with_crew()
    test_guest_fact_slots_and_flags()
    test_vessel_override_survives_second_assembly()
    if FAILURES:
        print(f"FAILED: {len(FAILURES)}")
        for message in FAILURES:
            print(f"  {message}")
        sys.exit(1)
    print("OK: library profile")


if __name__ == "__main__":
    main()
