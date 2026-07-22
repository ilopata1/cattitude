"""Stage 4 Water systems — Dessalator Duo AC & DC Navigator (ISLAND).

Frozen for reuse (spec v4.39; founding composer v4.1).

Uses ``assemble_section_inputs`` depths:
  full — dessalator_duo (section member)
  summary / provenance — empty on Outremer today

Standing policy: optional Mini Remote Control is not treated as fitted when
``optional_accessory`` / unresolved-dependency flags say so. Commissioning
``flush system`` stays out of the guest body; start/stop/restart + DC supply
caveat + membrane rinse are guest-facing.
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
    "dessalator_duo": "the watermaker",
}

MANUFACTURER_MODEL: dict[str, tuple[str, str]] = {
    "dessalator_duo": ("Dessalator", "Duo AC & DC Navigator"),
}

_FORBIDDEN_EXTRA = (
    re.compile(r"\bmini remote\b", re.I),
    re.compile(r"\bczone touch\b", re.I),
    re.compile(r"\bmasterbus\b", re.I),
    re.compile(r"\bdessalator_duo\b", re.I),
    re.compile(r"\bcontrol surface\b", re.I),
    re.compile(r"\bday-to-day\b", re.I),
)

_COMMISSIONING_LEAK_RES = (
    re.compile(r"\bflush(?:ing)?\b", re.I),
    re.compile(r"\bfirst use\b", re.I),
)


def compose_water_section(
    *,
    graph: VesselGraphResult,
    profiles: dict[str, dict[str, Any]],
    equipment_doc: dict[str, Any],
    section_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compose Water systems Stage 4 for the vessel (v4.1; frozen spec v4.39)."""
    boat = resolve_vessel_display_name(equipment_doc)
    inputs = section_inputs or assemble_section_inputs(
        graph, "water", equipment_doc=equipment_doc
    )

    full_keys = keys_at_depth(inputs, DEPTH_FULL)
    summary_keys = keys_at_depth(inputs, DEPTH_SUMMARY)
    provenance_keys = keys_at_depth(inputs, DEPTH_PROVENANCE)

    wm_key = next(
        (k for k in full_keys if k.startswith("dessalator") or "watermaker" in k),
        full_keys[0] if full_keys else None,
    )
    profile: dict[str, Any] = {}
    if wm_key and wm_key in graph.devices:
        profile = dict(graph.devices[wm_key].profile or {})
    if not profile and wm_key:
        profile = dict(profiles.get(wm_key) or {})

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
            role = DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or "the watermaker"
            mm = MANUFACTURER_MODEL.get(key) or MANUFACTURER_MODEL.get(base)
            if mm and mm[0]:
                return f"{role} ({mm[0]} {mm[1]})"
            if mm:
                return f"{role} ({mm[1]})"
            return role
        return DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or "the watermaker"

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
    optional_surfaces = [
        s for s in surfaces if s.get("optional_accessory") is True
    ]
    primary_surfaces = [
        s for s in surfaces if s.get("optional_accessory") is not True
    ]
    for surf in optional_surfaces:
        context_shaping_consumed.append(
            {
                "flag": "optional_accessory_omitted",
                "device": wm_key,
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

    # Commissioning flush — operator audience but not guest day-session body.
    flush = by_action.get("flush system")
    if flush:
        context_shaping_consumed.append(
            {
                "flag": "commissioning_action_omitted",
                "device": wm_key,
                "action": flush.get("action"),
                "detail": "First-use / post-maintenance flush — omit from guest body",
            }
        )

    if not wm_key:
        fact_queries.append(
            {
                "id": "water_plant_present",
                "query": "Confirm watermaker (or other fresh-water plant) fitted.",
                "status": "queued",
            }
        )
        _emit(
            f"On {boat}, fresh-water making gear for this guide section is not "
            "yet confirmed in the vessel plant.",
            "vessel.display_name",
            "graph.section:water",
            kind="composed_inference",
            block="capability_summary",
            topic="gap",
        )
    else:
        label = _name(wm_key)
        panel_label = "NAVIGATOR control panel"
        if primary_surfaces:
            raw = str(
                primary_surfaces[0].get("label_verbatim")
                or primary_surfaces[0].get("label")
                or ""
            ).strip()
            if raw:
                # Guest-facing short name — drop parenthetical switch detail.
                panel_label = raw.split("(")[0].strip() or panel_label

        # ========== CAPABILITY ==========
        _emit(
            f"On {boat}, fresh water can be made on board with {label}.",
            f"graph.device:{wm_key}",
            f"equipment.{wm_key}",
            "vessel.display_name",
            f"profile.{wm_key}.device",
            block="capability_summary",
            topic="plant",
        )
        _emit(
            "It is a standalone unit — not switched from the boat's digital "
            f"switching system — and is operated from its {panel_label}.",
            f"graph.device:{wm_key}",
            f"profile.{wm_key}.control_surfaces",
            f"profile.{wm_key}.networks",
            f"profile.{wm_key}.data_roles",
            block="capability_summary",
            topic="station",
        )

        # ========== HOW IT WORKS ==========
        _emit(
            f"The {panel_label} selects AC or DC supply and sets working "
            "pressure with its motorized pressure-regulator knob.",
            f"profile.{wm_key}.control_surfaces",
            block="how_it_works",
            topic="panel",
        )
        supply = profile.get("supply_requirements") or []
        if supply:
            _emit(
                "When running on 12 V or 24 V DC for more than five minutes, "
                "an engine, shore charger, or generator must be on to support "
                "the load.",
                f"profile.{wm_key}.supply_requirements",
                block="how_it_works",
                topic="dc_supply",
            )
            _emit(
                "Battery bank and charging context can be found in "
                f"{batteries_xref['phrase']}; DC protection and distribution "
                f"can be found in {electrical_xref['phrase']}.",
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
        if "start watermaker" in by_action:
            _emit(
                f"Start the watermaker from the {panel_label} when you need to "
                "begin fresh water production.",
                f"profile.{wm_key}.operator_actions",
                f"graph.device:{wm_key}",
                block="startup",
                topic="start",
            )
        else:
            fact_queries.append(
                {
                    "id": "watermaker_start_action",
                    "query": "Confirm guest start procedure on the NAVIGATOR panel.",
                    "status": "queued",
                }
            )

        # ========== MONITORING ==========
        _emit(
            f"While producing, use the {panel_label} to confirm the unit is "
            "running and to adjust voltage selection or working pressure.",
            f"profile.{wm_key}.control_surfaces",
            block="monitoring",
            topic="panel_status",
        )

        # ========== ADJUSTING ==========
        if "stop watermaker" in by_action:
            _emit(
                f"Stop the watermaker from the {panel_label} to put it in "
                "stand-by when you no longer need to make water.",
                f"profile.{wm_key}.operator_actions",
                block="adjusting",
                topic="stop",
            )
        if "restart watermaker" in by_action:
            _emit(
                "Restart from the same panel after a stop when you are ready "
                "to produce again.",
                f"profile.{wm_key}.operator_actions",
                block="adjusting",
                topic="restart",
            )

        # ========== TROUBLESHOOTING ==========
        _emit(
            "If the watermaker will not produce, confirm the panel voltage "
            "selection and that an engine, shore charger, or generator is on "
            "when running on 12 V or 24 V DC — then retry start from the panel.",
            f"profile.{wm_key}.supply_requirements",
            f"profile.{wm_key}.operator_actions",
            f"profile.{wm_key}.control_surfaces",
            kind="composed_inference",
            block="troubleshooting",
            topic="no_produce",
        )
        fact_queries.append(
            {
                "id": "watermaker_intake_and_tank_path",
                "query": (
                    "Confirm seacock / strainer location and which tank the "
                    "Duo fills on this vessel."
                ),
                "status": "queued",
                "note": (
                    "Intake/tank path not in Stage 1 profile — omitted from "
                    "guest troubleshooting until sourced."
                ),
            }
        )

        # ========== REFERENCE (care / maintenance) ==========
        if "rinse membranes" in by_action:
            _emit(
                "Rinse the membranes from the panel after prolonged inactivity "
                "to protect membrane quality.",
                f"profile.{wm_key}.operator_actions",
                block="reference",
                topic="rinse",
            )

    title = "# Water systems\n"
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
            "Water wisdom pending — comparative production/care claim not "
            "yet sourced beyond supply caveat."
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
        "watermaker_key": wm_key,
        "excluded_candidates": list(inputs.get("candidates_excluded") or []),
        "vocabulary_lint": vocab,
        "absence_lint": absence,
        "prose_economy_lint": economy,
        "vessel_display_name": boat,
        "wisdom_slot": wisdom_slot,
        "fact_queries": fact_queries,
        "version": "v4.1",
    }


def evaluate_water_draft(
    composed: dict[str, Any],
    *,
    expected_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate Water draft against frozen criteria (spec v4.39)."""
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

    commissioning_leak = any(rx.search(draft) for rx in _COMMISSIONING_LEAK_RES)
    mini_remote_leak = bool(re.search(r"\bmini remote\b", lower))

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

    has_dessalator = "dessalator" in lower
    has_navigator = "navigator" in lower
    has_start = "start" in lower
    has_stop = "stand-by" in lower or "stop" in lower
    has_dc_caveat = "five minutes" in lower or "5 minutes" in lower
    has_rinse = "rinse" in lower

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
        "fresh water" in first_cap or "watermaker" in first_cap
    )

    optional_omitted = any(
        str(c.get("flag") or "") == "optional_accessory_omitted"
        for c in (composed.get("context_shaping_consumed") or [])
    )
    flush_omitted = any(
        str(c.get("flag") or "") == "commissioning_action_omitted"
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
        "has_dessalator": has_dessalator,
        "has_navigator": has_navigator,
        "has_start": has_start,
        "has_stop": has_stop,
        "has_dc_caveat": has_dc_caveat,
        "has_rinse": has_rinse,
        "batteries_xref_ok": batteries_xref_ok,
        "electrical_xref_ok": electrical_xref_ok,
        "no_commissioning_flush": not commissioning_leak,
        "no_mini_remote": not mini_remote_leak,
        "optional_accessory_shaped": optional_omitted,
        "flush_shaped": flush_omitted,
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
    "compose_water_section",
    "evaluate_water_draft",
]
