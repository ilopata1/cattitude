"""Stage 4 Heads & waste — founding composer (Playbook 2; not frozen).

Founding plant (Outremer / Supernova today):
  full — blackwater_tank_discharge_valve (PASSIVE inventory members)
  summary / provenance — empty

Standing policy (Heads discharge valves):
  * Deck **pump-out** does not require opening discharge valves; open a valve
    only to **empty** tanks overboard (owner review Heads v4.0).
  * Keep valves **closed** in marinas, ports, harbors, and anchorages.
  * Empty at sea only per **local rules**; in international waters that is
    typically ≥12 nm from land.
  * Inventory **places** follow global xlv (Equipment Locations table —
    never inline in capability).
  * Electric heads model is **unknown** on Supernova until owner confirms —
    emit honest ``fact_queries``; do not invent flush / waste-rule prose or
    assume Tecma from the Cattitude checklist.
  * Do not publish into ``PUBLISHED_SECTIONS`` until human review freezes
    the section (Playbook 2 §D).
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
from stage4_substrate import places_for_device
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
    "blackwater_tank_discharge_valve": "the blackwater tank discharge valves",
    "tecma_compass_eco": "the electric heads",
}

MANUFACTURER_MODEL: dict[str, tuple[str, str]] = {
    "blackwater_tank_discharge_valve": ("", "Blackwater Tank Discharge Valve"),
    "tecma_compass_eco": ("Tecma", "Compass Eco"),
}

# Standing Heads rule: never tell the guest to open discharge valves for
# marina/deck pump-out (owner review Heads v4.0 / legacy Fix holding_tank_full).
_PUMPOUT_VALVE_CONFLATION_RES = (
    re.compile(r"open\b.{0,40}\bpump[\s-]?out", re.I),
    re.compile(r"pump[\s-]?out\b.{0,40}\bopen", re.I),
    re.compile(r"pump out or empty", re.I),
)

_FORBIDDEN_EXTRA = (
    re.compile(r"\bblackwater_tank_discharge_valve\b", re.I),
    re.compile(r"\btecma_compass_eco\b", re.I),
    re.compile(r"\bcontrol surface\b", re.I),
    re.compile(r"\bday-to-day\b", re.I),
    re.compile(r"\bczone touch\b", re.I),
    re.compile(r"\bmasterbus\b", re.I),
)


def _vessel_fact(
    equipment_doc: dict[str, Any], fact_id: str
) -> dict[str, Any] | None:
    for fact in equipment_doc.get("vessel_facts") or []:
        if isinstance(fact, dict) and str(fact.get("id") or "") == fact_id:
            return fact
    return None


def compose_heads_section(
    *,
    graph: VesselGraphResult,
    profiles: dict[str, dict[str, Any]],
    equipment_doc: dict[str, Any],
    section_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compose Heads & waste Stage 4 (founding scaffold; not frozen)."""
    boat = resolve_vessel_display_name(equipment_doc)
    inputs = section_inputs or assemble_section_inputs(
        graph, "heads", equipment_doc=equipment_doc
    )

    full_keys = keys_at_depth(inputs, DEPTH_FULL)
    summary_keys = keys_at_depth(inputs, DEPTH_SUMMARY)
    provenance_keys = keys_at_depth(inputs, DEPTH_PROVENANCE)

    valve_keys = [
        k
        for k in full_keys
        if "discharge" in k or "blackwater" in k or "holding" in k
    ]
    # Non-valve heads-section members (toilets / macerators / etc.).
    head_keys = [k for k in full_keys if k not in valve_keys]

    valve_key = valve_keys[0] if valve_keys else None
    head_key = head_keys[0] if head_keys else None

    fact_pumpout = _vessel_fact(
        equipment_doc, "heads_discharge_valve_pumpout_vs_empty"
    )
    fact_nearshore = _vessel_fact(
        equipment_doc, "heads_discharge_valve_nearshore_closed"
    )
    fact_offshore = _vessel_fact(
        equipment_doc, "heads_discharge_empty_local_rules"
    )

    water_xref = format_section_xref("water")
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
            role = DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or "the equipment"
            mm = MANUFACTURER_MODEL.get(key) or MANUFACTURER_MODEL.get(base)
            if mm and mm[0]:
                return f"{role} ({mm[0]} {mm[1]})"
            if mm and mm[1]:
                return f"{role} ({mm[1]})"
            return role
        return DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or "the equipment"

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
        for rx in _PUMPOUT_VALVE_CONFLATION_RES:
            if rx.search(text):
                hits.append(f"pumpout_valve_conflation:{rx.pattern}")
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

    if not head_key:
        fact_queries.append(
            {
                "id": "heads_model_unknown",
                "query": (
                    "Identify which electric heads / toilets are fitted on "
                    "this vessel (manufacturer, model, quantity) before "
                    "drafting flush and waste-rule guest procedures."
                ),
                "status": "queued",
            }
        )
    else:
        fact_queries.append(
            {
                "id": "heads_quantity_and_locations",
                "query": (
                    "Confirm how many Tecma Compass Eco (or other) heads are "
                    "fitted and where each is located (cabin / hull side)."
                ),
                "status": "queued",
            }
        )

    if valve_key:
        if not places_for_device(equipment_doc, valve_key):
            fact_queries.append(
                {
                    "id": "discharge_valve_locations",
                    "query": (
                        "Confirm each blackwater discharge valve location "
                        "(hull / bilge / cabin) from walkthrough or vessel "
                        "artifact."
                    ),
                    "status": "queued",
                    "note": (
                        "No registry places yet for these valves. Global xlv: "
                        "Equipment Locations table when places are present — "
                        "do not list places inline in capability."
                    ),
                }
            )

    if head_key:
        label = _name(head_key)
        head_profile: dict[str, Any] = {}
        if head_key in graph.devices:
            head_profile = dict(graph.devices[head_key].profile or {})
        if not head_profile:
            head_profile = dict(profiles.get(head_key) or {})
        surfaces = [
            s
            for s in (head_profile.get("control_surfaces") or [])
            if isinstance(s, dict)
        ]
        primary = next(
            (s for s in surfaces if s.get("optional_accessory") is not True),
            surfaces[0] if surfaces else None,
        )
        panel = "ECO Rocker switch"
        if primary:
            raw = str(
                primary.get("label_verbatim") or primary.get("label") or ""
            ).strip()
            if raw:
                panel = raw

        _emit(
            f"On {boat}, the heads are {label}.",
            f"graph.device:{head_key}",
            f"equipment.{head_key}",
            "vessel.display_name",
            f"profile.{head_key}.device",
            block="capability_summary",
            topic="plant",
        )
        _emit(
            f"Each head is operated from its on-device {panel} — press the "
            "upper side to add water to the bowl, and the lower side to flush.",
            f"graph.device:{head_key}",
            f"profile.{head_key}.control_surfaces",
            f"profile.{head_key}.operator_actions",
            block="capability_summary",
            topic="station",
        )
        if valve_key:
            qty = 1
            for row in equipment_doc.get("equipment") or []:
                if not isinstance(row, dict):
                    continue
                if str(row.get("device_key") or "") == valve_key:
                    try:
                        qty = int(row.get("quantity") or 1)
                    except (TypeError, ValueError):
                        qty = 1
                    break
            mm = MANUFACTURER_MODEL.get(valve_key) or (
                "",
                "Blackwater Tank Discharge Valve",
            )
            model_bit = f" ({mm[1]})" if mm[1] else ""
            valve_phrase = (
                f"{qty} blackwater tank discharge valves{model_bit}"
                if qty > 1
                else f"a blackwater tank discharge valve{model_bit}"
            )
            first_use.add(valve_key)
            first_use.add(re.sub(r"_\d+$", "", valve_key))
            _emit(
                f"{valve_phrase[0].upper()}{valve_phrase[1:]} provide each "
                "tank's overboard discharge path — open a valve only when "
                "emptying the tanks at sea.",
                f"graph.device:{valve_key}",
                f"equipment.{valve_key}",
                f"profile.{valve_key}.device",
                *(
                    [f"vessel_fact.{fact_pumpout['id']}"]
                    if fact_pumpout
                    else []
                ),
                block="capability_summary",
                topic="valves",
            )
    elif valve_key:
        qty = 1
        for row in equipment_doc.get("equipment") or []:
            if not isinstance(row, dict):
                continue
            if str(row.get("device_key") or "") == valve_key:
                try:
                    qty = int(row.get("quantity") or 1)
                except (TypeError, ValueError):
                    qty = 1
                break
        mm = MANUFACTURER_MODEL.get(valve_key) or ("", "Blackwater Tank Discharge Valve")
        model_bit = f" ({mm[1]})" if mm[1] else ""
        if qty > 1:
            plant = f"{qty} blackwater tank discharge valves{model_bit}"
            verb = "are"
        else:
            plant = f"a blackwater tank discharge valve{model_bit}"
            verb = "is"
        first_use.add(valve_key)
        first_use.add(re.sub(r"_\d+$", "", valve_key))
        _emit(
            f"On {boat}, {plant} {verb} fitted and provide each tank's "
            "overboard discharge path — open a valve only when emptying "
            "the tanks at sea.",
            f"graph.device:{valve_key}",
            f"equipment.{valve_key}",
            "vessel.display_name",
            f"profile.{valve_key}.device",
            *(
                [f"vessel_fact.{fact_pumpout['id']}"]
                if fact_pumpout
                else []
            ),
            block="capability_summary",
            topic="plant",
        )
        _emit(
            "Electric-head flush and waste rules for this section are still "
            "pending — heads model not yet confirmed.",
            "fact_query.heads_model_unknown",
            "graph.section:heads",
            kind="composed_inference",
            block="capability_summary",
            topic="gap_heads",
        )
    else:
        fact_queries.append(
            {
                "id": "heads_plant_present",
                "query": "Confirm any sanitation equipment fitted for Heads.",
                "status": "queued",
            }
        )
        _emit(
            f"On {boat}, Heads & waste equipment for this guide section is "
            "not yet confirmed in the vessel plant.",
            "vessel.display_name",
            "graph.section:heads",
            kind="composed_inference",
            block="capability_summary",
            topic="gap",
        )

    if valve_key and fact_pumpout:
        _emit(
            "Marina pump-out uses the waste deck fitting with these valves "
            "left closed.",
            f"vessel_fact.{fact_pumpout['id']}",
            f"graph.device:{valve_key}",
            block="how_it_works",
            topic="pumpout_vs_empty",
        )
        _emit(
            "Open a discharge valve only when emptying the tanks overboard.",
            f"vessel_fact.{fact_pumpout['id']}",
            f"graph.device:{valve_key}",
            block="how_it_works",
            topic="empty_only",
        )

    if valve_key or head_key:
        _emit(
            "Fresh-water supply for heads, when fitted, is covered in "
            f"{water_xref['phrase']}; DC protection for sanitation circuits "
            f"can be found in {electrical_xref['phrase']}.",
            "xref.water",
            "xref.electrical",
            block="how_it_works",
            topic="xref_support",
            links=[
                section_xref_link("water"),
                section_xref_link("electrical"),
            ],
        )

    if valve_key and fact_nearshore:
        _emit(
            "Keep the discharge valves closed in marinas, ports, harbors, "
            "and anchorages.",
            f"vessel_fact.{fact_nearshore['id']}",
            f"graph.device:{valve_key}",
            block="adjusting",
            topic="nearshore_closed",
        )
    if valve_key and fact_offshore:
        _emit(
            "Empty the tanks at sea only where local rules allow — in "
            "international waters that is typically at least 12 nautical "
            "miles from land.",
            f"vessel_fact.{fact_offshore['id']}",
            f"graph.device:{valve_key}",
            block="adjusting",
            topic="offshore_rules",
        )

    ordered_blocks = [b for b in SECTION_ORDER if b in block_order]

    lines_by_block: dict[str, list[str]] = {}
    rows_by_block: dict[str, list[dict[str, Any]]] = {}
    for row in provenance_map:
        block = str(row.get("block") or "")
        lines_by_block.setdefault(block, []).append(str(row.get("sentence") or ""))
        rows_by_block.setdefault(block, []).append(row)

    title = "# Heads & waste\n\n"
    paragraphs: list[str] = []
    for block in ordered_blocks:
        lines = lines_by_block.get(block) or []
        rows = rows_by_block.get(block) or []
        if not lines:
            continue
        if block == "how_it_works":
            body = [
                ln
                for ln, row in zip(lines, rows)
                if row.get("topic") != "xref_support"
            ]
            xref = [
                ln
                for ln, row in zip(lines, rows)
                if row.get("topic") == "xref_support"
            ]
            if body:
                paragraphs.append(" ".join(body) if len(body) > 1 else body[0])
            paragraphs.extend(xref)
        elif block == "capability_summary":
            plant = [
                ln
                for ln, row in zip(lines, rows)
                if row.get("topic") in ("plant", "station", "valves")
            ]
            gaps = [
                ln
                for ln, row in zip(lines, rows)
                if row.get("topic") not in ("plant", "station", "valves")
            ]
            if plant:
                paragraphs.append(" ".join(plant))
            paragraphs.extend(gaps)
        else:
            paragraphs.append("\n\n".join(lines))
    draft = title + "\n\n".join(paragraphs)

    vocab = lint_reader_vocabulary(draft)
    absence = lint_absence_prose(draft)
    economy = lint_prose_economy(draft)
    pumpout_hits = [
        rx.pattern
        for rx in _PUMPOUT_VALVE_CONFLATION_RES
        if rx.search(draft)
    ]

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
            "Heads wisdom pending — heads model unknown; valve places follow "
            "global xlv (Equipment Locations table)."
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
        "valve_key": valve_key,
        "head_key": head_key,
        "valve_places_present": bool(
            valve_key and places_for_device(equipment_doc, valve_key)
        ),
        "excluded_candidates": list(inputs.get("candidates_excluded") or []),
        "vocabulary_lint": vocab,
        "absence_lint": absence,
        "prose_economy_lint": economy,
        "pumpout_valve_conflation_lint": pumpout_hits,
        "vessel_display_name": boat,
        "wisdom_slot": wisdom_slot,
        "fact_queries": fact_queries,
        "version": "v4.0-founding",
        "freeze_status": "preparing",
        "review_round": "owner_valve_rules_v1",
    }


def evaluate_heads_draft(
    composed: dict[str, Any],
    *,
    expected_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate founding Heads draft (pre-freeze criteria subset)."""
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
    pumpout_hits = list(composed.get("pumpout_valve_conflation_lint") or [])
    if not pumpout_hits:
        pumpout_hits = [
            rx.pattern
            for rx in _PUMPOUT_VALVE_CONFLATION_RES
            if rx.search(draft)
        ]

    link_targets = {
        str(link.get("target_id"))
        for link in (composed.get("guide_links") or [])
        if link.get("target_kind") == "system"
    }

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

    cap_rows = [
        p
        for p in prov
        if normalize_block(str(p.get("block") or "")) == "capability_summary"
        and str(p.get("sentence") or "").strip()
    ]
    first_cap = str(cap_rows[0].get("sentence") or "").lower() if cap_rows else ""
    function_first_ok = bool(first_cap) and boat.lower() in first_cap

    has_discharge = "discharge" in lower or "blackwater" in lower
    fact_ids = {
        str(q.get("id"))
        for q in (composed.get("fact_queries") or [])
        if isinstance(q, dict)
    }
    has_plant = bool(composed.get("valve_key") or composed.get("head_key"))
    has_valve = bool(composed.get("valve_key"))

    checks = {
        "unsourced_empty": len(unsourced) == 0,
        "vocabulary_clean": len(vocab_hits) == 0,
        "absence_clean": len(absence_hits) == 0,
        "economy_clean": not any(economy.values()) if isinstance(economy, dict) else True,
        "voice_ok": bool(voice.get("pass", True)),
        "global_composition_ok": bool(global_comp.get("pass")),
        "input_match": input_match,
        "block_order_ok": block_order_ok,
        "function_first_ok": function_first_ok,
        "has_discharge_or_gap": has_discharge or "heads_plant_present" in fact_ids,
        "heads_model_gap_queued": "heads_model_unknown" in fact_ids
        or "heads_quantity_and_locations" in fact_ids
        or composed.get("head_key") is not None,
        "valve_locations_ok": (not has_valve)
        or bool(composed.get("valve_places_present"))
        or "discharge_valve_locations" in fact_ids,
        "no_pumpout_valve_conflation": len(pumpout_hits) == 0,
        "nearshore_closed_ok": (not has_valve)
        or (
            "marina" in lower
            and "closed" in lower
            and ("harbor" in lower or "harbour" in lower or "anchorage" in lower)
        ),
        "offshore_local_rules_ok": (not has_valve)
        or ("local rules" in lower and ("12" in lower or "twelve" in lower)),
        "water_xref_ok": (not has_plant) or ("water" in link_targets),
        "electrical_xref_ok": (not has_plant) or ("electrical" in link_targets),
    }

    notes: list[str] = []
    if not input_match:
        notes.append(input_notes)
    if pumpout_hits:
        notes.append(f"pumpout_conflation={pumpout_hits}")
    for key, ok in checks.items():
        if not ok:
            notes.append(key)

    style_warnings = list(voice.get("style_warnings") or [])
    return {
        "pass": all(checks.values()),
        "checks": checks,
        "notes": notes,
        "style_warnings": style_warnings,
        "global_composition": global_comp,
    }
