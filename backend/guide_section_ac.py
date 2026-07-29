"""Stage 4 Air Conditioning — Frigomar self-contained BLDC (frozen tip v4.46).

Plant (Outremer / Supernova today):
  full — frigomar_air_conditioning_system (ENDPOINT; section member)
  summary / provenance — empty

Standing policy:
  * Guest day-to-day UI is the wall-mounted touch-screen (not CZone Climate).
  * CZone / Zeus reachability is candidacy only until Climate/supported HVAC
    is documented — keep as context_shaping / fact_query; do **not** render
    ``(Configuration pending)`` when the section's primary control path is
    fully sourced (AC founding narrow of xxii; Controls primary-path xxii
    unchanged).
  * Prefer passive station prose — never address readers as ``Operators``
    (or ``Crew``) when the panel can be the subject.
  * Do not emit a generic Electrical Panel circuit-protection xref; AC guest
    operation does not require that pointer.
  * Seawater filter is a fitted-path requirement from the operators manual.
  * Inventory places follow global xlv (Equipment Locations table — never
    inline in capability).
"""

from __future__ import annotations

import re
from typing import Any

from guide_composition_rules import (
    WISDOM_PENDING,
    SECTION_SPINE,
    assess_global_composition,
    normalize_block,
)
from guide_composer_device import (
    build_device_index,
    guest_device_reference,
    section_plant_key,
)
from guide_reader_voice import (
    assess_reader_voice_style,
    resolve_vessel_display_name,
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
    DEPTH_SUMMARY,
    assemble_section_inputs,
    keys_at_depth,
)
from system_graph import VesselGraphResult

SECTION_ORDER = (
    "capability_summary",
    "how_it_works",
    "startup",
    "monitoring",
    "adjusting",
    "troubleshooting",
    "reference",
)

CONFIG_PLACEHOLDER_MARKER = "[[CONFIG_PENDING]]"

_FORBIDDEN_EXTRA = (
    re.compile(r"\bfrigomar_air_conditioning_system\b", re.I),
    re.compile(r"\bczone touch\b", re.I),
    re.compile(r"\bmasterbus\b", re.I),
    re.compile(r"\bcontrol surface\b", re.I),
    re.compile(r"\bday-to-day\b", re.I),
    re.compile(r"\bmodbus\b", re.I),
    re.compile(r"\bnmea\s*2000\b", re.I),
    re.compile(r"\bENDPOINT\b"),
    # AC founding: passive station prose — no Operators/Crew actor nouns.
    re.compile(r"\bOperators?\b"),
    re.compile(r"\bCrew\b"),
    re.compile(r"\(Configuration pending\)", re.I),
    re.compile(r"circuit protection", re.I),
)


def compose_ac_section(
    *,
    graph: VesselGraphResult,
    profiles: dict[str, dict[str, Any]],
    equipment_doc: dict[str, Any],
    section_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compose Air Conditioning Stage 4 (frozen tip v4.46; composer v4.1)."""
    boat = resolve_vessel_display_name(equipment_doc)
    device_index = build_device_index(equipment_doc)
    inputs = section_inputs or assemble_section_inputs(
        graph, "ac", equipment_doc=equipment_doc
    )

    full_keys = keys_at_depth(inputs, DEPTH_FULL)
    summary_keys = keys_at_depth(inputs, DEPTH_SUMMARY)
    provenance_keys = keys_at_depth(inputs, DEPTH_PROVENANCE)

    ac_key = section_plant_key(
        full_keys, device_index, "frigomar", "air_conditioning", "hvac"
    )
    profile: dict[str, Any] = {}
    if ac_key and ac_key in graph.devices:
        profile = dict(graph.devices[ac_key].profile or {})
    if not profile and ac_key:
        profile = dict(profiles.get(ac_key) or {})

    provenance_map: list[dict[str, Any]] = []
    block_order: list[str] = []
    context_shaping_consumed: list[dict[str, Any]] = []
    fact_queries: list[dict[str, str]] = []
    config_placeholder_ids: list[str] = []
    first_use: set[str] = set()

    def _name(key: str) -> str:
        return guest_device_reference(
            key,
            equipment_doc,
            profiles,
            index=device_index,
            first_use=first_use,
        )

    def _emit(
        text: str,
        *sources: str,
        kind: str = "sourced",
        block: str = "capability_summary",
        links: list[dict[str, str]] | None = None,
        topic: str = "",
        config_placeholder: bool = False,
    ) -> str:
        sid = f"S{len(provenance_map) + 1}"
        reader_text = text
        if config_placeholder and CONFIG_PLACEHOLDER_MARKER in text:
            reader_text = text.replace(CONFIG_PLACEHOLDER_MARKER, "").strip()
            reader_text = f"(Configuration pending) {reader_text}"
        if kind not in {"composed_inference", "config_placeholder"} and text.strip():
            abs_hits = lint_absence_prose(reader_text)
            if abs_hits:
                raise ValueError(
                    f"absence prose forbidden on {sid!r}: {abs_hits} in {reader_text!r}"
                )
        hits = lint_reader_vocabulary(reader_text)
        for rx in _FORBIDDEN_EXTRA:
            if rx.search(reader_text):
                hits.append(rx.pattern)
        if hits:
            raise ValueError(f"vocabulary lint failed on {sid!r}: {hits}")
        economy = lint_prose_economy(reader_text)
        for kind_name, econ_hits in economy.items():
            if econ_hits:
                raise ValueError(
                    f"prose economy ({kind_name}) failed on {sid!r}: {econ_hits}"
                )
        entry: dict[str, Any] = {
            "id": sid,
            "sentence": text if config_placeholder else reader_text,
            "sources": list(sources),
            "kind": "config_placeholder" if config_placeholder else kind,
            "block": block,
        }
        if links:
            entry["links"] = list(links)
        if topic:
            entry["topic"] = topic
        if config_placeholder:
            entry["config_placeholder"] = True
            config_placeholder_ids.append(sid)
        provenance_map.append(entry)
        if block not in block_order:
            block_order.append(block)
        return sid

    for flag in inputs.get("flags") or []:
        fname = str(flag.get("flag") or "")
        rel = flag_reader_relevance(fname)
        if rel == "context_shaping":
            context_shaping_consumed.append(dict(flag))

    for excl in inputs.get("candidates_excluded") or []:
        if not isinstance(excl, dict):
            continue
        context_shaping_consumed.append(
            {
                "flag": "control_path_boundary_excluded",
                "device": excl.get("device_key"),
                "detail": excl.get("note") or excl.get("candidacy"),
            }
        )

    surfaces = [
        s for s in (profile.get("control_surfaces") or []) if isinstance(s, dict)
    ]
    primary_surfaces = [
        s for s in surfaces if s.get("optional_accessory") is not True
    ]
    actions = [
        a for a in (profile.get("operator_actions") or []) if isinstance(a, dict)
    ]
    by_action = {
        str(a.get("action") or "").strip().lower(): a for a in actions
    }

    panel_label = "wall-mounted touch-screen"
    if primary_surfaces:
        raw = str(
            primary_surfaces[0].get("label_verbatim")
            or primary_surfaces[0].get("label")
            or ""
        ).strip()
        if raw:
            panel_label = raw

    if not ac_key:
        fact_queries.append(
            {
                "id": "ac_plant_present",
                "query": "Confirm air conditioning plant fitted for this section.",
                "status": "queued",
            }
        )
        _emit(
            f"On {boat}, air conditioning for this guide section is still "
            "pending plant confirmation.",
            "vessel.display_name",
            "graph.section:ac",
            kind="composed_inference",
            block="capability_summary",
            topic="gap",
        )
    else:
        label = _name(ac_key)

        # ========== CAPABILITY ==========
        _emit(
            f"On {boat}, cabin climate is handled by {label}.",
            f"graph.device:{ac_key}",
            f"equipment.{ac_key}",
            "vessel.display_name",
            f"profile.{ac_key}.device",
            block="capability_summary",
            topic="plant",
        )
        _emit(
            f"Routine control is from its {panel_label}.",
            f"graph.device:{ac_key}",
            f"profile.{ac_key}.control_surfaces",
            block="capability_summary",
            topic="station",
        )

        # ========== HOW IT WORKS ==========
        _emit(
            "From that panel you choose cooling, heating, dehumidification, "
            "automatic, or fan-only mode, set the temperature, and select "
            "fan speed.",
            f"profile.{ac_key}.operator_actions",
            f"profile.{ac_key}.control_surfaces",
            block="how_it_works",
            topic="modes",
        )
        supply = profile.get("supply_requirements") or []
        if supply:
            _emit(
                "The unit is seawater-cooled; a seawater filter protects the pump.",
                f"profile.{ac_key}.supply_requirements",
                block="how_it_works",
                topic="seawater",
            )

        # ========== STARTUP ==========
        if "turn unit on/off" in by_action:
            _emit(
                f"Turn the unit on from the {panel_label} when you want "
                "cooling or heating, and off when you are finished.",
                f"profile.{ac_key}.operator_actions",
                f"profile.{ac_key}.control_surfaces",
                block="startup",
                topic="on_off",
            )
        else:
            fact_queries.append(
                {
                    "id": "ac_on_off_action",
                    "query": "Confirm guest ON/OFF control on the wall touch-screen.",
                    "status": "queued",
                }
            )

        # ========== MONITORING ==========
        _emit(
            "The panel shows room temperature; alarms replace that reading "
            "in yellow until cleared.",
            f"profile.{ac_key}.operator_actions",
            f"profile.{ac_key}.alarm_severity",
            f"profile.{ac_key}.control_surfaces",
            block="monitoring",
            topic="display_alarms",
        )

        # ========== ADJUSTING ==========
        _emit(
            "On the panel, set mode, temperature, and fan speed for the "
            "climate you want; night mode and a relative timer are also "
            "available there.",
            f"profile.{ac_key}.operator_actions",
            f"profile.{ac_key}.control_surfaces",
            block="adjusting",
            topic="routine_adjust",
        )
        # Climate / digital path unsourced — context_shaping + fact_query only
        # (no Configuration-pending prose; primary wall-panel path is sourced).
        fact_queries.append(
            {
                "id": "ac_czone_climate_supported",
                "query": (
                    "Confirm whether CZone Climate / supported HVAC commands "
                    "this Frigomar installation on Supernova."
                ),
                "status": "queued",
                "note": (
                    "Primary guest UI is the wall touch-screen; digital Climate "
                    "path stays out of body until sourced (AC founding xxii "
                    "narrow)."
                ),
            }
        )

        # ========== TROUBLESHOOTING ==========
        _emit(
            "If an alarm appears, note the code on the panel, then clear it "
            "and restart the unit — or switch the unit off and on again.",
            f"profile.{ac_key}.operator_actions",
            f"profile.{ac_key}.safety_role",
            kind="composed_inference",
            block="troubleshooting",
            topic="alarm_restart",
        )
        pump = next(
            (
                a
                for a in actions
                if "seawater pump" in str(a.get("action") or "").lower()
            ),
            None,
        )
        if pump:
            _emit(
                "To run the seawater pump alone, hold the mode button for ten "
                "seconds while the unit is off until the mode icon turns yellow.",
                f"profile.{ac_key}.operator_actions",
                block="troubleshooting",
                topic="pump_only",
            )
        fact_queries.append(
            {
                "id": "ac_seawater_intake_location",
                "query": (
                    "Confirm seawater seacock / strainer location for guest "
                    "troubleshooting on this vessel."
                ),
                "status": "queued",
                "note": (
                    "Intake path not in Stage 1 profile — omitted from guest "
                    "body until sourced."
                ),
            }
        )

        # ========== REFERENCE ==========
        if supply:
            _emit(
                "Keep the seawater filter clean so the pump stays protected.",
                f"profile.{ac_key}.supply_requirements",
                block="reference",
                topic="filter_care",
            )

    title = "# Air Conditioning\n"
    paragraphs: list[str] = []
    ordered_blocks: list[str] = []
    for block in SECTION_ORDER:
        rows = [r for r in provenance_map if r.get("block") == block]
        if not rows:
            continue
        ordered_blocks.append(block)
        lines: list[str] = []
        for r in rows:
            text = str(r["sentence"])
            if r.get("config_placeholder") and CONFIG_PLACEHOLDER_MARKER in text:
                text = text.replace(CONFIG_PLACEHOLDER_MARKER, "").strip()
                text = f"(Configuration pending) {text}"
            lines.append(text)
        if block == "capability_summary" and len(lines) > 1:
            paragraphs.append(" ".join(lines))
        elif block == "how_it_works" and len(rows) > 1:
            body = [
                ln
                for ln, row in zip(lines, rows)
                if row.get("topic") != "xref_power"
            ]
            xref = [
                ln
                for ln, row in zip(lines, rows)
                if row.get("topic") == "xref_power"
            ]
            if body:
                paragraphs.append(" ".join(body) if len(body) > 1 else body[0])
            paragraphs.extend(xref)
        else:
            paragraphs.append("\n\n".join(lines))
    draft = title + "\n\n".join(paragraphs)

    vocab = lint_reader_vocabulary(draft)
    absence = lint_absence_prose(
        draft.replace("(Configuration pending)", "")
    )
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

    wisdom_slot = {
        "status": WISDOM_PENDING,
        "sentence_id": None,
        "block": "how_it_works",
        "inference_ids": [],
        "note": (
            "AC wisdom pending — seawater/rough-sea operating practice not "
            "yet owner-sourced beyond filter requirement."
        ),
    }

    return {
        "draft_markdown": draft,
        "provenance_map": provenance_map,
        "guide_links": guide_links,
        "section_inputs": inputs,
        "block_order": ordered_blocks,
        "section_order_template": list(SECTION_ORDER),
        "context_shaping_consumed": context_shaping_consumed,
        "summary_keys": summary_keys,
        "full_keys": full_keys,
        "provenance_keys": provenance_keys,
        "ac_key": ac_key,
        "excluded_candidates": list(inputs.get("candidates_excluded") or []),
        "vocabulary_lint": vocab,
        "absence_lint": absence,
        "prose_economy_lint": economy,
        "vessel_display_name": boat,
        "wisdom_slot": wisdom_slot,
        "fact_queries": fact_queries,
        "config_placeholder_ids": config_placeholder_ids,
        "version": "v4.1",
        "freeze_status": "frozen",
    }


def evaluate_ac_draft(
    composed: dict[str, Any],
    *,
    expected_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate Air Conditioning founding draft against v4 criteria."""
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
        composed, require_filled_wisdom=False
    )

    link_targets = {
        str(link.get("target_id"))
        for link in (composed.get("guide_links") or [])
        if link.get("target_kind") == "system"
    }
    has_placeholder = any(
        p.get("config_placeholder") or p.get("kind") == "config_placeholder"
        for p in prov
    ) or "(configuration pending)" in lower
    has_electrical_circuit_xref = (
        "circuit protection" in lower
        or (
            "electrical" in link_targets
            and "electrical panel section" in lower
        )
    )
    climate_query_queued = any(
        str(q.get("id") or "") == "ac_czone_climate_supported"
        for q in (composed.get("fact_queries") or [])
    )

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
        normalize_block(b) in SECTION_SPINE or b in SECTION_SPINE
        for b in block_order
    )
    has_startup = "startup" in block_order

    cap_rows = [
        p
        for p in prov
        if normalize_block(str(p.get("block") or "")) == "capability_summary"
        and str(p.get("sentence") or "").strip()
    ]
    first_cap = str(cap_rows[0].get("sentence") or "").lower() if cap_rows else ""
    function_first_ok = bool(first_cap) and boat.lower() in first_cap and (
        "climate" in first_cap or "air conditioner" in first_cap or "cooling" in first_cap
    )
    station_rows = [
        p for p in cap_rows if str(p.get("topic") or "") == "station"
    ]
    station_text = (
        str(station_rows[0].get("sentence") or "") if station_rows else ""
    )
    passive_station_ok = bool(
        re.match(r"(?i)^routine control is from\b", station_text.strip())
    )

    checks = {
        "unsourced_empty": len(unsourced) == 0,
        "vocabulary_clean": len(vocab_hits) == 0,
        "absence_clean": len(absence_hits) == 0,
        "economy_clean": not any(economy.values()) if isinstance(economy, dict) else True,
        "voice_ok": bool(voice.get("pass", True)),
        "global_composition_ok": bool(global_comp.get("pass")),
        "input_match": input_match,
        "block_order_ok": block_order_ok,
        "has_startup": has_startup,
        "function_first_ok": function_first_ok,
        "has_frigomar": "frigomar" in lower,
        "has_touch_screen": "touch-screen" in lower or "touchscreen" in lower,
        "has_on_off": "turn the unit on" in lower and "when you want" in lower,
        "has_modes": "cooling" in lower and "heating" in lower,
        "has_alarm_path": "alarm" in lower,
        "has_seawater_filter": "seawater filter" in lower,
        "has_pump_only": "seawater pump" in lower and "ten seconds" in lower,
        "no_electrical_circuit_xref": not has_electrical_circuit_xref,
        "no_config_placeholder_prose": not has_placeholder,
        "climate_fact_query_queued": climate_query_queued,
        "passive_station_prose": passive_station_ok,
        "no_operators_or_crew_actor": (
            "operator" not in lower and "crew" not in lower
        ),
        "no_modbus_nmea_jargon": "modbus" not in lower and "nmea" not in lower,
    }
    notes: list[str] = []
    if not input_match:
        notes.append(input_notes)
    for key, ok in checks.items():
        if not ok:
            notes.append(key)

    return {
        "pass": all(checks.values()),
        "checks": checks,
        "notes": notes,
        "style_warnings": voice.get("style_warnings") or [],
        "global_composition": global_comp,
        "version": composed.get("version"),
    }


__all__ = [
    "compose_ac_section",
    "evaluate_ac_draft",
]
