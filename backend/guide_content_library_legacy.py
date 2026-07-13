"""Curated content library for hybrid guide modules (home rules, checklists, fix cards).

These modules are mostly standard marine practice plus a handful of
vessel-specific slots (VHF channels, charter contact, vessel name) and
equipment-conditional items. They are assembled deterministically from this
library by default; the LLM path remains available as an explicit
"personalize" opt-in on generation.

Content is generalized from the human-reviewed published Cattitude guide —
vessel-specific locations were removed or made generic, and items that only
apply to certain equipment are gated on the snapshot's equipment categories.
"""

from __future__ import annotations

from typing import Any, Callable

# --- snapshot helpers -------------------------------------------------------

_WATERMAKER_HINTS = ("watermaker", "spectra", "aqua-base", "aquabase", "osmosis")


def _equipment(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    return snapshot.get("equipment") or []


def _has_category(snapshot: dict[str, Any], *categories: str) -> bool:
    wanted = set(categories)
    return any(row.get("system_category") in wanted for row in _equipment(snapshot))


def _has_watermaker(snapshot: dict[str, Any]) -> bool:
    for row in _equipment(snapshot):
        if row.get("system_category") != "freshwater_system":
            continue
        text = f"{row.get('manufacturer') or ''} {row.get('model') or ''}".lower()
        if any(hint in text for hint in _WATERMAKER_HINTS):
            return True
    return False


def _is_sailing(snapshot: dict[str, Any]) -> bool:
    vessel_type = (snapshot.get("vessel") or {}).get("vessel_type") or ""
    return "sailing" in vessel_type or _has_category(
        snapshot, "rigging_sail_handling", "sails"
    )


def _is_twin_engine(snapshot: dict[str, Any]) -> bool:
    propulsion = [
        row
        for row in _equipment(snapshot)
        if row.get("system_category") == "propulsion"
    ]
    if len(propulsion) >= 2:
        return True
    vessel_type = (snapshot.get("vessel") or {}).get("vessel_type") or ""
    return "catamaran" in vessel_type


def _vessel_name(snapshot: dict[str, Any]) -> str:
    return (snapshot.get("vessel") or {}).get("name") or "the vessel"


def _company_name(snapshot: dict[str, Any]) -> str:
    return (snapshot.get("charter_company") or {}).get("name") or ""


def _office_vhf(snapshot: dict[str, Any]) -> dict[str, str]:
    vhf = (snapshot.get("guide_context") or {}).get("officeVhf") or {}
    return {
        "label": (vhf.get("label") or "").strip(),
        "channel": (vhf.get("channel") or "").strip(),
        "hours": (vhf.get("hours") or "").strip(),
    }


def _contact_step(snapshot: dict[str, Any]) -> str:
    """Standard 'call for help' step, slot-filled from guide context."""
    company = _company_name(snapshot)
    vhf = _office_vhf(snapshot)
    if company and vhf["channel"]:
        hours = f" ({vhf['hours']})" if vhf["hours"] else ""
        return (
            f"Contact {company} — {vhf['channel']} during office hours{hours}, "
            "or use the emergency contacts on the Home tab"
        )
    if company:
        return f"Contact {company} — see emergency contacts on the Home tab"
    return "If you cannot resolve it, use the emergency contacts on the Home tab"


# --- home rules -------------------------------------------------------------

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


def build_home_rules_module(
    snapshot: dict[str, Any], reference: Any = None
) -> list[dict[str, Any]]:
    context = snapshot.get("guide_context") or {}
    local_rules = [
        rule.strip()
        for rule in context.get("localRules") or []
        if isinstance(rule, str) and rule.strip()
    ]
    local_lower = " ".join(local_rules).lower()

    danger_rules: list[dict[str, Any]] = []
    caution_rules: list[dict[str, Any]] = []
    good_rules: list[dict[str, Any]] = []

    for rule_text in local_rules:
        entry = {
            "icon": _local_rule_icon(rule_text),
            "tone": _local_rule_tone(rule_text),
            "text": rule_text,
        }
        (danger_rules if entry["tone"] == "danger" else caution_rules).append(entry)

    if _has_category(snapshot, "sanitation") and "toilet" not in local_lower:
        danger_rules.append(
            {
                "icon": "🚽",
                "tone": "danger",
                "text": (
                    "Never put ANYTHING in the toilet except human waste — no toilet "
                    "paper, no wipes, no paper towels. Paper goes in the bin."
                ),
            }
        )
    if (
        _has_category(snapshot, "navigation_electronics")
        and "autopilot" not in local_lower
    ):
        danger_rules.append(
            {
                "icon": "🛞",
                "tone": "danger",
                "text": (
                    "Never leave the helm unattended with autopilot on in traffic, "
                    "channels, or near shore"
                ),
            }
        )

    if "vhf" not in local_lower and "ch 16" not in local_lower:
        vhf = _office_vhf(snapshot)
        company = _company_name(snapshot)
        text = "Always monitor VHF Ch 16 underway"
        if company and vhf["channel"]:
            hours = f" ({vhf['hours']})" if vhf["hours"] else ""
            text += f" — call {company} on {vhf['channel']} during office hours{hours}"
        caution_rules.append({"icon": "📻", "tone": "caution", "text": text})
    caution_rules.append(
        {
            "icon": "🛟",
            "tone": "caution",
            "text": "Run the Safety Briefing with all guests before every departure",
            "link": "/tabs/do/checklist/safety-brief",
        }
    )
    if _has_category(snapshot, "electrical_dc"):
        caution_rules.append(
            {
                "icon": "🔋",
                "tone": "caution",
                "text": (
                    "Check house battery state of charge morning and evening — "
                    "charge before it gets low, not after"
                ),
            }
        )

    if _has_category(snapshot, "refrigeration_galley"):
        good_rules.append(
            {
                "icon": "🧊",
                "tone": "good",
                "text": (
                    "Minimise fridge/freezer door openings — refrigeration is your "
                    "biggest continuous power draw"
                ),
            }
        )
    if _has_category(snapshot, "freshwater_system"):
        good_rules.append(
            {
                "icon": "💧",
                "tone": "good",
                "text": "Treat fresh water as precious — short showers, taps off while soaping",
            }
        )

    sections = [
        {"title": "⛔ Never Do This", "tone": "danger", "rules": danger_rules},
        {"title": "⚠️ Always Do This", "tone": "caution", "rules": caution_rules},
        {"title": "✅ Good Habits", "tone": "good", "rules": good_rules},
    ]
    return [section for section in sections if section["rules"]]


# --- checklists -------------------------------------------------------------


def _item(c: str, s: str = "") -> dict[str, str]:
    return {"c": c, "s": s}


def _group(title: str, items: list[dict[str, str]]) -> dict[str, Any] | None:
    return {"t": title, "items": items} if items else None


def _groups(*groups: dict[str, Any] | None) -> dict[str, Any]:
    return {"groups": [group for group in groups if group]}


def _build_safety_brief(snapshot: dict[str, Any]) -> dict[str, Any]:
    vessel = _vessel_name(snapshot)
    has_nav = _has_category(snapshot, "navigation_electronics")
    has_engines = _has_category(snapshot, "propulsion")
    vhf = _office_vhf(snapshot)
    company = _company_name(snapshot)

    vhf_items = [
        _item(
            "Show guests where the VHF radio is located",
            "Confirm everyone can find and switch on the radio without help.",
        ),
        _item(
            "Explain Channel 16: primary distress channel — always monitored. "
            "Say MAYDAY here first."
        ),
    ]
    if company and vhf["channel"]:
        hours = f" during office hours ({vhf['hours']})" if vhf["hours"] else ""
        vhf_items.append(
            _item(f"Explain {vhf['channel']}: {company} working channel{hours}")
        )
    vhf_items.append(
        _item(
            "Run through the MAYDAY procedure verbally",
            f"MAYDAY x3 · This is {vessel} x3 · MAYDAY {vessel} · Position · "
            "Nature of distress · Assistance required · Persons on board · Over",
        )
    )

    mob_items = [
        _item('Explain MOB call — shout "MAN OVERBOARD" immediately'),
        _item(
            "Assign one person to keep eyes on the person in the water at all "
            "times — point continuously, never look away",
            "This is the most important job. Do not stop pointing.",
        ),
    ]
    if has_nav:
        mob_items.append(
            _item(
                "Show the SOS/MOB button on the chartplotter — press immediately "
                "to mark position"
            )
        )
    mob_items.extend(
        [
            _item(
                "Explain recovery manoeuvre: slow down, circle back, approach "
                "from downwind",
                "Engine on immediately. Approach slowly from the downwind side.",
            ),
            _item("Show the boarding ladder location and how to deploy it"),
            _item(
                "Show the throwable buoy / horseshoe buoy location",
                "Throw immediately on MOB.",
            ),
        ]
    )

    fire_items = [
        _item('Explain fire drill: shout "FIRE", locate source, grab extinguisher'),
    ]
    if has_engines:
        fire_items.append(
            _item(
                "For an engine compartment fire: do NOT open the hatch — use the "
                "fire port / extinguisher outlet if fitted",
                "Opening the hatch feeds oxygen to the fire.",
            )
        )
    fire_items.append(
        _item(
            "If fire cannot be controlled: MAYDAY, prepare to abandon ship",
            "Life raft, EPIRB, flares, water, VHF.",
        )
    )

    return _groups(
        _group(
            "Life Jackets",
            [
                _item(
                    "Show guests where life jackets are stored",
                    "One per person plus spares.",
                ),
                _item("Demonstrate how to put on a life jacket"),
                _item("Confirm one life jacket per person on board"),
            ],
        ),
        _group(
            "Emergency Equipment Locations",
            [
                _item(
                    "Show flare kit location",
                    "Red parachute = night. Orange smoke = day.",
                ),
                _item("Show fire extinguisher locations"),
                _item("Show life raft location and how to release it"),
                _item(
                    "Show EPIRB location",
                    "Only activate in a genuine life-threatening emergency.",
                ),
                _item("Show first aid kit location"),
            ],
        ),
        _group(
            "Emergency Hatches & Escape",
            [
                _item(
                    "Warn guests: do not walk on deck hatches or solar panels",
                    "Hatches can crack or open unexpectedly under weight.",
                ),
                _item(
                    "Point out all companionway and deck hatch exits",
                    "In a flooding situation these are your exit routes.",
                ),
                _item(
                    "Show guests how to open hatches from inside",
                    "Confirm each guest can operate them independently.",
                ),
                _item(
                    '"One hand for you, one for the boat" — always',
                    "Keep one hand holding a fixed part of the boat when moving "
                    "around, especially on deck or in a seaway. Move deliberately, "
                    "never rush.",
                ),
            ],
        ),
        _group("Man Overboard (MOB)", mob_items),
        _group("Fire", fire_items),
        _group("VHF & Communications", vhf_items),
    )


def _build_pre_departure(snapshot: dict[str, Any]) -> dict[str, Any]:
    has_engines = _has_category(snapshot, "propulsion")
    twin = _is_twin_engine(snapshot)
    has_windlass = _has_category(snapshot, "anchoring_ground_tackle")
    has_dc = _has_category(snapshot, "electrical_dc")
    has_nav = _has_category(snapshot, "navigation_electronics")
    has_water = _has_category(snapshot, "freshwater_system")
    has_heads = _has_category(snapshot, "sanitation")

    both = "both engines" if twin else "the engine"
    compartments = "engine compartments" if twin else "engine compartment"

    engine_items = []
    if has_engines:
        engine_items = [
            _item(
                f"Engine circuit breakers connected — {compartments}",
            ),
            _item(
                f"Raw water seacocks OPEN on {both}",
                "Handle parallel to pipe = open",
            ),
            _item(f"Oil levels checked — {both}", "Dipstick between MIN and MAX"),
            _item(
                f"No fuel smell or gas vapour in {compartments}",
                "Sniff-test before closing hatches",
            ),
        ]
        if has_windlass:
            engine_items.insert(
                1, _item("Windlass circuit breaker confirmed ON")
            )

    panel_items = []
    if has_dc:
        if has_nav:
            panel_items.append(
                _item(
                    "Navigation electronics switched on",
                    "Chartplotter, VHF, AIS, instruments",
                )
            )
        panel_items.extend(
            [
                _item(
                    "Bilge pump switches in AUTO position",
                    "Must always be on AUTO — never manual or off",
                ),
                _item("Water and fuel levels checked on panel gauges"),
            ]
        )

    fuel_items = []
    if has_engines:
        fuel_items.append(
            _item("Fuel levels checked", "Never depart below 1/4 tank")
        )
    if has_water:
        fuel_items.append(
            _item(
                "Fresh water level checked",
                "Fill if below 1/2 tank for longer passages",
            )
        )

    helm_items = [
        _item("Navigation lights tested", "Required before any night departure"),
        _item(
            "Mobile items secured — cockpit cushions, loose gear",
            "Strong wind launches items overboard easily",
        ),
        _item("Fenders retrieved and stowed", "Do not motor with fenders hanging"),
        _item(
            "All dock lines aboard and stowed",
            "Confirm all lines aboard before leaving the slip",
        ),
    ]
    if has_heads:
        helm_items.append(
            _item(
                "Brief ALL guests on the toilet rule: NOTHING goes in the head "
                "except human waste — paper in the bin",
                "This is the most common and most expensive charter problem",
            )
        )
    helm_items.append(
        _item(
            "Safety Briefing completed with all guests",
            "Use the Safety Briefing checklist in the Do tab — cover life "
            "jackets, MOB, fire, and emergency exits",
        )
    )
    if has_engines:
        helm_items.append(
            _item(
                f"{'Both engines' if twin else 'Engine'} started — raw water "
                "confirmed from exhaust",
                "Confirm within 30 seconds of starting",
            )
        )

    return _groups(
        _group(
            "Below Deck",
            [
                _item(
                    "Close all hull portholes and deck hatches",
                    "Safety hatches must never be open when sailing",
                ),
                _item(
                    "Check bilges empty",
                    "A small amount of water is normal; an oil sheen or rising "
                    "water is not",
                ),
                _item(
                    "Life raft confirmed accessible and secured",
                    "Must be able to deploy freely from its mount",
                ),
                _item(
                    "Unlock all doors and lockers",
                    "Nothing should jam shut once underway",
                ),
            ],
        ),
        _group(
            f"Engine {'Compartments — Both' if twin else 'Compartment'}",
            engine_items,
        ),
        _group("Electrical Panel", panel_items),
        _group("Fuel & Water", fuel_items),
        _group("Helm & Cast Off", helm_items),
    )


def _build_anchoring(snapshot: dict[str, Any]) -> dict[str, Any]:
    has_windlass = _has_category(snapshot, "anchoring_ground_tackle")
    has_nav = _has_category(snapshot, "navigation_electronics")
    has_engines = _has_category(snapshot, "propulsion")

    setting_items = []
    if has_windlass:
        setting_items.append(_item("Windlass DC breaker ON"))
    setting_items.extend(
        [
            _item(
                "Anchor lowered under control to the seabed",
                "Lower slowly as the boat moves upwind over the spot — do not drop",
            ),
            _item("Chain paid out to near final scope length"),
            _item(
                "Snubber or bridle attached and taking the load",
                "The snubber/bridle takes the load, not the windlass",
            ),
        ]
    )
    if has_engines:
        setting_items.append(
            _item(
                "Backed down gently in reverse for 30 seconds",
                "This sets the anchor. Watch fixed references — no dragging.",
            )
        )

    confirmed_items = [
        _item("Position checked against 2+ fixed references on shore"),
    ]
    if has_nav:
        confirmed_items.append(
            _item(
                "Anchor alarm set on chartplotter",
                "Radius = scope length + boat length",
            )
        )
    if has_engines:
        confirmed_items.append(_item("Engines off"))
    confirmed_items.append(
        _item(
            "Anchor light on if staying after sunset",
            "All-round white light — required by law",
        )
    )

    return _groups(
        _group(
            "Choosing a Spot",
            [
                _item(
                    "Holding ground confirmed on chart and visually",
                    "Sand is best. Avoid coral, rock, and thick seagrass.",
                ),
                _item(
                    "Sufficient swinging room assessed",
                    "Account for wind shifts and scope. Check other boats' "
                    "swing radius.",
                ),
                _item(
                    "Depth noted — scope required calculated",
                    "5:1 minimum. Depth x 5 = minimum chain length.",
                ),
            ],
        ),
        _group("Setting the Anchor", setting_items),
        _group("Confirmed at Anchor", confirmed_items),
    )


def _build_leaving_unattended(snapshot: dict[str, Any]) -> dict[str, Any]:
    has_ac_power = _has_category(snapshot, "electrical_ac_shore_power")
    has_hvac = _has_category(snapshot, "hvac_climate")
    has_watermaker = _has_watermaker(snapshot)
    has_water = _has_category(snapshot, "freshwater_system")
    has_dinghy = _has_category(snapshot, "tenders_davits")
    has_nav = _has_category(snapshot, "navigation_electronics")

    power_items = [
        _item(
            "Non-essential DC breakers off",
            "Leave: fridge ON, bilge pumps AUTO, anchor light if night",
        ),
    ]
    if has_ac_power:
        power_items.append(
            _item("Generator and inverter off", "Confirm both shut down")
        )
    if has_hvac:
        power_items.append(_item("Air conditioning off"))
    if has_watermaker:
        power_items.append(_item("Watermaker off"))

    water_items = []
    if has_water:
        water_items.append(
            _item(
                "Fresh water pressure pump off",
                "Prevents pumping the tanks dry if a hose fails while you're ashore",
            )
        )

    security_items = [
        _item(
            "All hatches closed and secured",
            "Squalls can arrive fast — never leave hatches open",
        ),
    ]
    if has_dinghy:
        security_items.append(
            _item("Dinghy secured — davits/platform raised fully, straps buckled")
        )
    security_items.append(
        _item(
            "Loose items stowed below or in lockers",
            "Cushions, fishing rods, gear — all away",
        )
    )
    security_items.append(
        _item("VHF off", "No point monitoring Ch 16 with no one aboard to hear it")
    )
    if has_nav:
        security_items.append(
            _item("Chartplotter off", "The anchor alarm serves no purpose with no one aboard")
        )

    return _groups(
        _group("Power & Systems", power_items),
        _group("Water", water_items),
        _group("Security", security_items),
    )


def _build_end_of_charter(snapshot: dict[str, Any]) -> dict[str, Any]:
    vessel = _vessel_name(snapshot)
    company = _company_name(snapshot) or "the charter company"
    has_heads = _has_category(snapshot, "sanitation")
    has_engines = _has_category(snapshot, "propulsion")
    has_shore = _has_category(snapshot, "electrical_ac_shore_power")

    final_day_items = []
    if has_heads:
        final_day_items = [
            _item(
                "Pump out holding tanks before returning — empty all heads",
                "Do not return to the marina with full or partially full "
                "holding tanks",
            ),
        ]

    slip_items = [
        _item(
            "Fenders deployed before entering the marina",
            "One per side minimum, height adjusted for the dock",
        ),
        _item(
            "Dock lines prepared — bow, stern, and springs",
            "Crew ready with lines before final approach",
        ),
    ]
    if has_shore:
        slip_items.append(
            _item("Shore power connected", "Roll the cable out fully before plugging in")
        )
    if has_engines:
        slip_items.append(
            _item("Engines shut down after idling 3-5 minutes")
        )

    handback_items = [
        _item("All DC breakers off except bilge pumps (AUTO)"),
        _item("Fresh water pump off"),
        _item("All hatches secured"),
        _item(
            "Inventory checked — all gear accounted for",
            "Life jackets, flare kit, snorkel gear, charts",
        ),
        _item(
            "Boat cleaned — interior and cockpit",
            f"Leave {vessel} as you found her",
        ),
        _item(
            f"Any damage noted and reported to {company}",
            "Report before departure — do not wait until the handover",
        ),
        _item(f"Complete and sign all charter sign-off documents with {company}"),
    ]

    return _groups(
        _group("Final Day at Sea", final_day_items),
        _group("Returning to Slip", slip_items),
        _group("Shut Down & Hand Back", handback_items),
    )


_CHECKLIST_BUILDERS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "safety-brief": _build_safety_brief,
    "pd": _build_pre_departure,
    "anch": _build_anchoring,
    "lu": _build_leaving_unattended,
    "ec": _build_end_of_charter,
}


# --- fix cards ---------------------------------------------------------------


def build_fix_cards_module(
    snapshot: dict[str, Any], reference: Any = None
) -> list[dict[str, Any]]:
    contact = _contact_step(snapshot)
    cards: list[dict[str, Any]] = []

    if _has_category(snapshot, "propulsion"):
        cards.append(
            {
                "icon": "🔴",
                "cat": "engine",
                "catL": "Engine",
                "title": "Engine won't start",
                "key": "engine_wont_start",
                "steps": [
                    "Confirm raw water seacock OPEN (handle parallel to pipe) in "
                    "the engine compartment",
                    "Check the engine circuit breaker is ON in the engine compartment",
                    "Confirm the engine battery switch is on and voltage is above 12.0V",
                    "Confirm throttle is in neutral before starting",
                    "Never crank more than 10 seconds — risk of water in the exhaust",
                    contact,
                ],
            }
        )
        cards.append(
            {
                "icon": "⚠️",
                "cat": "engine",
                "catL": "Engine",
                "title": "Engine overheating alarm",
                "key": "engine_overheating",
                "steps": [
                    "IMMEDIATELY reduce RPM"
                    + (
                        " — switch to the other engine if possible"
                        if _is_twin_engine(snapshot)
                        else ""
                    ),
                    "Check raw water flow from the exhaust — must be a continuous stream",
                    "Check the raw water strainer for blockage — clear if needed",
                    "Confirm the raw water seacock is fully open",
                    "No water from the exhaust = impeller failed — do not run the engine",
                    "Do not restart until water flow is confirmed",
                    contact,
                ],
            }
        )

    if _has_category(snapshot, "sanitation"):
        cards.append(
            {
                "icon": "🚽",
                "cat": "plumbing",
                "catL": "Plumbing",
                "title": "Toilet won't flush",
                "key": "toilet_wont_flush",
                "steps": [
                    "Check the circuit breaker for that head at the main panel — "
                    "reset if tripped",
                    "Confirm the fresh water pump is on",
                    "Hold the flush switch for a full 10+ second cycle",
                    "Check for blockage — almost always caused by paper products "
                    "or foreign objects",
                    "Do NOT try to disassemble the toilet",
                    "REMINDER: Nothing goes in the head except human waste — "
                    "no TP, no wipes, ever",
                    contact,
                ],
            }
        )
        cards.append(
            {
                "icon": "🪣",
                "cat": "plumbing",
                "catL": "Plumbing",
                "title": "Holding tank full / toilet smell",
                "key": "holding_tank_full",
                "steps": [
                    "If at a marina: pump out via the waste deck fitting",
                    "If offshore in deep water where discharge is permitted: open "
                    "the evacuation valve, close immediately when done",
                    "Do not force the pump if the tank is truly full",
                    "Flush with several cycles after the tank is emptied",
                    contact,
                ],
            }
        )

    if _has_category(snapshot, "freshwater_system"):
        cards.append(
            {
                "icon": "💧",
                "cat": "plumbing",
                "catL": "Plumbing",
                "title": "No fresh water at taps",
                "key": "no_fresh_water",
                "steps": [
                    "Check the fresh water pump DC breaker at the main panel",
                    "Check the fresh water tank level — tanks may be empty",
                    "Turn the pressure pump switch off and back on to reset",
                    contact,
                ],
            }
        )
    if _has_watermaker(snapshot):
        cards.append(
            {
                "icon": "🌊",
                "cat": "plumbing",
                "catL": "Plumbing",
                "title": "Watermaker not producing / poor water quality",
                "key": "watermaker",
                "steps": [
                    "Check the watermaker breaker at the panel is ON",
                    "Confirm sufficient power — most watermakers need the "
                    "generator or strong charge",
                    "Check the salinity indicator — if reading high, do not send "
                    "water to the tanks",
                    "Confirm you are in clean, deep, open water — not shallow, "
                    "sandy, or near a marina",
                    "If the unit runs but salinity stays high: stop it — membranes "
                    "may be contaminated",
                    contact,
                ],
            }
        )

    if _has_category(snapshot, "electrical_dc"):
        cards.append(
            {
                "icon": "⚡",
                "cat": "electrical",
                "catL": "Electrical",
                "title": "Something stopped working",
                "key": "something_stopped",
                "steps": [
                    "Find the breaker for that circuit at the main DC panel",
                    "Switch it fully OFF then back ON to reset",
                    "If the breaker trips again immediately: fault — leave it off",
                    "Check battery voltage — when low, some systems auto-shut off",
                    contact,
                ],
            }
        )
        cards.append(
            {
                "icon": "🪫",
                "cat": "electrical",
                "catL": "Electrical",
                "title": "Low battery",
                "key": "low_battery",
                "steps": [
                    "Turn off all high-draw loads: AC units, electric cooking, "
                    "watermaker, microwave",
                    "Start the engine(s) and run at fast idle until the house bank "
                    "recovers",
                    "If fitted, run the generator or connect shore power to charge",
                    "Do not run high-draw loads again until the bank has recovered",
                    "If the bank will not hold charge: possible battery fault — "
                    + contact,
                ],
            }
        )

    if _has_category(snapshot, "refrigeration_galley"):
        cards.append(
            {
                "icon": "🧊",
                "cat": "electrical",
                "catL": "Electrical",
                "title": "Fridge not cooling",
                "key": "fridge_not_cooling",
                "steps": [
                    "Check the DC breaker for that fridge at the main panel",
                    "Check battery voltage — fridges auto-shut off when the bank is low",
                    "Confirm the thermostat is not set to the warmest setting",
                    "Check the fridge fan is running — feel for airflow at the vents",
                    "Keep the door closed — allow 30 minutes to recover after "
                    "power is restored",
                    contact,
                ],
            }
        )

    if _is_sailing(snapshot):
        cards.append(
            {
                "icon": "⛵",
                "cat": "sails",
                "catL": "Sails",
                "title": "Headsail won't furl",
                "key": "headsail_wont_furl",
                "steps": [
                    "Check the furling line is not fouled on a cleat, winch, or jammer",
                    "Reduce sheet tension — but keep some pressure on the sail for "
                    "a clean furl",
                    "Do NOT force — a heavily loaded sail cannot furl against full "
                    "wind pressure",
                    "Head slightly into the wind to reduce pressure, then pull the "
                    "furling line steadily",
                    "Check the furling drum at the bow for line tangles",
                    contact,
                ],
            }
        )

    if _has_category(snapshot, "navigation_electronics"):
        cards.append(
            {
                "icon": "🧭",
                "cat": "nav",
                "catL": "Navigation",
                "title": "Autopilot not holding course",
                "key": "autopilot",
                "steps": [
                    "Confirm the autopilot is properly engaged — display should "
                    "show a hold mode",
                    "Check no large metal objects are near the compass sensor",
                    "Disengage and re-engage — sometimes resets drift",
                    contact,
                ],
            }
        )
    if _has_category(snapshot, "communications", "navigation_electronics"):
        cards.append(
            {
                "icon": "📻",
                "cat": "nav",
                "catL": "Navigation",
                "title": "VHF not transmitting",
                "key": "vhf_not_transmitting",
                "steps": [
                    "Check the DC breaker for the VHF at the main panel",
                    "Confirm volume is up and squelch is not fully closed",
                    "Try a radio check on a working channel",
                    "Check the antenna connection at the back of the radio",
                    "Report a non-functioning fixed VHF immediately — " + contact,
                ],
            }
        )

    if _has_category(snapshot, "anchoring_ground_tackle"):
        cards.append(
            {
                "icon": "⚓",
                "cat": "general",
                "catL": "General",
                "title": "Windlass not working",
                "key": "windlass",
                "steps": [
                    "Check the windlass circuit breaker — reset if tripped",
                    "Never run the windlass continuously more than 60 seconds — "
                    "allow the motor to cool between runs",
                    "Check the remote/switch connection is plugged in and undamaged",
                    "Start an engine — the windlass draws high current and a low "
                    "battery will kill it",
                    contact,
                ],
            }
        )

    if _has_category(snapshot, "hvac_climate"):
        cards.append(
            {
                "icon": "❄️",
                "cat": "electrical",
                "catL": "Electrical",
                "title": "Air conditioning not working",
                "key": "ac_not_working",
                "steps": [
                    "Confirm AC power is available — shore power or generator running",
                    "Confirm the seawater cooling pump is running — AC units need "
                    "seawater flow or they are destroyed",
                    "Check the AC circuit breaker on the electrical panel",
                    "Do not run all units simultaneously on generator — it may overload",
                    contact,
                ],
            }
        )

    # Applies to every vessel regardless of configured equipment.
    cards.append(
        {
            "icon": "🌊",
            "cat": "plumbing",
            "catL": "Plumbing",
            "title": "Bilge alarm going off",
                "key": "bilge_alarm",
            "steps": [
                "Identify which bilge compartment is alarming",
                "Confirm the bilge pump switch is in AUTO — the alarm triggers "
                "when water rises",
                "Look for the water source: raw water hose, seacock leak, shaft seal",
                "A small amount of water can be normal — confirm the pump has activated",
                "If water is rising rapidly: identify the source — consider MAYDAY "
                "on Ch 16 if uncontrolled",
                contact,
            ],
        }
    )

    return cards


def _make_checklist_builder(
    checklist_id: str,
) -> Callable[[dict[str, Any], Any], dict[str, Any]]:
    def _builder(snapshot: dict[str, Any], reference: Any = None) -> dict[str, Any]:
        return _CHECKLIST_BUILDERS[checklist_id](snapshot)

    return _builder


# Hybrid modules: assembled from this library by default; LLM on explicit
# "personalize" opt-in.
LIBRARY_MODULE_BUILDERS: dict[
    tuple[str, str], Callable[[dict[str, Any], Any], dict[str, Any]]
] = {
    ("ui", "homeRuleSections"): build_home_rules_module,
    ("fix_card_set", "all"): build_fix_cards_module,
    **{
        ("checklist", checklist_id): _make_checklist_builder(checklist_id)
        for checklist_id in _CHECKLIST_BUILDERS
    },
}
