"""Shared guide_context parsing and merge helpers."""

from __future__ import annotations

import json
from typing import Any


def merge_guide_context(
    base_context: dict[str, Any] | None,
    vessel_context: dict[str, Any] | None,
) -> dict[str, Any]:
    """Merge operating-base context with vessel overrides (vessel wins when set)."""
    merged = dict(base_context or {})
    for key, value in (vessel_context or {}).items():
        if value in (None, "", [], {}):
            continue
        merged[key] = value
    return merged


def parse_emergency_contacts(raw: str) -> list[dict[str, Any]]:
    raw = raw.strip()
    if not raw:
        return []
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError("emergencyContacts must be a JSON array.")
    return data


def parse_local_rules(raw: str) -> list[str]:
    return [line.strip() for line in raw.splitlines() if line.strip()]


def parse_swim_ladders(raw: str) -> list[dict[str, str]]:
    """One ladder per line: label | location | deploy (deploy may be empty)."""
    ladders: list[dict[str, str]] = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        parts = [part.strip() for part in line.split("|")]
        if len(parts) < 2 or not parts[1]:
            raise ValueError(
                "Each swim ladder line needs 'label | location' "
                "and an optional '| how to deploy'."
            )
        ladders.append(
            {
                "label": parts[0] or "Boarding ladder",
                "location": parts[1],
                "deploy": parts[2] if len(parts) > 2 else "",
            }
        )
    return ladders


_GALLEY_STOVES = frozenset({"induction", "gas", "electric"})


def parse_cabin_names(raw: str) -> list[str]:
    return [line.strip() for line in raw.splitlines() if line.strip()]


def _store_location(facts: dict[str, Any], key: str, value: str) -> None:
    text = value.strip()
    if text:
        facts[key] = {"location": text}


def _store_text(facts: dict[str, Any], key: str, value: str) -> None:
    text = value.strip()
    if text:
        facts[key] = text


def build_guest_facts(
    *,
    life_raft_location: str = "",
    manual_bilge_location: str = "",
    swim_ladders_text: str = "",
    waste_routing: str = "",
    organic_overboard: bool = False,
    heads_flush_water: str = "",
    shower_pump_switch: str = "",
    hold_to_dim: bool = False,
    has_trampoline: str = "",
    has_jacklines: str = "",
    life_jackets_location: str = "",
    fire_extinguishers_location: str = "",
    first_aid_location: str = "",
    flares_location: str = "",
    epirb_location: str = "",
    grab_bag_location: str = "",
    throwable_location: str = "",
    vhf_dsc_location: str = "",
    hot_water_source: str = "",
    water_tanks_summary: str = "",
    autopilot_standby: str = "",
    galley_stove: str = "",
    cabin_names_text: str = "",
    hatch_notes: str = "",
    lifejacket_policy: str = "",
    moors_stern_to: bool = False,
    marina_routine: str = "",
) -> dict[str, Any]:
    """Vessel handbook facts. Omitted keys keep the shared defaults."""
    facts: dict[str, Any] = {}
    raft = life_raft_location.strip()
    if raft:
        facts["lifeRaft"] = {"location": raft}
    bilge = manual_bilge_location.strip()
    if bilge:
        facts["manualBilge"] = {"location": bilge}
    ladders = parse_swim_ladders(swim_ladders_text)
    if ladders:
        facts["swimLadders"] = ladders
    routing = waste_routing.strip()
    if routing or organic_overboard:
        facts["waste"] = {
            "routing": routing,
            "organicOverboard": bool(organic_overboard),
        }
    flush = heads_flush_water.strip().lower()
    if flush in {"fresh", "sea"}:
        facts["headsFlushWater"] = flush
    elif flush not in {"", "unset", "default"}:
        raise ValueError("Heads flush water must be fresh, sea, or unset.")
    switch = shower_pump_switch.strip()
    if switch and switch != "the switch on the wall":
        facts["showerPumpSwitch"] = switch
    if hold_to_dim:
        facts["holdToDim"] = True
    trampoline = has_trampoline.strip().lower()
    if trampoline == "yes":
        facts["hasTrampoline"] = True
    elif trampoline == "no":
        facts["hasTrampoline"] = False
    elif trampoline not in {"", "default"}:
        raise ValueError("Trampoline must be default, yes, or no.")
    jacklines = has_jacklines.strip().lower()
    if jacklines == "yes":
        facts["hasJacklines"] = True
    elif jacklines == "no":
        facts["hasJacklines"] = False
    elif jacklines not in {"", "default"}:
        raise ValueError("Jacklines must be default, yes, or no.")
    _store_location(facts, "lifeJackets", life_jackets_location)
    _store_location(facts, "fireExtinguishers", fire_extinguishers_location)
    _store_location(facts, "firstAidKit", first_aid_location)
    _store_location(facts, "flares", flares_location)
    _store_location(facts, "epirb", epirb_location)
    _store_location(facts, "grabBag", grab_bag_location)
    _store_location(facts, "throwable", throwable_location)
    _store_location(facts, "vhfDsc", vhf_dsc_location)
    source = hot_water_source.strip()
    if source:
        facts["hotWater"] = {"source": source}
    tanks = water_tanks_summary.strip()
    if tanks:
        facts["waterTanks"] = {"summary": tanks}
    standby = autopilot_standby.strip()
    if standby:
        facts["autopilot"] = {"standby": standby}
    stove = galley_stove.strip().lower()
    if stove in _GALLEY_STOVES:
        facts["galleyStove"] = stove
    elif stove not in {"", "unset", "default"}:
        raise ValueError("Galley stove must be induction, gas, electric, or unset.")
    names = parse_cabin_names(cabin_names_text)
    if names:
        facts["cabinNames"] = names
    _store_text(facts, "hatchNotes", hatch_notes)
    _store_text(facts, "lifejacketPolicy", lifejacket_policy)
    if moors_stern_to:
        facts["moorsSternTo"] = True
    _store_text(facts, "marinaRoutine", marina_routine)
    return facts


def format_swim_ladders(facts: dict[str, Any] | None) -> str:
    ladders = (facts or {}).get("swimLadders") or []
    lines: list[str] = []
    if not isinstance(ladders, list):
        return ""
    for item in ladders:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label") or "").strip()
        location = str(item.get("location") or "").strip()
        deploy = str(item.get("deploy") or "").strip()
        if not location:
            continue
        lines.append(f"{label} | {location} | {deploy}".rstrip())
    return "\n".join(lines)


def _form_location(facts: dict[str, Any], key: str) -> str:
    raw = facts.get(key)
    if isinstance(raw, dict):
        return str(raw.get("location") or "")
    return ""


def _form_nested(facts: dict[str, Any], key: str, field: str) -> str:
    raw = facts.get(key)
    if isinstance(raw, dict):
        return str(raw.get(field) or "")
    return ""


def _form_cabin_names(facts: dict[str, Any]) -> str:
    raw = facts.get("cabinNames")
    if isinstance(raw, str):
        return raw.strip()
    if not isinstance(raw, list):
        return ""
    return "\n".join(str(item).strip() for item in raw if str(item).strip())


def guest_facts_form_values(facts: dict[str, Any] | None) -> dict[str, Any]:
    facts = facts if isinstance(facts, dict) else {}
    waste = facts.get("waste") if isinstance(facts.get("waste"), dict) else {}
    raft = facts.get("lifeRaft") if isinstance(facts.get("lifeRaft"), dict) else {}
    bilge = facts.get("manualBilge") if isinstance(facts.get("manualBilge"), dict) else {}
    trampoline = facts.get("hasTrampoline")
    jacklines = facts.get("hasJacklines")
    flush = str(facts.get("headsFlushWater") or "").strip().lower()
    stove = str(facts.get("galleyStove") or "").strip().lower()
    return {
        "life_raft_location": str(raft.get("location") or ""),
        "manual_bilge_location": str(bilge.get("location") or ""),
        "swim_ladders_text": format_swim_ladders(facts),
        "waste_routing": str(waste.get("routing") or ""),
        "organic_overboard": bool(waste.get("organicOverboard")),
        "heads_flush_water": flush if flush in {"fresh", "sea"} else "",
        "shower_pump_switch": str(facts.get("showerPumpSwitch") or ""),
        "hold_to_dim": bool(facts.get("holdToDim")),
        "has_trampoline": (
            "yes" if trampoline is True else "no" if trampoline is False else "default"
        ),
        "has_jacklines": (
            "yes" if jacklines is True else "no" if jacklines is False else "default"
        ),
        "life_jackets_location": _form_location(facts, "lifeJackets"),
        "fire_extinguishers_location": _form_location(facts, "fireExtinguishers"),
        "first_aid_location": _form_location(facts, "firstAidKit"),
        "flares_location": _form_location(facts, "flares"),
        "epirb_location": _form_location(facts, "epirb"),
        "grab_bag_location": _form_location(facts, "grabBag"),
        "throwable_location": _form_location(facts, "throwable"),
        "vhf_dsc_location": _form_location(facts, "vhfDsc"),
        "hot_water_source": _form_nested(facts, "hotWater", "source"),
        "water_tanks_summary": _form_nested(facts, "waterTanks", "summary"),
        "autopilot_standby": _form_nested(facts, "autopilot", "standby"),
        "galley_stove": stove if stove in _GALLEY_STOVES else "",
        "cabin_names_text": _form_cabin_names(facts),
        "hatch_notes": str(facts.get("hatchNotes") or ""),
        "lifejacket_policy": str(facts.get("lifejacketPolicy") or ""),
        "moors_stern_to": bool(facts.get("moorsSternTo")),
        "marina_routine": str(facts.get("marinaRoutine") or ""),
    }


def build_guide_context_from_form(
    *,
    display_name: str,
    region_label: str,
    marina: str,
    country_code: str,
    timezone: str,
    vessel_callsign: str,
    office_vhf_label: str,
    office_vhf_channel: str,
    office_vhf_hours: str,
    marina_vhf_label: str,
    marina_vhf_channel: str,
    marina_vhf_detail: str,
    emergency_contacts_json: str,
    local_rules_text: str,
    guest_facts: dict[str, Any] | None = None,
) -> dict[str, Any]:
    context = {
        "displayName": display_name.strip(),
        "regionLabel": region_label.strip(),
        "marina": marina.strip(),
        "countryCode": country_code.strip(),
        "timezone": timezone.strip(),
        "vesselCallsign": vessel_callsign.strip(),
        "officeVhf": {
            "label": office_vhf_label.strip(),
            "channel": office_vhf_channel.strip(),
            "hours": office_vhf_hours.strip(),
        },
        "marinaVhf": {
            "label": marina_vhf_label.strip(),
            "channel": marina_vhf_channel.strip(),
            "detail": marina_vhf_detail.strip(),
        },
        "emergencyContacts": parse_emergency_contacts(emergency_contacts_json),
        "localRules": parse_local_rules(local_rules_text),
    }
    if guest_facts:
        context["guestFacts"] = guest_facts
    return context


def emergency_contacts_count(context: dict[str, Any] | None) -> int:
    contacts = (context or {}).get("emergencyContacts")
    return len(contacts) if isinstance(contacts, list) else 0
