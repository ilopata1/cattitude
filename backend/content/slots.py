"""Snapshot slot resolution for curated content templates."""

from __future__ import annotations

import re
from typing import Any

_SLOT_RE = re.compile(r"\{([a-z_]+)\}")

_WATERMAKER_HINTS = (
    "watermaker",
    "spectra",
    "aqua-base",
    "aquabase",
    "osmosis",
    "dessalator",
    "desalinator",
    "desalinat",
)

# Registry identity only (manufacturer and model). Do not read description prose.
_DIGITAL_SWITCHING_RE = re.compile(r"\bczone\b", re.I)
_GENSET_RE = re.compile(r"\b(?:panda|genset|generator)\b", re.I)
_WIND_RE = re.compile(r"\bwind\b", re.I)
_ELECTRIC_HEAD_RE = re.compile(r"\b(?:tecma|electric\s+toilet)\b", re.I)
_TENDER_LAUNCHES = frozenset({"davits", "platform", "none"})
_HEADS_DRIVES = frozenset({"electric", "manual"})
_GALLEY_STOVES = frozenset({"induction", "gas", "electric"})


def equipment(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    return snapshot.get("equipment") or []


def has_category(snapshot: dict[str, Any], *categories: str) -> bool:
    wanted = set(categories)
    return any(row.get("system_category") in wanted for row in equipment(snapshot))


def has_watermaker(snapshot: dict[str, Any]) -> bool:
    for row in equipment(snapshot):
        if row.get("system_category") != "fresh_water_and_plumbing":
            continue
        text = (
            f"{row.get('manufacturer') or ''} {row.get('model') or ''} "
            f"{row.get('description') or ''}"
        ).lower()
        if any(hint in text for hint in _WATERMAKER_HINTS):
            return True
    return False


def is_sailing(snapshot: dict[str, Any]) -> bool:
    vessel_type = (snapshot.get("vessel") or {}).get("vessel_type") or ""
    return "sailing" in vessel_type or has_category(
        snapshot, "rigging_and_sail_handling"
    )


def is_twin_engine(snapshot: dict[str, Any]) -> bool:
    """Two propulsion engines on the registry. Hull type does not decide this."""
    return engine_count(snapshot) >= 2


def vessel_name(snapshot: dict[str, Any]) -> str:
    return (snapshot.get("vessel") or {}).get("name") or "the vessel"


def hull_model_label(snapshot: dict[str, Any]) -> str:
    """Manufacturer and model from the hull row. Empty when that row is missing."""
    hull = snapshot.get("hull_model") or {}
    if not isinstance(hull, dict):
        return ""
    manufacturer = str(hull.get("manufacturer") or "").strip()
    display = str(hull.get("display_name") or hull.get("model_code") or "").strip()
    if manufacturer and display:
        if display.lower().startswith(manufacturer.lower()):
            return display
        return f"{manufacturer} {display}"
    return manufacturer or display


def company_name(snapshot: dict[str, Any]) -> str:
    return (snapshot.get("charter_company") or {}).get("name") or ""


def company_or_charter(snapshot: dict[str, Any]) -> str:
    return company_name(snapshot) or "the charter company"


def office_vhf(snapshot: dict[str, Any]) -> dict[str, str]:
    vhf = (snapshot.get("guide_context") or {}).get("officeVhf") or {}
    return {
        "label": (vhf.get("label") or "").strip(),
        "channel": (vhf.get("channel") or "").strip(),
        "hours": (vhf.get("hours") or "").strip(),
    }


def contact_step(snapshot: dict[str, Any]) -> str:
    company = company_name(snapshot)
    vhf = office_vhf(snapshot)
    if company and vhf["channel"]:
        hours = f" ({vhf['hours']})" if vhf["hours"] else ""
        return (
            f"Contact {company} — {vhf['channel']} during office hours{hours}, "
            "or use the emergency contacts on the Home tab"
        )
    if company:
        return f"Contact {company} — see emergency contacts on the Home tab"
    return "If you cannot resolve it, use the emergency contacts on the Home tab"


def local_rules_text(snapshot: dict[str, Any]) -> list[str]:
    return [
        rule.strip()
        for rule in (snapshot.get("guide_context") or {}).get("localRules") or []
        if isinstance(rule, str) and rule.strip()
    ]


def local_rules_joined_lower(snapshot: dict[str, Any]) -> str:
    return " ".join(local_rules_text(snapshot)).lower()


def guest_facts(snapshot: dict[str, Any]) -> dict[str, Any]:
    raw = (snapshot.get("guide_context") or {}).get("guestFacts")
    return raw if isinstance(raw, dict) else {}


def _row_identity(row: dict[str, Any]) -> str:
    return f"{row.get('manufacturer') or ''} {row.get('model') or ''}"


def _is_digital_switching(row: dict[str, Any]) -> bool:
    return bool(_DIGITAL_SWITCHING_RE.search(_row_identity(row)))


def _is_genset(row: dict[str, Any]) -> bool:
    text = _row_identity(row)
    if _WIND_RE.search(text):
        return False
    return bool(_GENSET_RE.search(text))


def engine_count(snapshot: dict[str, Any]) -> int:
    """Propulsion rows, excluding a genset filed under the same category."""
    return sum(
        1
        for row in equipment(snapshot)
        if row.get("system_category") == "propulsion_and_machinery" and not _is_genset(row)
    )


def has_generator(snapshot: dict[str, Any]) -> bool:
    return any(_is_genset(row) for row in equipment(snapshot))


def operating_mode(snapshot: dict[str, Any]) -> str:
    """charter, private, or owner_with_crew. Never guessed from the hull."""
    if company_name(snapshot):
        return "charter"
    explicit = str(guest_facts(snapshot).get("operatingMode") or "").strip()
    if explicit == "owner_with_crew":
        return "owner_with_crew"
    return "private"


def switching_system(snapshot: dict[str, Any]) -> str | None:
    """digital, breaker, or None when the panel type is not on the registry."""
    if any(_is_digital_switching(row) for row in equipment(snapshot)):
        return "digital"
    if has_category(snapshot, "electrical_dc"):
        return "breaker"
    return None


def tender_launch(snapshot: dict[str, Any]) -> str | None:
    """davits, platform, none, or None when a tender exists and the launch is unknown."""
    raw = str(guest_facts(snapshot).get("tenderLaunch") or "").strip().lower()
    if raw in _TENDER_LAUNCHES:
        return raw
    if not has_category(snapshot, "tenders_and_watersports"):
        return "none"
    return None


def heads_drive(snapshot: dict[str, Any]) -> str | None:
    """electric or manual, only from guestFacts or a sanitation model that says so."""
    raw = str(guest_facts(snapshot).get("headsDrive") or "").strip().lower()
    if raw in _HEADS_DRIVES:
        return raw
    for row in equipment(snapshot):
        if row.get("system_category") != "sanitation":
            continue
        if _ELECTRIC_HEAD_RE.search(_row_identity(row)):
            return "electric"
    return None


def vessel_profile(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "operating_mode": operating_mode(snapshot),
        "switching_system": switching_system(snapshot),
        "engine_count": engine_count(snapshot),
        "has_generator": has_generator(snapshot),
        "tender_launch": tender_launch(snapshot),
        "heads_drive": heads_drive(snapshot),
    }


def _vessel_type(snapshot: dict[str, Any]) -> str:
    return (snapshot.get("vessel") or {}).get("vessel_type") or ""


def is_catamaran(snapshot: dict[str, Any]) -> bool:
    return "catamaran" in _vessel_type(snapshot)


def life_raft_location(snapshot: dict[str, Any]) -> str:
    raft = guest_facts(snapshot).get("lifeRaft") or {}
    if not isinstance(raft, dict):
        return ""
    return str(raft.get("location") or "").strip()


def life_raft_sentence(snapshot: dict[str, Any]) -> str:
    location = life_raft_location(snapshot)
    if location:
        return f"It is kept {location}."
    return "The skipper will show you where the life raft is kept."


def manual_bilge_location(snapshot: dict[str, Any]) -> str:
    bilge = guest_facts(snapshot).get("manualBilge") or {}
    if not isinstance(bilge, dict):
        return ""
    return str(bilge.get("location") or "").strip()


def swim_ladders(snapshot: dict[str, Any]) -> list[dict[str, str]]:
    raw = guest_facts(snapshot).get("swimLadders") or []
    if not isinstance(raw, list):
        return []
    ladders: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        location = str(item.get("location") or "").strip()
        if not location:
            continue
        ladders.append(
            {
                "label": str(item.get("label") or "").strip() or "Boarding ladder",
                "location": location,
                "deploy": str(item.get("deploy") or "").strip(),
            }
        )
    return ladders


def primary_ladder_subtitle(snapshot: dict[str, Any]) -> str:
    ladders = swim_ladders(snapshot)
    if not ladders:
        return ""
    first = ladders[0]
    text = first["location"]
    if first["deploy"]:
        text = f"{text}. {first['deploy']}"
    return text


def waste_routing(snapshot: dict[str, Any]) -> str:
    waste = guest_facts(snapshot).get("waste") or {}
    if not isinstance(waste, dict):
        return ""
    return str(waste.get("routing") or "").strip()


def organic_overboard(snapshot: dict[str, Any]) -> bool:
    waste = guest_facts(snapshot).get("waste") or {}
    if not isinstance(waste, dict):
        return False
    return bool(waste.get("organicOverboard"))


def heads_flush_water(snapshot: dict[str, Any]) -> str:
    value = str(guest_facts(snapshot).get("headsFlushWater") or "").strip().lower()
    return value if value in {"fresh", "sea"} else ""


def heads_flush_phrase(snapshot: dict[str, Any]) -> str:
    """Guest-facing flush source. Unknown facts stay as plain "water"."""
    source = heads_flush_water(snapshot)
    if source == "fresh":
        return "fresh water, so every flush comes out of the tanks"
    if source == "sea":
        return "sea water"
    return "water"


def shower_pump_switch(snapshot: dict[str, Any]) -> str:
    value = str(guest_facts(snapshot).get("showerPumpSwitch") or "").strip()
    return value or "the switch on the wall"


def hold_to_dim(snapshot: dict[str, Any]) -> bool:
    return bool(guest_facts(snapshot).get("holdToDim"))


def has_trampoline(snapshot: dict[str, Any]) -> bool:
    facts = guest_facts(snapshot)
    if "hasTrampoline" in facts and facts.get("hasTrampoline") is not None:
        return bool(facts.get("hasTrampoline"))
    return is_catamaran(snapshot)


def has_jacklines(snapshot: dict[str, Any]) -> bool:
    facts = guest_facts(snapshot)
    if "hasJacklines" in facts and facts.get("hasJacklines") is not None:
        return bool(facts.get("hasJacklines"))
    return is_sailing(snapshot)


def jackline_phrase(snapshot: dict[str, Any]) -> str:
    if is_catamaran(snapshot):
        return "along the edge of either deck"
    return "along the side decks"


def has_water_heater(snapshot: dict[str, Any]) -> bool:
    hints = ("water heater", "hot water", "calorifier")
    for row in equipment(snapshot):
        text = (
            f"{row.get('manufacturer') or ''} {row.get('model') or ''} "
            f"{row.get('description') or ''}"
        ).lower()
        if any(hint in text for hint in hints):
            return True
    return False


def sail_inventory(snapshot: dict[str, Any]) -> list[str]:
    """Sail names from the polar sail plan. That inventory is the only source."""
    plan = snapshot.get("sail_plan") or {}
    if not isinstance(plan, dict):
        return []
    raw = plan.get("sails") or []
    if not isinstance(raw, list):
        return []
    names: list[str] = []
    seen: set[str] = set()
    for item in raw:
        name = str(item).strip()
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        names.append(name)
    return names


def sails_on_this_boat(snapshot: dict[str, Any]) -> str:
    names = sail_inventory(snapshot)
    if not names:
        return ""
    if len(names) == 1:
        listed = names[0]
    else:
        listed = ", ".join(names[:-1]) + ", and " + names[-1]
    return f"Sails on this boat: {listed}."


def _guest_text(snapshot: dict[str, Any], *keys: str) -> str:
    raw: Any = guest_facts(snapshot)
    for key in keys:
        if not isinstance(raw, dict):
            return ""
        raw = raw.get(key)
    if raw is None or isinstance(raw, dict):
        return ""
    return str(raw).strip()


def life_jackets_location(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "lifeJackets", "location")


def fire_extinguishers_location(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "fireExtinguishers", "location")


def first_aid_location(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "firstAidKit", "location")


def flares_location(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "flares", "location")


def epirb_location(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "epirb", "location")


def grab_bag_location(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "grabBag", "location")


def throwable_location(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "throwable", "location")


def vhf_dsc_location(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "vhfDsc", "location")


def hot_water_sentence(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "hotWater", "source")


def water_tanks_sentence(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "waterTanks", "summary")


def autopilot_standby_sentence(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "autopilot", "standby")


def galley_stove(snapshot: dict[str, Any]) -> str:
    raw = str(guest_facts(snapshot).get("galleyStove") or "").strip().lower()
    return raw if raw in _GALLEY_STOVES else ""


def galley_tap_note(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "galleyTapNote")


def cabin_names(snapshot: dict[str, Any]) -> list[str]:
    raw = guest_facts(snapshot).get("cabinNames")
    if isinstance(raw, str):
        raw = raw.splitlines()
    if not isinstance(raw, list):
        return []
    names: list[str] = []
    for item in raw:
        name = str(item).strip()
        if name:
            names.append(name)
    return names


def cabin_names_sentence(snapshot: dict[str, Any]) -> str:
    names = cabin_names(snapshot)
    if not names:
        return ""
    if len(names) == 1:
        listed = names[0]
    else:
        listed = ", ".join(names[:-1]) + ", and " + names[-1]
    return f"The cabins are called: {listed}."


def hatch_notes(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "hatchNotes")


def lifejacket_policy(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "lifejacketPolicy")


def marina_routine(snapshot: dict[str, Any]) -> str:
    return _guest_text(snapshot, "marinaRoutine")


def moors_stern_to(snapshot: dict[str, Any]) -> bool:
    return bool(guest_facts(snapshot).get("moorsSternTo"))


def sar_contact_line(snapshot: dict[str, Any]) -> str:
    """Who to call for help. The region pack fills this from countryCode.

    Until that pack is applied, every boat gets VHF channel 16.
    """
    del snapshot
    return "Call for help on VHF channel 16."


def slot_values(snapshot: dict[str, Any]) -> dict[str, str]:
    vhf = office_vhf(snapshot)
    company = company_name(snapshot)
    hours_paren = f" during office hours ({vhf['hours']})" if vhf["hours"] else ""
    twin = is_twin_engine(snapshot)
    return {
        "vessel_name": vessel_name(snapshot),
        "company": company,
        "company_or_charter": company_or_charter(snapshot),
        "contact_step": contact_step(snapshot),
        "vhf_channel": vhf["channel"],
        "vhf_hours_paren": hours_paren,
        "engine_group_title": (
            "Engine Compartments — Both" if twin else "Engine Compartment"
        ),
        "both_engines": "both engines" if twin else "the engine",
        "engine_compartments": "engine compartments" if twin else "engine compartment",
        "both_engines_cap": "Both engines" if twin else "Engine",
        "mayday_verbal_script": (
            f"MAYDAY x3 · This is {vessel_name(snapshot)} x3 · "
            f"MAYDAY {vessel_name(snapshot)} · Position · Nature of distress · "
            "Assistance required · Persons on board · Over"
        ),
        "vhf_working_channel_line": (
            f"Explain {vhf['channel']}: {company} working channel{hours_paren}"
            if company and vhf["channel"]
            else ""
        ),
        "vhf_monitor_suffix": (
            f" — call {company} on {vhf['channel']} during office hours{hours_paren}"
            if company and vhf["channel"]
            else ""
        ),
        "life_raft_location": life_raft_location(snapshot),
        "life_raft_sentence": life_raft_sentence(snapshot),
        "manual_bilge_location": manual_bilge_location(snapshot),
        "shower_pump_switch": shower_pump_switch(snapshot),
        "jackline_phrase": jackline_phrase(snapshot),
        "sails_on_this_boat": sails_on_this_boat(snapshot),
        "waste_routing": waste_routing(snapshot),
        "heads_flush_phrase": heads_flush_phrase(snapshot),
        "primary_ladder_subtitle": primary_ladder_subtitle(snapshot),
        "life_jackets_location": life_jackets_location(snapshot),
        "fire_extinguishers_location": fire_extinguishers_location(snapshot),
        "first_aid_location": first_aid_location(snapshot),
        "flares_location": flares_location(snapshot),
        "epirb_location": epirb_location(snapshot),
        "grab_bag_location": grab_bag_location(snapshot),
        "throwable_location": throwable_location(snapshot),
        "vhf_dsc_location": vhf_dsc_location(snapshot),
        "hot_water_sentence": hot_water_sentence(snapshot),
        "water_tanks_sentence": water_tanks_sentence(snapshot),
        "autopilot_standby_sentence": autopilot_standby_sentence(snapshot),
        "galley_stove": galley_stove(snapshot),
        "galley_tap_note": galley_tap_note(snapshot),
        "cabin_names_sentence": cabin_names_sentence(snapshot),
        "hatch_notes": hatch_notes(snapshot),
        "lifejacket_policy": lifejacket_policy(snapshot),
        "marina_routine": marina_routine(snapshot),
        "sar_contact_line": sar_contact_line(snapshot),
    }


def guest_fact_gaps(snapshot: dict[str, Any]) -> list[str]:
    """Human sentences for guest facts the owner still needs to fill in.

    Hot water is listed only when a heater is on the registry. The autopilot
    sentence is listed only when the boat has navigation electronics.
    """
    gaps: list[str] = []
    if not life_jackets_location(snapshot):
        gaps.append("Where the life jackets are kept is still blank.")
    if not fire_extinguishers_location(snapshot):
        gaps.append("Where the fire extinguishers are kept is still blank.")
    if not first_aid_location(snapshot):
        gaps.append("Where the first-aid kit is kept is still blank.")
    if not epirb_location(snapshot):
        gaps.append("Where the EPIRB is kept is still blank.")
    if not vhf_dsc_location(snapshot):
        gaps.append("Where the fixed VHF with the distress button is kept is still blank.")
    if has_water_heater(snapshot) and not hot_water_sentence(snapshot):
        gaps.append("Where the hot water comes from is still blank.")
    if (
        has_category(snapshot, "navigation_and_electronics")
        and not autopilot_standby_sentence(snapshot)
    ):
        gaps.append("How to take the helm from the autopilot is still blank.")
    return gaps


def apply_slots(text: str, snapshot: dict[str, Any]) -> str:
    values = slot_values(snapshot)

    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        return values.get(key, match.group(0))

    return _SLOT_RE.sub(replace, text)
