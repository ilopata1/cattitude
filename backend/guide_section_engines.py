"""Stage 4 Engines — Nanni N4.65 twin diesel plant (ISLAND).

Frozen for reuse (spec v4.41; founding composer v4.1; xliv station in v4.40).

Uses ``assemble_section_inputs`` depths:
  full — nanni_n4_65 (section member)
  summary / provenance — empty on Outremer today

Standing policy: maintenance / commissioning / storage actions stay out of the
guest body (shaped as context). Guest spine is start / stop / monitor from the
Nanni instrument panel, with raw-water exhaust confirmation after start.
Affirmative station only (xliv).
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
from guide_reader_voice import (
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

DISPLAY_NAMES: dict[str, str] = {
    "nanni_n4_65": "the engines",
}

MANUFACTURER_MODEL: dict[str, tuple[str, str]] = {
    "nanni_n4_65": ("Nanni", "N4.65"),
}

# Maintenance / commissioning / storage — shaped out of guest body.
_OMIT_ACTIONS = frozenset(
    {
        "run engine to operating temperature",
        "inspect and clean the boat and raw water system",
        "drain and change engine and transmission oil",
        "check coolant level and condition",
        "check operation of control cables",
        "operate engine at or below 1200 rpm with no load for 1-2 minutes",
        "check the engine and transmission oil level",
        "top up coolant if necessary",
    }
)

_FORBIDDEN_EXTRA = (
    re.compile(r"\bmasterview\b", re.I),
    re.compile(r"\bnanni_n4_65\b", re.I),
    re.compile(r"\bcontrol surface\b", re.I),
    re.compile(r"\bday-to-day\b", re.I),
    re.compile(r"\bczone touch\b", re.I),
    re.compile(r"\bmasterbus\b", re.I),
)


def compose_engines_section(
    *,
    graph: VesselGraphResult,
    profiles: dict[str, dict[str, Any]],
    equipment_doc: dict[str, Any],
    section_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compose Engines Stage 4 for the vessel (v4.1 founding)."""
    boat = resolve_vessel_display_name(equipment_doc)
    inputs = section_inputs or assemble_section_inputs(
        graph, "engines", equipment_doc=equipment_doc
    )

    full_keys = keys_at_depth(inputs, DEPTH_FULL)
    summary_keys = keys_at_depth(inputs, DEPTH_SUMMARY)
    provenance_keys = keys_at_depth(inputs, DEPTH_PROVENANCE)

    eng_key = next(
        (
            k
            for k in full_keys
            if k.startswith("nanni") or "engine" in k
        ),
        full_keys[0] if full_keys else None,
    )
    profile: dict[str, Any] = {}
    if eng_key and eng_key in graph.devices:
        profile = dict(graph.devices[eng_key].profile or {})
    if not profile and eng_key:
        profile = dict(profiles.get(eng_key) or {})

    qty = 1
    if eng_key:
        for row in equipment_doc.get("equipment") or []:
            if not isinstance(row, dict):
                continue
            if str(row.get("device_key") or "") == eng_key or str(
                row.get("catalog_key") or ""
            ) == eng_key:
                try:
                    qty = int(row.get("quantity") or 1)
                except (TypeError, ValueError):
                    qty = 1
                break
    engines_noun = "engines" if qty >= 2 else "engine"
    engines_phrase = "the engines" if qty >= 2 else "the engine"

    batteries_xref = format_section_xref("batteries")
    electrical_xref = format_section_xref("electrical")

    provenance_map: list[dict[str, Any]] = []
    block_order: list[str] = []
    context_shaping_consumed: list[dict[str, Any]] = []
    fact_queries: list[dict[str, str]] = []
    first_use: set[str] = set()

    def _name(key: str) -> str:
        base = re.sub(r"_\d+$", "", key)
        if key not in first_use and base not in first_use:
            first_use.add(key)
            first_use.add(base)
            role = DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or engines_phrase
            mm = MANUFACTURER_MODEL.get(key) or MANUFACTURER_MODEL.get(base)
            if mm and mm[0]:
                return f"{role} ({mm[0]} {mm[1]})"
            if mm:
                return f"{role} ({mm[1]})"
            return role
        return DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or engines_phrase

    def _emit(
        text: str,
        *sources: str,
        kind: str = "sourced",
        block: str = "capability_summary",
        links: list[dict[str, str]] | None = None,
        topic: str = "",
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
        if links:
            entry["links"] = list(links)
        if topic:
            entry["topic"] = topic
        provenance_map.append(entry)
        if block not in block_order:
            block_order.append(block)
        return sid

    for flag in inputs.get("flags") or []:
        fname = str(flag.get("flag") or "")
        rel = flag_reader_relevance(fname)
        if rel == "context_shaping":
            context_shaping_consumed.append(dict(flag))

    surfaces = [
        s for s in (profile.get("control_surfaces") or []) if isinstance(s, dict)
    ]
    primary_surfaces = [
        s for s in surfaces if s.get("optional_accessory") is not True
    ]
    for surf in surfaces:
        if surf.get("optional_accessory") is True:
            context_shaping_consumed.append(
                {
                    "flag": "optional_accessory_omitted",
                    "device": eng_key,
                    "surface": surf.get("label_verbatim") or surf.get("label"),
                    "detail": "Optional accessory not treated as fitted in guest body",
                }
            )

    actions = [
        a for a in (profile.get("operator_actions") or []) if isinstance(a, dict)
    ]
    by_action = {
        str(a.get("action") or "").strip().lower(): a for a in actions
    }

    for omit in _OMIT_ACTIONS:
        if omit in by_action:
            act = by_action[omit]
            context_shaping_consumed.append(
                {
                    "flag": "commissioning_action_omitted"
                    if str(act.get("context") or "") == "commissioning"
                    else "maintenance_action_omitted",
                    "device": eng_key,
                    "action": act.get("action"),
                    "detail": "Maintenance / commissioning / storage — omit from guest body",
                }
            )

    if not eng_key:
        fact_queries.append(
            {
                "id": "engines_plant_present",
                "query": "Confirm propulsion engines fitted on this vessel.",
                "status": "queued",
            }
        )
        _emit(
            f"On {boat}, propulsion {engines_noun} for this guide section are "
            "not yet confirmed in the vessel plant.",
            "vessel.display_name",
            "graph.section:engines",
            kind="composed_inference",
            block="capability_summary",
            topic="gap",
        )
    else:
        label = _name(eng_key)
        panel_label = "Nanni instrument panel"
        if primary_surfaces:
            raw = str(
                primary_surfaces[0].get("label_verbatim")
                or primary_surfaces[0].get("label")
                or ""
            ).strip()
            if raw:
                panel_label = raw.split("(")[0].strip() or panel_label

        # ========== CAPABILITY ==========
        _emit(
            f"On {boat}, propulsion is handled by {label}.",
            f"graph.device:{eng_key}",
            f"equipment.{eng_key}",
            "vessel.display_name",
            f"profile.{eng_key}.device",
            block="capability_summary",
            topic="plant",
        )
        _emit(
            f"They are started and stopped from the {panel_label} at the helm.",
            f"graph.device:{eng_key}",
            f"profile.{eng_key}.control_surfaces",
            f"profile.{eng_key}.networks",
            f"profile.{eng_key}.data_roles",
            block="capability_summary",
            topic="station",
        )

        # ========== HOW IT WORKS ==========
        _emit(
            f"The {panel_label} uses a key or ON/STOP switch with a Start "
            "button and warning lamps; put the control lever in neutral before "
            "starting.",
            f"profile.{eng_key}.control_surfaces",
            f"profile.{eng_key}.operator_actions",
            block="how_it_works",
            topic="panel",
        )
        _emit(
            "Starting power and charging context can be found in "
            f"{batteries_xref['phrase']}; DC protection and distribution can "
            f"be found in {electrical_xref['phrase']}.",
            "xref.batteries",
            "xref.electrical",
            block="how_it_works",
            topic="xref_power",
            links=[
                section_xref_link("batteries"),
                section_xref_link("electrical"),
            ],
        )

        # ========== STARTUP ==========
        if "start the engine" in by_action:
            _emit(
                f"Start each engine from the {panel_label} with the control "
                "lever in neutral, then confirm raw water flows from the "
                "exhaust outlet once the engine is running.",
                f"profile.{eng_key}.operator_actions",
                f"profile.{eng_key}.control_surfaces",
                f"graph.device:{eng_key}",
                block="startup",
                topic="start",
            )
        else:
            fact_queries.append(
                {
                    "id": "engines_start_action",
                    "query": "Confirm guest start procedure on the Nanni instrument panel.",
                    "status": "queued",
                }
            )

        fact_queries.append(
            {
                "id": "engines_panel_variant",
                "query": (
                    "Confirm which Nanni instrument panel variant is fitted "
                    "(Analog Type3/Type4, Electronic C5/C4 PRO, or Digital SI4) "
                    "and whether it is key or keyless."
                ),
                "status": "queued",
            }
        )
        fact_queries.append(
            {
                "id": "engines_seacock_and_bay_places",
                "query": (
                    "Confirm port and starboard engine-bay places and raw-water "
                    "seacock locations for this vessel."
                ),
                "status": "queued",
                "note": (
                    "Places not in Stage 1 profile — Equipment Locations table "
                    "and guest troubleshooting stay lean until sourced."
                ),
            }
        )

        # ========== MONITORING ==========
        if "check engine coolant temperature and oil pressure" in by_action:
            _emit(
                f"While under way, watch coolant temperature and oil pressure "
                f"on the {panel_label}; stop promptly if either goes abnormal.",
                f"profile.{eng_key}.operator_actions",
                f"profile.{eng_key}.control_surfaces",
                block="monitoring",
                topic="gauges",
            )
        else:
            _emit(
                f"While under way, use the {panel_label} warning lamps and "
                "gauges to confirm the engines are running normally.",
                f"profile.{eng_key}.control_surfaces",
                block="monitoring",
                topic="panel_status",
            )

        # ========== ADJUSTING ==========
        if "stop the engine" in by_action:
            _emit(
                f"Stop each engine from the {panel_label} (key counter-clockwise "
                "or ON/STOP) after a short idle in neutral — never by opening "
                "the main battery switch while running.",
                f"profile.{eng_key}.operator_actions",
                f"profile.{eng_key}.control_surfaces",
                block="adjusting",
                topic="stop",
            )

        # ========== TROUBLESHOOTING ==========
        _emit(
            "If an engine will not start, confirm the control lever is in "
            "neutral, the panel is powered, and fuses or the main switch have "
            "not opened — then retry from the panel.",
            f"profile.{eng_key}.operator_actions",
            f"profile.{eng_key}.control_surfaces",
            kind="composed_inference",
            block="troubleshooting",
            topic="no_start",
        )
        if "close the seacock to avoid filling the muffler with water" in by_action:
            _emit(
                "If the engine is reluctant to start after several attempts, "
                "close the raw-water seacock before further cranking so the "
                "muffler does not fill with water; reopen the seacock before "
                "the next successful start.",
                f"profile.{eng_key}.operator_actions",
                block="troubleshooting",
                topic="reluctant_start",
            )
        if "stop engine if there are any signs of part failure" in by_action:
            _emit(
                "Stop immediately if oil pressure drops suddenly, coolant "
                "temperature climbs, or there are other signs of part failure.",
                f"profile.{eng_key}.operator_actions",
                f"profile.{eng_key}.safety_role",
                block="troubleshooting",
                topic="emergency_stop",
            )

        # ========== REFERENCE ==========
        _emit(
            "Daily care includes oil and coolant level checks and keeping the "
            "raw-water filter clear — deeper service intervals belong with the "
            "operators manual and yard schedule.",
            f"profile.{eng_key}.operator_actions",
            kind="composed_inference",
            block="reference",
            topic="care",
        )

    title = "# Engines\n"
    paragraphs: list[str] = []
    ordered_blocks: list[str] = []
    for block in SECTION_ORDER:
        rows = [r for r in provenance_map if r.get("block") == block]
        if not rows:
            continue
        ordered_blocks.append(block)
        lines = [str(r["sentence"]) for r in rows]
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

    wisdom_slot = {
        "status": WISDOM_PENDING,
        "sentence_id": None,
        "block": "how_it_works",
        "inference_ids": [],
        "note": (
            "Engines wisdom pending — comparative handling or twin-sync claim "
            "not yet sourced beyond panel start/stop."
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
        "engines_key": eng_key,
        "excluded_candidates": list(inputs.get("candidates_excluded") or []),
        "vocabulary_lint": vocab,
        "absence_lint": absence,
        "prose_economy_lint": economy,
        "vessel_display_name": boat,
        "wisdom_slot": wisdom_slot,
        "fact_queries": fact_queries,
        "version": "v4.1",
    }


def evaluate_engines_draft(
    composed: dict[str, Any],
    *,
    expected_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate Engines draft against founding criteria."""
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

    masterview_leak = bool(re.search(r"\bmasterview\b", lower))

    link_targets = {
        str(link.get("target_id"))
        for link in (composed.get("guide_links") or [])
        if link.get("target_kind") == "system"
    }
    batteries_xref_ok = (
        "batteries" in link_targets and "section of this guide" in lower
    )
    electrical_xref_ok = (
        "electrical" in link_targets and "section of this guide" in lower
    )

    has_nanni = "nanni" in lower
    has_panel = "instrument panel" in lower or "nanni instrument" in lower
    has_start = "start" in lower
    has_stop = "stop" in lower
    has_raw_water = "raw water" in lower or "exhaust" in lower

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
        "propulsion" in first_cap or "engine" in first_cap
    )

    maintenance_shaped = any(
        str(c.get("flag") or "") == "maintenance_action_omitted"
        for c in (composed.get("context_shaping_consumed") or [])
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
        "has_nanni": has_nanni,
        "has_panel": has_panel,
        "has_start": has_start,
        "has_stop": has_stop,
        "has_raw_water": has_raw_water,
        "batteries_xref_ok": batteries_xref_ok,
        "electrical_xref_ok": electrical_xref_ok,
        "no_masterview": not masterview_leak,
        "maintenance_shaped": maintenance_shaped,
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
    "compose_engines_section",
    "evaluate_engines_draft",
]
