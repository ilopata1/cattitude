"""Stage 4 Electrical Panel — isolation, Class-T, distribution, bridges.

Uses ``assemble_section_inputs`` depths:
  full — ML switches, plain rotary, Class-T, busbar, COIs, MasterBus bridge/USB
  (no summary boundary members on founding Outremer fixture)

Station UI stays on Controls; house-bank / charge depth stays on Batteries.
USB interface is commissioning-only (context_shaping / omitted from body).

Operator-voice rules: spec v4.32 (function-first, gloss-once, plain English).
"""

from __future__ import annotations

import re
from typing import Any

from guide_composition_rules import (
    SECTION_SPINE,
    WISDOM_PENDING,
    assess_global_composition,
    format_action_first_occasions,
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
    lint_absence_prose,
    lint_prose_economy,
    lint_reader_vocabulary,
)
from section_inputs import (
    DEPTH_FULL,
    DEPTH_PROVENANCE,
    DEPTH_SUMMARY,
    assemble_section_inputs,
    keys_at_depth,
)
from system_graph import VesselGraphResult

SECTION_ORDER = (
    "capability_summary",
    "how_it_works",
    "adjusting",
    "troubleshooting",
    "reference",
)

MANUFACTURER_MODEL: dict[str, tuple[str, str]] = {
    "blue_sea_acr": ("Blue Sea Systems", "Automatic Charging Relays (ACR)"),
    "plain_battery_switch": ("", "rotary battery switch"),
    "class_t": ("Blue Sea", "Class T"),
    "busbar": ("ProInstaller", "busbar"),
    "coi": ("CZone", "Combination Output Interface"),
    "masterbus_bridge_interface": ("Mastervolt", "MasterBus Bridge Interface"),
    "masterbus_usb_interface": ("Mastervolt", "MasterBus USB Interface"),
}

_FORBIDDEN_EXTRA = (
    re.compile(r"\bczone touch\b", re.I),
    re.compile(r"\bfavourites\b", re.I),
    re.compile(r"\bvictronconnect\b", re.I),
    re.compile(r"\bkwh\b", re.I),
    re.compile(r"\bdip.?switch\b", re.I),
    re.compile(r"\bmasteradjust\b", re.I),
    re.compile(r"\bbank feeds?\b", re.I),
    re.compile(r"\bdistribution node\b", re.I),
    re.compile(r"installed equipment\b", re.I),
)

_INSTALL_LEAK_RES = (
    re.compile(r"\bcommission(?:ing)?\b", re.I),
    re.compile(r"\bdip.?switch\b", re.I),
)


def compose_electrical_section(
    *,
    graph: VesselGraphResult,
    profiles: dict[str, dict[str, Any]],
    equipment_doc: dict[str, Any],
    section_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compose Electrical Panel Stage 4 for the vessel (v4.36)."""
    boat = resolve_vessel_display_name(equipment_doc)
    inputs = section_inputs or assemble_section_inputs(
        graph, "electrical", equipment_doc=equipment_doc
    )

    full_keys = keys_at_depth(inputs, DEPTH_FULL)
    summary_keys = keys_at_depth(inputs, DEPTH_SUMMARY)
    provenance_keys = keys_at_depth(inputs, DEPTH_PROVENANCE)

    acr_keys = [k for k in full_keys if k.startswith("blue_sea_acr")]
    class_t_keys = [k for k in full_keys if k.startswith("class_t")]
    coi_keys = [k for k in full_keys if k.startswith("coi")]
    has_plain = "plain_battery_switch" in full_keys
    has_busbar = "busbar" in full_keys
    has_bridge = "masterbus_bridge_interface" in full_keys
    has_usb = "masterbus_usb_interface" in full_keys
    has_acr = bool(acr_keys)

    batteries_xref = format_section_xref("batteries")
    controls_xref = format_section_xref("controls")

    provenance_map: list[dict[str, Any]] = []
    block_order: list[str] = []
    context_shaping_consumed: list[dict[str, Any]] = []
    queued_fact_queries: list[dict[str, str]] = []

    def _emit(
        text: str,
        *sources: str,
        kind: str = "sourced",
        block: str = "capability_summary",
        links: list[dict[str, str]] | None = None,
        contributing_facts: list[str] | None = None,
    ) -> str:
        sid = f"S{len(provenance_map) + 1}"
        if kind != "composed_inference" and text.strip():
            abs_hits = lint_absence_prose(text)
            if abs_hits:
                raise ValueError(
                    f"absence prose forbidden on {sid!r}: {abs_hits} in {text!r}"
                )
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
        if kind == "composed_inference":
            entry["composed_inference"] = True
            entry["contributing_facts"] = list(contributing_facts or sources)
        if links:
            entry["links"] = list(links)
        provenance_map.append(entry)
        if block not in block_order:
            block_order.append(block)
        return sid

    def _qty_word(n: int) -> str:
        words = {
            1: "one",
            2: "two",
            3: "three",
            4: "four",
            5: "five",
            6: "six",
        }
        return words.get(n, str(n))

    for flag in inputs.get("flags") or []:
        fname = str(flag.get("flag") or "")
        if fname in {
            "suspected_installer_line_item",
            "section_low_margin",
            "unresolved_dependency",
        }:
            context_shaping_consumed.append(dict(flag))

    if has_usb:
        context_shaping_consumed.append(
            {
                "flag": "commissioning_only",
                "device": "masterbus_usb_interface",
                "detail": "MasterBus USB is PC commissioning — omit from guest body",
            }
        )

    queued_fact_queries.append(
        {
            "id": "electrical_component_locations",
            "query": (
                "Physical locations for ACR, plain rotary battery switch, "
                "Class-T holders, and DC distribution busbar "
                "(panel / locker / hull side / deck)."
            ),
            "status": "queued",
            "note": (
                "No vessel place facts yet. Profile location_class on_device "
                "means local-to-equipment, not a deck/locker place."
            ),
        }
    )

    # ========== CAPABILITY (function first) ==========
    _emit(
        f"On {boat}, battery banks are combined and isolated automatically, "
        "and DC distribution is protected before power reaches the boat's "
        "switched circuits.",
        "vessel.display_name",
        "graph.section:electrical",
        kind="composed_inference",
        block="capability_summary",
        contributing_facts=[
            "vessel.display_name",
            "section.electrical owns ACR/Class-T/distribution",
        ],
    )

    if class_t_keys:
        n = len(class_t_keys)
        mm = MANUFACTURER_MODEL["class_t"]
        _emit(
            f"The house battery bank is protected by {_qty_word(n)} high-current "
            f"Class-T fuses ({mm[0]} {mm[1]}) — fuses that protect the cables "
            "carrying power from the bank if a major electrical fault occurs.",
            *[f"graph.device:{k}" for k in class_t_keys],
            "profile.class_t.device.model",
            "profile.class_t.safety_role.is_protective_device",
            kind="composed_inference",
            block="capability_summary",
            contributing_facts=[
                f"equipment.class_t.quantity={n}",
                "profile.class_t.safety_role.is_protective_device=true",
                "profile.class_t.device.model",
            ],
        )

    if has_acr:
        mm = MANUFACTURER_MODEL["blue_sea_acr"]
        _emit(
            f"An automatic charging relay ({mm[0]} {mm[1]}) combines and "
            "isolates battery banks based on charging voltage.",
            *[f"graph.device:{k}" for k in acr_keys],
            "profile.blue_sea_acr.device.model",
            "profile.blue_sea_acr.control_surfaces",
            "profile.blue_sea_acr.operator_actions",
            block="capability_summary",
        )

    if has_plain:
        _emit(
            "A local rotary isolation switch provides a separate disconnect "
            "for its battery connection.",
            "graph.device:plain_battery_switch",
            "equipment.plain_battery_switch",
            "profile.plain_battery_switch.control_surfaces.location_class",
            "profile.plain_battery_switch.operator_actions",
            block="capability_summary",
        )

    # ========== HOW IT WORKS (normal leave-alone + station once) ==========
    if has_acr:
        _emit(
            "Leave the ACR Manual Control Override Knob in automatic mode "
            "during normal operation so the relay can combine and isolate "
            "banks on its own.",
            *[f"graph.device:{k}" for k in acr_keys],
            "profile.blue_sea_acr.control_surfaces",
            "profile.blue_sea_acr.operator_actions",
            kind="composed_inference",
            block="how_it_works",
            contributing_facts=[
                "profile.blue_sea_acr.control_surfaces.label=Manual Control Override Knob",
                "ACR automatic combine/isolate is the normal mode",
            ],
        )
    elif has_plain:
        _emit(
            "Leave the local rotary isolation switch connected during normal "
            "operation unless that battery connection must be isolated.",
            "graph.device:plain_battery_switch",
            "profile.plain_battery_switch.operator_actions",
            kind="composed_inference",
            block="how_it_works",
            contributing_facts=[
                "isolation switches are not routine controls",
            ],
        )

    if coi_keys:
        n = len(coi_keys)
        mm = MANUFACTURER_MODEL["coi"]
        _emit(
            f"{_qty_word(n).capitalize()} CZone output interfaces ({mm[0]} {mm[1]}) "
            "feed the switched DC circuits from the protected distribution. "
            "Use the CZone touchscreen when you need to switch those circuits; "
            f"details can be found in {controls_xref['phrase']}.",
            *[f"graph.device:{k}" for k in coi_keys],
            "equipment.coi.model",
            "xref.controls",
            "graph.section:czone_touch_7=controls",
            block="how_it_works",
            links=[section_xref_link("controls")],
        )

    # ========== ADJUSTING (exceptional isolate / combine) ==========
    if has_acr:
        _emit(
            format_action_first_occasions(
                surface_function=(
                    "The ACR Manual Control Override Knob takes manual "
                    "control of bank combine and isolate"
                ),
                occasions=[
                    "you need to combine battery banks manually",
                    "remote operation must be blocked",
                    "the ACR must be secured for servicing",
                ],
            ),
            *[f"graph.device:{k}" for k in acr_keys],
            "profile.blue_sea_acr.operator_actions",
            "profile.blue_sea_acr.control_surfaces",
            block="adjusting",
        )
    if has_plain:
        _emit(
            "Use the local rotary isolation switch when that battery connection "
            "must be disconnected at the switch.",
            "graph.device:plain_battery_switch",
            "profile.plain_battery_switch.operator_actions",
            block="adjusting",
        )

    # ========== TROUBLESHOOTING ==========
    if class_t_keys or has_acr:
        bits = []
        sources = []
        if has_acr:
            bits.append("ACR combine/isolate state")
            sources.extend(f"graph.device:{k}" for k in acr_keys)
        if class_t_keys:
            bits.append("Class-T fuse integrity")
            sources.extend(f"graph.device:{k}" for k in class_t_keys)
        check = " and ".join(bits) if bits else "protection state"
        _emit(
            f"If a bank connection drops unexpectedly, confirm {check} "
            "before restoring loads. "
            f"BMS reset steps can be found in {batteries_xref['phrase']}.",
            *sources,
            "profile.class_t.safety_role.is_protective_device",
            "xref.batteries",
            block="troubleshooting",
            links=[section_xref_link("batteries")],
        )

    # ========== REFERENCE (path devices + remaining xrefs) ==========
    if has_busbar:
        mm = MANUFACTURER_MODEL["busbar"]
        _emit(
            f"The DC distribution busbar ({mm[0]}) — a heavy-duty conductor that "
            "distributes power — is the main power distribution point behind "
            "those protected connections.",
            "graph.device:busbar",
            "equipment.busbar",
            block="reference",
        )

    if has_bridge:
        mm = MANUFACTURER_MODEL["masterbus_bridge_interface"]
        _emit(
            f"The MasterBus–CZone bridge ({mm[0]} {mm[1]}) allows MasterBus "
            "equipment and the CZone network to exchange status and control "
            "across that boundary.",
            "graph.device:masterbus_bridge_interface",
            "equipment.masterbus_bridge_interface.description",
            block="reference",
        )

    _emit(
        "House-bank capacity, charging, and inverter-charger procedures can be "
        f"found in {batteries_xref['phrase']}.",
        "xref.batteries",
        "graph.section:mli_ultra=batteries",
        block="reference",
        links=[section_xref_link("batteries")],
    )

    wisdom_slot = {
        "status": WISDOM_PENDING,
        "sentence_id": None,
        "block": "how_it_works",
        "inference_ids": [
            p.get("id") for p in provenance_map if p.get("composed_inference")
        ],
        "note": (
            "Electrical: ACR leave-in-automatic guidance is composed_inference; "
            "filled wisdom comparative claim still pending."
        ),
    }

    by_block: dict[str, list[str]] = {b: [] for b in SECTION_ORDER}
    for row in provenance_map:
        text = str(row["sentence"])
        if not text.strip():
            continue
        by_block.setdefault(row["block"], []).append(text)

    block_order = [b for b in SECTION_ORDER if by_block.get(b)]
    paragraphs: list[str] = []
    for block in SECTION_ORDER:
        lines = by_block.get(block) or []
        if lines:
            paragraphs.append("\n\n".join(lines))

    title = "# Electrical Panel\n"
    draft = title + "\n\n".join(paragraphs)

    vocab = lint_reader_vocabulary(draft)
    absence = lint_absence_prose(draft)
    economy = lint_prose_economy(draft)

    guide_links: list[dict[str, Any]] = []
    for row in provenance_map:
        for link in row.get("links") or []:
            guide_links.append(
                {
                    "sentence_id": row.get("id"),
                    "block": row.get("block"),
                    **link,
                }
            )

    return {
        "draft_markdown": draft,
        "provenance_map": provenance_map,
        "block_order": block_order,
        "section_inputs": inputs,
        "full_keys": full_keys,
        "summary_keys": summary_keys,
        "provenance_keys": provenance_keys,
        "excluded_candidates": list(inputs.get("candidates_excluded") or []),
        "context_shaping_consumed": context_shaping_consumed,
        "queued_fact_queries": queued_fact_queries,
        "vocabulary_lint": vocab,
        "absence_lint": absence,
        "prose_economy_lint": economy,
        "vessel_display_name": boat,
        "guide_links": guide_links,
        "wisdom_slot": wisdom_slot,
        "version": "v4.36",
    }


def evaluate_electrical_draft(
    composed: dict[str, Any],
    *,
    expected_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate Electrical draft: lvi–lxvi + lxviii–lxix + shared voice / spine checks."""
    draft = str(composed.get("draft_markdown") or "")
    lower = draft.lower()
    boat = str(composed.get("vessel_display_name") or "")
    prov = list(composed.get("provenance_map") or [])

    unsourced = [
        p
        for p in prov
        if not (p.get("sources") or []) and str(p.get("sentence") or "").strip()
    ]
    vocab_hits = list(composed.get("vocabulary_lint") or [])
    absence_hits = list(composed.get("absence_lint") or [])
    economy = composed.get("prose_economy_lint") or lint_prose_economy(draft)
    voice = assess_reader_voice_style(draft, vessel_display_name=boat)
    global_comp = assess_global_composition(
        composed,
        require_filled_wisdom=False,
    )

    install_leak = any(rx.search(draft) for rx in _INSTALL_LEAK_RES)
    station_leak = bool(
        re.search(
            r"\bfavourites\b|\bmodes page\b|\balarms page\b|\bvictronconnect\b",
            lower,
        )
    )
    bank_capacity_leak = bool(re.search(r"\b\d+\s*kwh\b", lower))

    link_targets = {
        str(link.get("target_id"))
        for link in (composed.get("guide_links") or [])
        if link.get("target_kind") == "system"
    }
    controls_xref_ok = "controls" in link_targets and "section of this guide" in lower
    batteries_xref_ok = "batteries" in link_targets and "section of this guide" in lower

    isolation_ok = "isolat" in lower
    class_t_ok = "class-t" in lower or "class t" in lower

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
        normalize_block(b) in SECTION_SPINE or b in SECTION_SPINE for b in block_order
    )

    usb_named = bool(re.search(r"\busb\b", lower))

    # lxii — vessel-first system fact (no "this chapter covers" meta)
    cap_rows = [
        p
        for p in prov
        if normalize_block(str(p.get("block") or "")) == "capability_summary"
        and str(p.get("sentence") or "").strip()
    ]
    first_cap = str(cap_rows[0].get("sentence") or "").lower() if cap_rows else ""
    function_first_ok = bool(first_cap) and boat.lower() in first_cap and (
        "isolat" in first_cap or "protect" in first_cap
    ) and "this chapter" not in first_cap
    no_chapter_meta = "this chapter covers" not in lower and "focus of this chapter" not in lower
    # lxiii — glosses
    gloss_ok = (
        ("class-t" in lower or "class t" in lower)
        and ("protect the cables" in lower or "major electrical fault" in lower)
        and ("isolation switch" in lower)
        and ("heavy-duty conductor" in lower or "distributes power" in lower)
    )

    # lxiv — touchscreen at most once
    touchscreen_count = len(re.findall(r"\btouchscreen\b", lower))
    touchscreen_once_ok = touchscreen_count <= 1

    # lxv — no inventory dump
    no_inventory_ok = "installed equipment" not in lower and not re.search(
        r"\d\s*[×x]\s*(blue sea|proinstaller)", lower
    )

    # lxvi — avoid engineering leftovers banned above
    plain_english_ok = "bank feed" not in lower and "distribution node" not in lower

    leave_alone_ok = (
        "leave the acr manual control override knob in automatic" in lower
        or "leave the local rotary isolation switch connected" in lower
    )
    normal_before_fault = block_order.index("how_it_works") < block_order.index(
        "troubleshooting"
    ) if "how_it_works" in block_order and "troubleshooting" in block_order else True

    # lxviii — vessel place only from vessel location facts (not on_device)
    place_warns = [
        w
        for w in (voice.get("style_warnings") or [])
        if w.get("code") == "vessel_place_from_surface"
    ]
    no_invented_place_ok = (
        not place_warns
        and not re.search(r"\bon[- ]deck\b", lower)
        and "local rotary" in lower
    )

    # lxix / xlii — ACR multi-occasion adjusting is action-first + list
    acr_adjust_rows = [
        str(p.get("sentence") or "")
        for p in prov
        if p.get("block") == "adjusting"
        and "manual control override" in str(p.get("sentence") or "").lower()
    ]
    has_acr_member = any(
        str(k).startswith("blue_sea_acr") for k in (composed.get("full_keys") or [])
    )
    multi_occasion_ok = True
    if has_acr_member:
        multi_occasion_ok = bool(acr_adjust_rows) and all(
            "use it when:" in row.lower() and "\n-" in row for row in acr_adjust_rows
        ) and not any(
            row.lower().startswith("when ") and "\n-" not in row
            for row in acr_adjust_rows
        )

    checks = {
        "zero_unsourced": len(unsourced) == 0,
        "no_absence_prose": len(absence_hits) == 0,
        "zero_internal_vocabulary": len(vocab_hits) == 0,
        "vessel_named": bool(boat) and boat.lower() in lower,
        "one_parenthetical_max": not (economy.get("parentheticals") or []),
        "no_clause_restatement": not (economy.get("restatement") or []),
        "no_install_leak": not install_leak,
        "input_set_matches_fixture": input_match,
        "controls_xref_present": controls_xref_ok,
        "batteries_xref_present": batteries_xref_ok,
        "isolation_present": isolation_ok,
        "class_t_present": class_t_ok,
        "no_station_ui_depth": not station_leak,
        "no_bank_capacity_restatement": not bank_capacity_leak,
        "usb_commissioning_omitted": not usb_named,
        "block_order_ok": block_order_ok,
        "reader_voice_established": bool(voice.get("established")),
        "function_first_capability": function_first_ok,
        "no_chapter_meta_framing": no_chapter_meta,
        "terms_glossed_once": gloss_ok,
        "touchscreen_once": touchscreen_once_ok,
        "no_inventory_dump": no_inventory_ok,
        "plain_english_terms": plain_english_ok,
        "normal_leave_alone_stated": leave_alone_ok,
        "normal_before_fault_order": normal_before_fault,
        "no_invented_vessel_place": no_invented_place_ok,
        "multi_occasion_action_first": multi_occasion_ok,
        **{f"global_{k}": v for k, v in (global_comp.get("checks") or {}).items()},
    }
    notes = {
        "lvi": f"Input set {input_notes}",
        "lvii": "Controls xref" if controls_xref_ok else "missing Controls xref",
        "lviii": "Batteries xref" if batteries_xref_ok else "missing Batteries xref",
        "lix": "isolation+Class-T"
        if isolation_ok and class_t_ok
        else "missing isolation/Class-T",
        "lx": "no station UI depth" if not station_leak else "station UI leaked",
        "lxi": f"blocks={block_order}",
        "lxii": "vessel-first system fact"
        if function_first_ok
        else "capability opens without vessel+function or uses chapter meta",
        "lxii_b": "no chapter meta" if no_chapter_meta else "chapter meta framing present",
        "lxiii": "glosses present" if gloss_ok else "missing term gloss",
        "lxiv": f"touchscreen_count={touchscreen_count}",
        "lxv": "no inventory dump" if no_inventory_ok else "inventory dump present",
        "lxvi": "plain English" if plain_english_ok else "engineering leftovers",
        "lxviii": "local only; no invented place"
        if no_invented_place_ok
        else "invented vessel place (e.g. on-deck from on_device)",
        "lxix": "ACR occasions action-first + list"
        if multi_occasion_ok
        else "ACR occasions still repeated as When…use paragraphs",
    }
    return {
        "checks": checks,
        "pass": all(checks.values()),
        "style_warnings": voice.get("style_warnings") or [],
        "reader_voice": voice,
        "global_composition": global_comp,
        "notes": notes,
        "queued_fact_queries": composed.get("queued_fact_queries") or [],
        "version": "v4.36",
        "criteria": [
            "lvi",
            "lvii",
            "lviii",
            "lix",
            "lx",
            "lxi",
            "lxii",
            "lxiii",
            "lxiv",
            "lxv",
            "lxvi",
            "lxviii",
            "lxix",
        ],
    }


__all__ = [
    "VesselNameMissing",
    "compose_electrical_section",
    "evaluate_electrical_draft",
]
