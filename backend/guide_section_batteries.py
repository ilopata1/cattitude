"""Stage 4 Batteries & Energy — house bank home chapter (v4.17 / B&E v3).

Uses ``assemble_section_inputs`` depths:
  full — MLI, Combi, MPPTs, Silentwind, Alphas (section members)
  provenance — COIs / MasterBus bridge (never named in body)

Applies global composition spine (spec v4.15–v4.17). Solar array depth stays in
the Solar leaf; CZone station path → xref Controls (once); isolation → xref
Electrical in ``reference``.
"""

from __future__ import annotations

import re
from typing import Any

from guide_composition_rules import (
    SECTION_SPINE,
    WISDOM_FILLED,
    WISDOM_PENDING,
    action_has_sourced_occasion,
    assess_global_composition,
    normalize_block,
)
from guide_reader_voice import (
    VesselNameMissing,
    assess_reader_voice_style,
    format_section_xref,
    resolve_vessel_display_name,
    section_xref_link,
)
from guide_section_solar import (
    flag_reader_relevance,
    lint_absence_prose,
    lint_prose_economy,
    lint_reader_vocabulary,
)
from section_inputs import (
    DEPTH_FULL,
    DEPTH_PROVENANCE,
    assemble_section_inputs,
    keys_at_depth,
)
from system_graph import VesselGraphResult

SECTION_ORDER = SECTION_SPINE

DISPLAY_NAMES: dict[str, str] = {
    "mli_ultra": "the house batteries",
    "mli_ultra_1": "house battery 1",
    "mli_ultra_2": "house battery 2",
    "mli_ultra_3": "house battery 3",
    "mass_combi_pro": "the inverter-chargers",
    "mass_combi_pro_1": "the port inverter-charger",
    "mass_combi_pro_2": "the starboard inverter-charger",
    "victron_mppt_150_60": "the davit array controller",
    "victron_mppt": "the coachroof array controllers",
    "silentwind": "the wind generator",
    "alpha_pro_iii": "the alternator regulators",
    "alpha_pro_iii_port": "the port alternator regulator",
    "alpha_pro_iii_stbd": "the starboard alternator regulator",
    "fischer_panda_8000i": "the generator",
}

MANUFACTURER_MODEL: dict[str, tuple[str, str]] = {
    "mli_ultra": ("Mastervolt", "MLI Ultra"),
    "mli_ultra_1": ("Mastervolt", "MLI Ultra"),
    "mli_ultra_2": ("Mastervolt", "MLI Ultra"),
    "mli_ultra_3": ("Mastervolt", "MLI Ultra"),
    "mass_combi_pro": ("Mastervolt", "Mass Combi Pro"),
    "mass_combi_pro_1": ("Mastervolt", "Mass Combi Pro"),
    "mass_combi_pro_2": ("Mastervolt", "Mass Combi Pro"),
    "victron_mppt_150_60": ("Victron", "SmartSolar MPPT 150/60"),
    "victron_mppt": ("Victron", "SmartSolar MPPT 75/15"),
    "silentwind": ("Silentwind", "Hybrid 1000"),
    "alpha_pro_iii": ("Mastervolt", "Alpha Pro III"),
    "alpha_pro_iii_port": ("Mastervolt", "Alpha Pro III"),
    "alpha_pro_iii_stbd": ("Mastervolt", "Alpha Pro III"),
    "fischer_panda_8000i": ("Fischer Panda", "Panda 8000i"),
}

_FORBIDDEN_EXTRA = (
    re.compile(r"\bmasterbus_bridge_interface\b", re.I),
    re.compile(r"\bcoi\b", re.I),
    re.compile(r"\bmasteradjust\b", re.I),
    re.compile(r"\bdip.?switch\b", re.I),
    re.compile(r"\bpole pairs?\b", re.I),
    re.compile(r"\bbattery temperature sensor\b", re.I),
    re.compile(r"\bprotective status\b", re.I),
)

_INSTALL_LEAK_RES = (
    re.compile(r"dip.?switch", re.I),
    re.compile(r"install the battery temperature", re.I),
    re.compile(r"shore inlet wiring", re.I),
    re.compile(r"\bmasteradjust\b", re.I),
    re.compile(r"set the number of pole pairs", re.I),
)

_SIDE_SUFFIX_RE = re.compile(r"_(port|stbd)$", re.I)


def _catalog_base(key: str) -> str:
    base = re.sub(r"_\d+$", "", key)
    return _SIDE_SUFFIX_RE.sub("", base)


def compose_batteries_section(
    *,
    graph: VesselGraphResult,
    profiles: dict[str, dict[str, Any]],
    equipment_doc: dict[str, Any],
    section_inputs: dict[str, Any] | None = None,
    allow_planted_expectation: bool = True,
) -> dict[str, Any]:
    """Compose Batteries & Energy v2 for the vessel."""
    boat = resolve_vessel_display_name(equipment_doc)
    inputs = section_inputs or assemble_section_inputs(
        graph, "batteries", equipment_doc=equipment_doc
    )

    full_keys = keys_at_depth(inputs, DEPTH_FULL)
    provenance_keys = keys_at_depth(inputs, DEPTH_PROVENANCE)

    mli_keys = [k for k in full_keys if k.startswith("mli_ultra")]
    combi_keys = [k for k in full_keys if "combi" in k]
    mppt_keys = [k for k in full_keys if "mppt" in k or k.startswith("victron_mppt")]
    alpha_keys = [k for k in full_keys if "alpha" in k]
    genset_keys = [k for k in full_keys if "fischer_panda" in k]
    has_silentwind = "silentwind" in full_keys

    first_use: set[str] = set()
    provenance_map: list[dict[str, Any]] = []
    block_order: list[str] = []
    context_shaping_consumed: list[dict[str, Any]] = []

    def _name(key: str, *, quantity: int | None = None) -> str:
        base = _catalog_base(key)
        mm = MANUFACTURER_MODEL.get(key) or MANUFACTURER_MODEL.get(base)
        if quantity and quantity > 1 and base in {
            "mli_ultra",
            "mass_combi_pro",
            "alpha_pro_iii",
        }:
            if key not in first_use and base not in first_use:
                first_use.add(key)
                first_use.add(base)
                role = DISPLAY_NAMES.get(base) or "the devices"
                bare = role.removeprefix("the ")
                if mm:
                    return f"{quantity} {bare} ({mm[0]} {mm[1]})"
                return f"{quantity} {bare}"
            return DISPLAY_NAMES.get(base) or "the devices"
        role = DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or "the device"
        if key not in first_use and base not in first_use:
            first_use.add(key)
            first_use.add(base)
            if mm:
                return f"{role} ({mm[0]} {mm[1]})"
            return role
        return role

    def _emit(
        text: str,
        *sources: str,
        kind: str = "sourced",
        block: str = "capability_summary",
        planted_expectation: bool = False,
        links: list[dict[str, str]] | None = None,
        contributing_facts: list[str] | None = None,
    ) -> str:
        sid = f"S{len(provenance_map) + 1}"
        if planted_expectation:
            if not allow_planted_expectation:
                raise ValueError("planted_expectation not allowed")
            kind = "planted_expectation"
        elif kind != "composed_inference" and text.strip():
            abs_hits = lint_absence_prose(text)
            if abs_hits:
                raise ValueError(
                    f"absence prose forbidden on {sid!r}: {abs_hits} in {text!r}"
                )

        if text.strip():
            hits = lint_reader_vocabulary(text)
            for rx in _FORBIDDEN_EXTRA:
                if rx.search(text):
                    hits.append(rx.pattern)
            if hits:
                raise ValueError(f"vocabulary lint failed on {sid!r}: {hits}")
            economy = lint_prose_economy(text)
            for kind_name, econ_hits in economy.items():
                if econ_hits:
                    raise ValueError(
                        f"prose economy ({kind_name}) failed on {sid!r}: {econ_hits}"
                    )

        entry: dict[str, Any] = {
            "id": sid,
            "sentence": text,
            "sources": list(sources),
            "kind": kind,
            "block": block,
        }
        if planted_expectation:
            entry["planted_expectation"] = True
        if kind == "composed_inference":
            entry["composed_inference"] = True
            entry["contributing_facts"] = list(contributing_facts or [])
        if links:
            entry["links"] = list(links)
        provenance_map.append(entry)
        if text.strip() and block not in block_order:
            block_order.append(block)
        return sid

    dropped_wisdom: list[dict[str, str]] = []

    for flag in inputs.get("flags") or []:
        fname = str(flag.get("flag") or "")
        if flag_reader_relevance(fname) == "context_shaping":
            context_shaping_consumed.append(dict(flag))

    controls_xref = format_section_xref("controls")
    electrical_xref = format_section_xref("electrical")

    # ========== IDENTITY (same breath: identity + capacity) ==========
    if mli_keys:
        n = len(mli_keys)
        n_word = {1: "one", 2: "two", 3: "three"}.get(n, str(n))
        _emit(
            f"On {boat}, the house bank is {n_word} house batteries "
            f"(Mastervolt MLI Ultra 24/6000), about {n * 6} kWh together.",
            *[f"graph.device:{k}" for k in mli_keys],
            "vessel.display_name",
            "profile.mli_ultra.device.model",
            "equipment.mli_ultra.quantity",
            "equipment.mli_ultra.model",
            kind="composed_inference",
            block="capability_summary",
            contributing_facts=[
                "equipment.mli_ultra.model=MLI Ultra 24/6000",
                "equipment.mli_ultra.quantity=3",
                "profile.mli_ultra.device.model",
                "derived:6000_Wh_token_per_unit_from_model",
                f"derived:bank_kWh≈{n}×6",
                "vessel.display_name",
            ],
        )
        first_use.add("mli_ultra")
        for k in mli_keys:
            first_use.add(k)
        dropped_wisdom.append(
            {
                "candidate": "capacity_endurance_gloss",
                "reason": (
                    "Capacity alone is supported; 'roughly a day-plus of "
                    "typical use without charging' is not — no vessel "
                    "consumption / daily-load profile facts exist."
                ),
                "missing_facts": (
                    "owner_survey or measured typical daily kWh draw "
                    "(or conservative published load budget for this vessel)."
                ),
            }
        )
    else:
        _emit(
            f"On {boat}, the house bank is the energy store for the vessel's "
            f"electrical loads.",
            "vessel.display_name",
            block="capability_summary",
        )

    # Wisdom 2 — big-consumer awareness: DROP (no galley AC load facts).
    dropped_wisdom.append(
        {
            "candidate": "big_consumer_awareness",
            "reason": (
                "Missing documented induction hob, oven, or other large AC "
                "cooking loads on this vessel (not in equipment inventory; "
                "AC schematic folio 10 installation_note only attests aircon, "
                "not cooking loads). Combi inverter role alone does not "
                "identify which AC loads are largest."
            ),
            "missing_facts": (
                "vessel_fact or equipment for induction hob / oven / large "
                "AC galley loads tied to the Combis; optional Combi continuous "
                "invert rating if framing draw magnitude."
            ),
        }
    )

    # ========== HOW IT WORKS — one integrated charge-sources paragraph ==========
    charge_sentences: list[str] = []
    charge_sources: list[str] = []
    solar_leaf_pointer = ""
    if mppt_keys:
        charge_sentences.append(
            "Solar arrays feed the bank through Victron MPPT chargers"
        )
        solar_leaf_pointer = (
            "Array layout, VictronConnect checks, and boom-shade cautions are "
            "in the Solar notes that accompany this chapter"
        )
        charge_sources.extend(f"graph.device:{k}" for k in mppt_keys)
        charge_sources.append("leaf:solar")
    if combi_keys:
        n = len(combi_keys)
        n_word = {1: "one", 2: "two", 3: "three"}.get(n, str(n)).capitalize()
        charge_sentences.append(
            f"{n_word} inverter-chargers (Mastervolt Mass Combi Pro) convert "
            f"between shore or generator AC and the house bank, and supply AC "
            f"from the bank when no shore or generator power is available"
        )
        charge_sources.extend(f"graph.device:{k}" for k in combi_keys)
        charge_sources.append("profile.mass_combi_pro.operator_actions")
        first_use.add("mass_combi_pro")
        for k in combi_keys:
            first_use.add(k)

    if genset_keys:
        charge_sentences.append(
            "the generator (Fischer Panda 8000i) supplies on-board AC when "
            "shore power is unavailable"
        )
        charge_sources.extend(f"graph.device:{k}" for k in genset_keys)
        charge_sources.append("profile.fischer_panda_8000i.device")
        charge_sources.append("profile.fischer_panda_8000i.operator_actions")
        first_use.add("fischer_panda_8000i")

    alpha_rating_ok = False
    for e in equipment_doc.get("equipment") or []:
        if not isinstance(e, dict) or "alpha" not in str(e.get("device_key") or ""):
            continue
        attested = str((e.get("provenance_split") or {}).get("attested") or "")
        if "110A" in attested and "24V" in attested:
            alpha_rating_ok = True
            break

    if alpha_keys:
        n = len(alpha_keys)
        n_word = {1: "one", 2: "two", 3: "three"}.get(n, str(n)).capitalize()
        if alpha_rating_ok:
            charge_sentences.append(
                f"{n_word} alternator regulators (Mastervolt Alpha Pro III) "
                f"manage twin 24 V / 110 A engine-driven alternators when the "
                f"engines are running"
            )
            charge_sources.append(
                "equipment.alpha_pro.provenance_split.attested"
            )
        else:
            charge_sentences.append(
                f"{n_word} alternator regulators (Mastervolt Alpha Pro III) "
                f"add engine-driven charge when the engines are running"
            )
            dropped_wisdom.append(
                {
                    "candidate": "alternator_output_rating",
                    "reason": "Alternator rating attestation not found on Alpha rows.",
                    "missing_facts": (
                        "equipment.alpha provenance_split.attested 24V/110A"
                    ),
                }
            )
        charge_sources.extend(f"graph.device:{k}" for k in alpha_keys)
        charge_sources.append("profile.alpha_pro_iii.operator_actions")
        first_use.add("alpha_pro_iii")
        for k in alpha_keys:
            first_use.add(k)
    if has_silentwind:
        charge_sentences.append(
            "The wind generator (Silentwind Hybrid 1000) also contributes "
            "wind charge"
        )
        charge_sources.extend(
            ["graph.device:silentwind", "profile.silentwind.operator_actions"]
        )
        first_use.add("silentwind")
    if solar_leaf_pointer:
        charge_sentences.append(solar_leaf_pointer)
    if charge_sentences:
        parts: list[str] = []
        for part in charge_sentences:
            p = part.strip().rstrip(".")
            if p:
                parts.append(p[0].upper() + p[1:] if len(p) > 1 else p.upper())
        body = ". ".join(parts) + "."
        _emit(
            body,
            *charge_sources,
            block="how_it_works",
        )

    # ========== DAILY USE (checks + meter path co-located) ==========
    if mli_keys:
        _emit(
            "Watch house-bank state of charge and any alarms as part of daily "
            "energy checks; bank and meter readings on the CZone "
            "touchscreen, including the Inverter Charger page for the "
            f"inverter-chargers, can be found in {controls_xref['phrase']}.",
            *[f"graph.device:{k}" for k in mli_keys],
            "profile.mli_ultra.safety_role",
            "section_inputs.excluded:czone_touch_7",
            "xref.controls",
            "profile.czone_2_0.ui_pages[Inverter Charger]",
            block="monitoring",
            links=[section_xref_link("controls")],
        )

    # Wisdom 4 — charge-mode comparison (behavior), not Solar S1 quantity restatement.
    # xli: alternator half keys off engines running, not vessel underway state.
    if mppt_keys:
        solar_bits = (
            "At anchor in good sun, treat solar as the main charge path across "
            "both arrays"
        )
        srcs = [
            "vessel_fact:solar_davit_array_observation",
            "vessel_fact:solar_coachroof_array_observation",
            *[f"graph.device:{k}" for k in mppt_keys],
        ]
        contrib = [
            "solar_davit_array_observation",
            "solar_coachroof_array_observation",
            "derived:at_anchor_solar_primary_vs_engines_running_alternators",
        ]
        if alpha_keys and alpha_rating_ok:
            solar_bits += (
                "; when the engines are running, those alternators add "
                "engine-driven charging"
            )
            srcs.extend(f"graph.device:{k}" for k in alpha_keys)
            srcs.append("equipment.alpha_pro.provenance_split.attested")
            contrib.extend(
                [
                    "equipment.alpha_pro_iii_port.provenance_split.attested",
                    "equipment.alpha_pro_iii_stbd.provenance_split.attested",
                    "equipment.alpha quantity=2",
                ]
            )
        wisdom_sid = _emit(
            solar_bits + ".",
            *srcs,
            kind="composed_inference",
            block="monitoring",
            contributing_facts=contrib,
        )
    else:
        wisdom_sid = None

    # Pointed-to Solar capability quantities (leaf) — for xxxv restatement lint.
    pointed_solar_capability: list[str] = []
    watt = next(
        (
            f
            for f in (equipment_doc.get("vessel_facts") or [])
            if isinstance(f, dict) and f.get("id") == "solar_array_wattage_inventory"
        ),
        {},
    )
    wattage = (watt or {}).get("wattage_kw") or {}
    if wattage:
        davit_lo = float(wattage.get("davit_min") or 0)
        davit_hi = float(wattage.get("davit_max") or 0)
        coach_kw = float(wattage.get("coachroof") or 0)
        if davit_lo and davit_hi and coach_kw:
            total_lo = davit_lo + coach_kw
            total_hi = davit_hi + coach_kw
            pointed_solar_capability.extend(
                [
                    f"carries about {total_lo:.1f}–{total_hi:.1f} kW of solar",
                    f"about {davit_lo:.1f}–{davit_hi:.1f} kW",
                    f"about {int(coach_kw * 1000)} W",
                ]
            )

    fact_queries: list[dict[str, str]] = []

    # ========== SETTINGS — occasion-gated (xxxix); else demote to reference ==========
    silentwind_brake = None
    if has_silentwind:
        for act in (profiles.get("silentwind") or {}).get("operator_actions") or []:
            if not isinstance(act, dict):
                continue
            if "brake" in str(act.get("action") or "").lower():
                silentwind_brake = act
                break
    if has_silentwind and silentwind_brake is not None:
        if action_has_sourced_occasion(silentwind_brake):
            _emit(
                "When you need to stop the turbine, use the brake on its "
                "Hybrid controller.",
                "graph.device:silentwind",
                "profile.silentwind.operator_actions",
                "profile.silentwind.control_surfaces[0]",
                block="adjusting",
            )
        else:
            _emit(
                "The wind generator Hybrid controller includes a brake to "
                "stop the turbine.",
                "graph.device:silentwind",
                "profile.silentwind.operator_actions",
                "profile.silentwind.control_surfaces[0]",
                block="reference",
            )
            fact_queries.append(
                {
                    "id": "silentwind_brake_occasion",
                    "device": "silentwind",
                    "action": "brake / stop turbine from controller",
                    "missing": (
                        "Sourced when/why to brake (high wind, docking, "
                        "maintenance, etc.) — profile has context=situational only."
                    ),
                }
            )

    if combi_keys:
        combi_profile = profiles.get("mass_combi_pro") or {}
        limit_act = None
        for act in combi_profile.get("operator_actions") or []:
            if not isinstance(act, dict):
                continue
            if "input current limit" in str(act.get("action") or "").lower():
                limit_act = act
                break
        surfaces = [
            s
            for s in (combi_profile.get("control_surfaces") or [])
            if isinstance(s, dict)
        ]
        on_device = [
            s
            for s in surfaces
            if str(s.get("location_class") or "") == "on_device"
            or str(s.get("surface") or "") == "physical_controls"
        ]
        label = ""
        if on_device:
            label = str(
                on_device[0].get("label_verbatim") or "Combi front panel"
            ).strip()
        network_ok = bool(
            (combi_profile.get("data_roles") or {}).get("controllable_from_network")
        )
        station_page = "Inverter Charger"
        surface_bits: list[str] = []
        surface_srcs: list[str] = []
        if label:
            surface_bits.append(f"the {label} on the inverter-charger")
            surface_srcs.append("profile.mass_combi_pro.control_surfaces[0]")
        if network_ok:
            surface_bits.append(
                f"the CZone {station_page} page on the touchscreen"
            )
            surface_srcs.extend(
                [
                    "profile.mass_combi_pro.data_roles.controllable_from_network",
                    "profile.czone_2_0.ui_pages[Inverter Charger]",
                ]
            )
        if limit_act and surface_bits:
            surface_phrase = (
                surface_bits[0]
                if len(surface_bits) == 1
                else f"{surface_bits[0]}, or {surface_bits[1]}"
            )
            if action_has_sourced_occasion(limit_act):
                occ = str(limit_act.get("occasion") or "").strip()
                if not occ:
                    # context/action-embedded occasion — keep a clear when-clause
                    occ = (
                        "when shore or generator input amperage must be limited"
                    )
                elif not occ.lower().startswith(
                    ("when ", "if ", "after ", "before ", "once ")
                ):
                    occ = f"when {occ}"
                # Capitalize sentence start
                lead = occ[0].upper() + occ[1:] if occ else "When needed"
                _emit(
                    f"{lead}, set the AC input current limit from "
                    f"{surface_phrase}.",
                    "profile.mass_combi_pro.operator_actions",
                    "profile.mass_combi_pro.operator_actions.occasion",
                    *surface_srcs,
                    *[f"graph.device:{k}" for k in combi_keys],
                    block="adjusting",
                )
            else:
                _emit(
                    f"AC input current limit controls are on {surface_phrase}.",
                    "profile.mass_combi_pro.operator_actions",
                    *surface_srcs,
                    *[f"graph.device:{k}" for k in combi_keys],
                    block="reference",
                )
                fact_queries.append(
                    {
                        "id": "combi_ac_input_limit_occasion",
                        "device": "mass_combi_pro",
                        "action": "set AC input current limit",
                        "missing": (
                            "Sourced when/why to change the AC input current "
                            "limit for the operator (shore pedestal ampacity, "
                            "generator rating, Power Sharing policy). Vessel "
                            "stub: context=situational + evidence note "
                            "'shore power current limit' only. last_green has "
                            "'set Power Sharing level to match external "
                            "circuit breaker' but audience="
                            "installer_or_technician and that action is not "
                            "on the vessel Combi profile — do not import."
                        ),
                        "checked": (
                            "outremer profiles.mass_combi_pro; "
                            "last_green/mastervolt_combi/profile.json"
                        ),
                    }
                )
        elif limit_act:
            dropped_wisdom.append(
                {
                    "candidate": "ac_input_current_limit_instruction",
                    "reason": (
                        "Operator action 'set AC input current limit' has no "
                        "bound control surface on the vessel Combi profile."
                    ),
                    "missing_facts": (
                        "profile.mass_combi_pro.control_surfaces entry tied to "
                        "that action (and/or confirmed MasterView / CZone path)."
                    ),
                }
            )

    if genset_keys:
        _emit(
            "Start and stop the generator from its Panda iControl2 panel, and "
            "give it a visual check before starting.",
            *[f"graph.device:{k}" for k in genset_keys],
            "profile.fischer_panda_8000i.control_surfaces[0]",
            "profile.fischer_panda_8000i.operator_actions",
            block="adjusting",
        )

        # Occasion-gate (xxxix): "when to run the genset" needs a sourced
        # occasion — a vessel energy policy or programmed autostart setpoint.
        # Manual occasions are tautological (begin/cease operation); do not
        # invent run policy. Queue the gap instead of silently omitting it.
        genset_profile = profiles.get("fischer_panda_8000i") or {}
        run_policy_grounded = any(
            isinstance(act, dict)
            and ("autostart" in str(act.get("action") or "").lower()
                 or "run" in str(act.get("action") or "").lower())
            and str(act.get("occasion") or "").strip()
            for act in genset_profile.get("operator_actions") or []
        )
        run_policy_fact = any(
            isinstance(f, dict)
            and "genset" in str(f.get("id") or "").lower()
            and "run" in str(f.get("id") or "").lower()
            for f in (equipment_doc.get("vessel_facts") or [])
        )
        if not (run_policy_grounded or run_policy_fact):
            fact_queries.append(
                {
                    "id": "genset_run_policy_occasion",
                    "device": "fischer_panda_8000i",
                    "action": "run / autostart the generator",
                    "missing": (
                        "Sourced when/why to run the genset for this vessel — "
                        "house-bank SOC threshold, large-AC-load policy, shore "
                        "fallback, or programmed iControl2 autostart setpoints. "
                        "Manual grounds only tautological start/stop occasions "
                        "('to begin/cease generator operation'); no vessel "
                        "energy-management fact exists."
                    ),
                    "checked": (
                        "scratch/fischer_panda_8000i.json operator_actions "
                        "occasions; outremer vessel_facts (no genset run "
                        "policy / autostart setpoints)"
                    ),
                }
            )

    # ========== FAULT RESPONSE (orientation + reset joined) ==========
    if mli_keys:
        _emit(
            "The house batteries protect themselves through their BMS — a "
            "protective disconnect is the system doing its job, uncommon in "
            "normal use, and recoverable with a reset. After a protective "
            "disconnect, reset the BMS on the affected house battery before "
            "restoring loads.",
            *[f"graph.device:{k}" for k in mli_keys],
            "profile.mli_ultra.safety_role.is_protective_device",
            "profile.mli_ultra.safety_role.has_emergency_procedure",
            "profile.mli_ultra.operator_actions",
            "profile.mli_ultra.evidence:BMS_disconnect_reset",
            kind="composed_inference",
            block="troubleshooting",
            contributing_facts=[
                "profile.mli_ultra.safety_role.is_protective_device=true",
                "profile.mli_ultra.safety_role.has_emergency_procedure=true",
                "profile.mli_ultra.safety_role.has_manual_override=true",
                "profile.mli_ultra.operator_actions:reset_BMS_after_protective_disconnect",
                "profile.mli_ultra.evidence:BMS_disconnect_reset",
            ],
        )

    # ========== REFERENCE ==========
    _emit(
        "Battery isolation switches and Class-T protection for the bank can be "
        f"found in {electrical_xref['phrase']}.",
        "xref.electrical",
        "graph.section:ml_switch=electrical",
        "graph.section:class_t=electrical",
        block="reference",
        links=[section_xref_link("electrical")],
    )

    inferences = [
        p
        for p in provenance_map
        if p.get("composed_inference") and str(p.get("sentence") or "").strip()
    ]
    # xxxv / v4.20: wisdom = behavior/comparison/guidance, not capability quantity.
    wisdom_row = None
    if wisdom_sid:
        wisdom_row = next(
            (p for p in provenance_map if p.get("id") == wisdom_sid), None
        )
    if wisdom_row is None:
        for p in inferences:
            if normalize_block(str(p.get("block") or "")) != "capability_summary":
                wisdom_row = p
                break
    wisdom_slot = {
        "status": WISDOM_FILLED if wisdom_row else WISDOM_PENDING,
        "sentence_id": (wisdom_row.get("id") if wisdom_row else None),
        "block": (wisdom_row.get("block") if wisdom_row else "monitoring"),
        "inference_ids": [p.get("id") for p in inferences],
        "note": (
            "B&E wisdom: at-anchor solar vs engines-running alternators "
            "(not Solar capability kW restatement; see v4.20 xxxv / v4.21 xli)."
        ),
    }

    path_meta = [f"path_device:{k}" for k in provenance_keys]
    paragraphs: list[str] = []
    by_block: dict[str, list[str]] = {b: [] for b in SECTION_ORDER}
    for row in provenance_map:
        text = str(row["sentence"])
        if not text.strip():
            continue
        by_block.setdefault(row["block"], []).append(text)
        if path_meta and row["block"] in {
            "how_it_works",
            "monitoring",
            "adjusting",
            "troubleshooting",
            "reference",
        }:
            row.setdefault("provenance_metadata", []).extend(path_meta)

    # Fix block_order: rebuild from SECTION_ORDER presence
    block_order = [b for b in SECTION_ORDER if by_block.get(b)]

    title = "# Batteries & Energy\n"
    for block in SECTION_ORDER:
        lines = by_block.get(block) or []
        if not lines:
            continue
        paragraphs.append("\n\n".join(lines))
    draft = title + "\n\n".join(paragraphs)

    vocab = lint_reader_vocabulary(draft)
    absence = lint_absence_prose(draft)
    economy = lint_prose_economy(draft)

    guide_links: list[dict[str, Any]] = []
    for row in provenance_map:
        for link in row.get("links") or []:
            guide_links.append(
                {
                    "sentence_id": row["id"],
                    "block": row.get("block"),
                    **dict(link),
                }
            )

    return {
        "draft_markdown": draft,
        "provenance_map": provenance_map,
        "guide_links": guide_links,
        "wisdom_slot": wisdom_slot,
        "pointed_section_capability_sentences": pointed_solar_capability,
        "dropped_wisdom_candidates": dropped_wisdom,
        "fact_queries": fact_queries,
        "section_inputs": inputs,
        "block_order": block_order,
        "section_order_template": list(SECTION_ORDER),
        "context_shaping_consumed": context_shaping_consumed,
        "full_keys": full_keys,
        "provenance_keys": provenance_keys,
        "excluded_candidates": list(inputs.get("candidates_excluded") or []),
        "vocabulary_lint": vocab,
        "absence_lint": absence,
        "prose_economy_lint": economy,
        "vessel_display_name": boat,
        "version": "v4.21",
    }


def evaluate_batteries_draft(
    composed: dict[str, Any],
    *,
    expected_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate Batteries draft: xxvi–xxxi + global xxxii–xxxv."""
    draft = str(composed.get("draft_markdown") or "")
    lower = draft.lower()
    boat = str(composed.get("vessel_display_name") or "")
    prov = list(composed.get("provenance_map") or [])

    unsourced = [
        p
        for p in prov
        if not (p.get("sources") or [])
        and str(p.get("sentence") or "").strip()
    ]
    vocab_hits = list(composed.get("vocabulary_lint") or [])
    absence_hits = list(composed.get("absence_lint") or [])
    economy = composed.get("prose_economy_lint") or lint_prose_economy(draft)
    voice = assess_reader_voice_style(draft, vessel_display_name=boat)
    global_comp = assess_global_composition(
        composed,
        require_filled_wisdom=False,
        peer_capability_texts=list(
            composed.get("pointed_section_capability_sentences") or []
        ),
    )

    path_named = any(
        k.replace("_", " ") in lower
        for k in (composed.get("provenance_keys") or [])
    ) or ("masterbus bridge" in lower) or bool(re.search(r"\bcoi\b", lower))

    install_leak = any(rx.search(draft) for rx in _INSTALL_LEAK_RES)

    link_targets = {
        str(link.get("target_id"))
        for link in (composed.get("guide_links") or [])
        if link.get("target_kind") == "system"
    }
    controls_xref_ok = "controls" in link_targets and "section of this guide" in lower
    electrical_xref_ok = "electrical" in link_targets

    solar_pointer_ok = "solar" in lower and (
        "victron" in lower or "array" in lower or "mppt" in lower
    )
    solar_depth_ok = lower.count("victronconnect") <= 1

    input_match = True
    input_notes = "skipped"
    if expected_inputs is not None:
        got = {
            c["device_key"]: c["depth"]
            for c in (composed.get("section_inputs") or {}).get("contributors")
            or []
        }
        exp = {
            c["device_key"]: c["depth"]
            for c in (expected_inputs.get("contributors") or [])
        }
        input_match = got == exp
        input_notes = "match" if input_match else f"got={got} expected={exp}"

    block_order = list(composed.get("block_order") or [])
    block_order_ok = block_order[:1] == ["capability_summary"] and all(
        b in SECTION_SPINE for b in block_order
    )

    checks = {
        "zero_unsourced": len(unsourced) == 0,
        "no_absence_prose": len(absence_hits) == 0,
        "zero_internal_vocabulary": len(vocab_hits) == 0,
        "vessel_named": bool(boat) and boat.lower() in lower,
        "one_parenthetical_max": not (economy.get("parentheticals") or []),
        "no_clause_restatement": not (economy.get("restatement") or []),
        "path_devices_unnamed": not path_named,
        "no_install_leak": not install_leak,
        "input_set_matches_fixture": input_match,
        "controls_xref_present": controls_xref_ok,
        "electrical_xref_present": electrical_xref_ok,
        "solar_charge_pointer": solar_pointer_ok and solar_depth_ok,
        "block_order_ok": block_order_ok,
        "reader_voice_established": bool(voice.get("established")),
        **{f"global_{k}": v for k, v in (global_comp.get("checks") or {}).items()},
    }
    notes = {
        "xxvi": f"Input set {input_notes}",
        "xxvii": "Controls xref" if controls_xref_ok else "missing Controls xref",
        "xxviii": "Electrical xref" if electrical_xref_ok else "missing Electrical xref",
        "xxix": "Solar pointer ok" if checks["solar_charge_pointer"] else "solar fail",
        "xxx": f"blocks={block_order}",
        "xxxi": "named" if checks["reader_voice_established"] else "unnamed",
        "xxxii": "spine ok"
        if global_comp["checks"]["spine_order_ok"]
        and global_comp["checks"]["xref_consolidated"]
        else global_comp["findings"],
        "xxxiii": "orphans ok"
        if global_comp["checks"]["orphan_facts_ok"]
        else global_comp["findings"]["orphan"],
        "xxxiv": "vocab ok"
        if global_comp["checks"]["owner_vocabulary_ok"]
        else global_comp["findings"]["vocabulary"],
        "xxxv": global_comp.get("wisdom_slot"),
    }
    return {
        "checks": checks,
        "pass": all(checks.values()),
        "style_warnings": voice.get("style_warnings") or [],
        "reader_voice": voice,
        "global_composition": global_comp,
        "notes": notes,
        "version": "v4.21",
        "criteria": [
            "xxvi",
            "xxvii",
            "xxviii",
            "xxix",
            "xxx",
            "xxxi",
            "xxxii",
            "xxxiii",
            "xxxiv",
            "xxxv",
            "xxxvi",
            "xxxvii",
            "xxxviii",
            "xxxix",
            "xl",
            "xli",
        ],
    }