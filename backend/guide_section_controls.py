"""Stage 4 Controls & Monitoring section — CZone station as the owner meets it.

Uses ``assemble_section_inputs`` depths:
  full — Touch 7 + CZone platform
  summary — Combi / MLI from present platform pages (not Alphas)
  provenance — bridges / COIs (never named in body)

Standing policy: ship-with-honest-gaps — ``config_unsourced`` yields a
boat-upgradeable placeholder; never blocks the section.
"""

from __future__ import annotations

import re
from typing import Any

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
    DEPTH_SUMMARY,
    assemble_section_inputs,
    keys_at_depth,
)
from channel_map_circuits import control_page_circuit_names
from system_graph import VesselGraphResult

SECTION_ORDER = (
    "capability_summary",
    "monitoring",
    "adjusting",
    "troubleshooting",
    "reference",
)

DISPLAY_NAMES: dict[str, str] = {
    "czone_touch_7": "the touchscreen",
    "czone_2_0": "CZone",
    "mass_combi_pro": "the inverter-chargers",
    "mass_combi_pro_1": "the port inverter-charger",
    "mass_combi_pro_2": "the starboard inverter-charger",
    "mli_ultra": "the house batteries",
    "mli_ultra_1": "house battery 1",
    "mli_ultra_2": "house battery 2",
    "mli_ultra_3": "house battery 3",
}

MANUFACTURER_MODEL: dict[str, tuple[str, str]] = {
    "czone_touch_7": ("CZone", "Touch 7"),
    "czone_2_0": ("CZone", "2.0"),
    "mass_combi_pro": ("Mastervolt", "Mass Combi Pro"),
    "mass_combi_pro_1": ("Mastervolt", "Mass Combi Pro"),
    "mass_combi_pro_2": ("Mastervolt", "Mass Combi Pro"),
    "mli_ultra": ("Mastervolt", "MLI Ultra"),
    "mli_ultra_1": ("Mastervolt", "MLI Ultra"),
    "mli_ultra_2": ("Mastervolt", "MLI Ultra"),
    "mli_ultra_3": ("Mastervolt", "MLI Ultra"),
}

_FORBIDDEN_EXTRA = (
    re.compile(r"\bmasterbus_bridge_interface\b", re.I),
    re.compile(r"\bcoi\b", re.I),
    re.compile(r"\balpha_pro\b", re.I),
)

CONFIG_PLACEHOLDER_MARKER = "[[CONFIG_PENDING]]"


def compose_controls_section(
    *,
    graph: VesselGraphResult,
    profiles: dict[str, dict[str, Any]],
    equipment_doc: dict[str, Any],
    section_inputs: dict[str, Any] | None = None,
    allow_planted_expectation: bool = True,
) -> dict[str, Any]:
    """Compose Controls and Monitoring for the vessel."""
    boat = resolve_vessel_display_name(equipment_doc)
    inputs = section_inputs or assemble_section_inputs(
        graph, "controls", equipment_doc=equipment_doc
    )

    full_keys = keys_at_depth(inputs, DEPTH_FULL)
    summary_keys = keys_at_depth(inputs, DEPTH_SUMMARY)
    provenance_keys = keys_at_depth(inputs, DEPTH_PROVENANCE)

    platform_key = next(
        (k for k in full_keys if graph.devices[k].role == "PLATFORM"),
        None,
    )
    hub_key = next(
        (k for k in full_keys if graph.devices[k].role == "HUB"),
        None,
    )
    platform = graph.devices[platform_key].profile if platform_key else {}
    hub = graph.devices[hub_key].profile if hub_key else {}

    present_page_names = [
        str(p.get("name") or "")
        for p in (inputs.get("present_platform_pages") or [])
        if p.get("present")
    ]
    gated_off_pages = _gated_off_page_names(platform, present_page_names)

    first_use: set[str] = set()
    provenance_map: list[dict[str, Any]] = []
    block_order: list[str] = []
    context_shaping_consumed: list[dict[str, Any]] = []
    planted_expectation_ids: list[str] = []
    config_placeholder_ids: list[str] = []

    def _name(key: str) -> str:
        base = re.sub(r"_\d+$", "", key)
        if key not in first_use and base not in first_use:
            first_use.add(key)
            first_use.add(base)
            role = DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or "the device"
            mm = MANUFACTURER_MODEL.get(key) or MANUFACTURER_MODEL.get(base)
            if mm:
                return f"{role} ({mm[0]} {mm[1]})"
            return role
        return DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or "the device"

    def _emit(
        text: str,
        *sources: str,
        kind: str = "sourced",
        block: str = "capability_summary",
        planted_expectation: bool = False,
        config_placeholder: bool = False,
        links: list[dict[str, str]] | None = None,
    ) -> str:
        sid = f"S{len(provenance_map) + 1}"
        if planted_expectation:
            if not allow_planted_expectation:
                raise ValueError("planted_expectation not allowed")
            kind = "planted_expectation"
            planted_expectation_ids.append(sid)
        elif kind != "planted_expectation" and not config_placeholder:
            abs_hits = lint_absence_prose(text)
            if abs_hits:
                raise ValueError(
                    f"absence prose forbidden on {sid!r}: {abs_hits} in {text!r}"
                )

        hits = lint_reader_vocabulary(text)
        for rx in _FORBIDDEN_EXTRA:
            if rx.search(text):
                hits.append(rx.pattern)
        # Allow CONFIG marker through vocab (stripped from reader markdown).
        reader_text = text.replace(CONFIG_PLACEHOLDER_MARKER, "").strip()
        hits = [h for h in hits if "CONFIG" not in str(h)]
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
            "sentence": reader_text if not config_placeholder else text,
            "sources": list(sources),
            "kind": "config_placeholder" if config_placeholder else kind,
            "block": block,
        }
        if planted_expectation:
            entry["planted_expectation"] = True
        if config_placeholder:
            entry["config_placeholder"] = True
            config_placeholder_ids.append(sid)
        if links:
            entry["links"] = list(links)
        provenance_map.append(entry)
        if block not in block_order:
            block_order.append(block)
        return sid

    # Flags → context_shaping / placeholders
    wireless_unresolved = False
    config_unsourced = False
    for flag in inputs.get("flags") or []:
        fname = str(flag.get("flag") or "")
        rel = flag_reader_relevance(fname)
        if rel == "context_shaping":
            context_shaping_consumed.append(dict(flag))
        if fname == "config_unsourced":
            config_unsourced = True

    # Optional iPad / wireless host on runs_platform
    wireless_edge = None
    if hub_key:
        for edge in hub.get("runs_platform") or []:
            if not isinstance(edge, dict):
                continue
            if str(edge.get("host_kind") or "") == "mobile_app" and edge.get(
                "optional"
            ):
                wireless_edge = edge
                # Vessel inventory does not confirm iPad fitted → unresolved
                wireless_unresolved = True
                context_shaping_consumed.append(
                    {
                        "flag": "optional_wireless_host_unresolved",
                        "device": hub_key,
                        "detail": edge.get("note"),
                    }
                )

    # ========== CAPABILITY ==========
    touch = _name(hub_key) if hub_key else "the control station"
    # Platform: role-only on first capability sentence (avoid second paren).
    plat_role = DISPLAY_NAMES.get(platform_key or "", "CZone")
    if platform_key:
        first_use.add(platform_key)
        first_use.add(re.sub(r"_\d+$", "", platform_key))
    _emit(
        f"On {boat}, switching and monitoring run through {touch}, "
        f"which hosts {plat_role}.",
        f"equipment.{hub_key}",
        f"profile.{hub_key}.runs_platform",
        f"profile.{platform_key}.entity_kind",
        "vessel.display_name",
        block="capability_summary",
    )

    always_pages = [
        n
        for n in present_page_names
        if n.lower()
        in {"favourites", "modes", "control", "monitoring", "alarms"}
    ]
    energy_pages = [
        n
        for n in present_page_names
        if "inverter" in n.lower()
    ]
    page_list = ", ".join(always_pages + energy_pages)
    if page_list:
        _emit(
            f"The CZone menus include {page_list}.",
            f"profile.{platform_key}.ui_pages",
            "section_inputs.present_platform_pages",
            block="capability_summary",
        )

    # ========== MONITORING ==========
    circuits = inputs.get("channel_map_circuits") or {}
    circuit_names = control_page_circuit_names(circuits)
    if circuits.get("sourced"):
        _emit(
            "Open Monitoring when you want to read the boat's configured meters "
            "and status channels from the CZone switching map.",
            f"profile.{platform_key}.ui_pages[Monitoring]",
            f"vessel_fact.channel_map:{circuits.get('artifact_id')}",
            "section_inputs.summary:mli",
            block="monitoring",
        )
    else:
        _emit(
            "Open Monitoring when you want to read configured meters, including "
            "the house battery bank state that the station can display.",
            f"profile.{platform_key}.ui_pages[Monitoring]",
            "section_inputs.summary:mli",
            block="monitoring",
        )
    mli_summaries = [k for k in summary_keys if k.startswith("mli")]
    if mli_summaries:
        batteries_xref = format_section_xref("batteries")
        _emit(
            "House-bank monitoring is available from this screen; full "
            f"battery detail can be found in {batteries_xref['phrase']}.",
            *[f"graph.control_path->{k}" for k in mli_summaries],
            "xref.batteries",
            block="monitoring",
            links=[section_xref_link("batteries")],
        )

    severities = platform.get("alarm_severity") or []
    if severities:
        levels = ", ".join(
            str(s.get("level_verbatim") or "")
            for s in severities
            if isinstance(s, dict) and s.get("level_verbatim")
        )
        if levels:
            _emit(
                f"Alarms use severity levels ({levels}); when an alarm appears, "
                f"open it on the Alarms page for details and to acknowledge it.",
                f"profile.{platform_key}.alarm_severity",
                f"profile.{platform_key}.operator_actions",
                block="monitoring",
            )

    # ========== ADJUSTING ==========
    _emit(
        "Modes let you control several circuits with one action — activate a "
        "Mode from the Modes page when you want that scene.",
        f"profile.{platform_key}.ui_pages[Modes]",
        f"profile.{platform_key}.operator_actions",
        block="adjusting",
    )

    if circuits.get("sourced") and circuit_names:
        sample = ", ".join(circuit_names[:8])
        more = len(circuit_names) - 8
        tail = f" (and {more} more)" if more > 0 else ""
        _emit(
            f"On Control, named circuits include {sample}{tail}. "
            f"When you need one, press it to open its controls.",
            f"profile.{platform_key}.ui_pages[Control]",
            f"profile.{platform_key}.operator_actions",
            f"vessel_fact.channel_map:{circuits.get('artifact_id')}",
            block="adjusting",
        )
        for row in circuits.get("context_shaping") or []:
            context_shaping_consumed.append(
                {
                    "kind": "channel_map_opt_uncorroborated",
                    "channel_ref": row.get("channel_ref"),
                    "display_name": row.get("display_name"),
                    "option_flag": row.get("option_flag"),
                    "note": (
                        "OPT/CUS on channel map without inventory corroboration "
                        "— not asserted as fitted"
                    ),
                }
            )
    else:
        _emit(
            "On Control, when you need a circuit, press it to open its controls.",
            f"profile.{platform_key}.ui_pages[Control]",
            f"profile.{platform_key}.operator_actions",
            block="adjusting",
        )

    combi_keys = [k for k in summary_keys if "combi" in k]
    if combi_keys:
        mm = MANUFACTURER_MODEL.get("mass_combi_pro") or ("Mastervolt", "Mass Combi Pro")
        batteries_xref = format_section_xref("batteries")
        _emit(
            f"The Inverter Charger page shows the two inverter-chargers "
            f"({mm[0]} {mm[1]}) for AC/DC power flow; those procedures can "
            f"be found in {batteries_xref['phrase']}.",
            f"profile.{platform_key}.ui_pages[Inverter Charger]",
            *[f"graph.control_path->{k}" for k in combi_keys],
            "xref.batteries",
            block="adjusting",
            links=[section_xref_link("batteries")],
        )

    # Config placeholder — modes/favourites/alarms still unsourced (xxv);
    # circuit inventory may already be sourced from channel_map.
    if circuits.get("sourced"):
        placeholder = (
            f"{CONFIG_PLACEHOLDER_MARKER} "
            f"Exact Modes, Favourites shortcuts, and alarm details are not "
            f"yet recorded for this installation; they will appear here once "
            f"the CZone configuration or an owner screen walkthrough is "
            f"available."
        )
    else:
        placeholder = (
            f"{CONFIG_PLACEHOLDER_MARKER} "
            f"Exact Modes, Favourites shortcuts, and circuit labels are not "
            f"yet recorded for this installation; they will appear here once "
            f"the CZone configuration or an owner screen walkthrough is "
            f"available."
        )
    _emit(
        placeholder,
        "graph.flag:config_unsourced",
        f"profile.{hub_key}.validation_flags",
        "policy:ship_with_honest_gaps",
        kind="config_placeholder",
        block="adjusting",
        config_placeholder=True,
    )

    # ========== TROUBLESHOOTING / REFERENCE ==========
    if gated_off_pages and allow_planted_expectation:
        names = " and ".join(gated_off_pages)
        _emit(
            f"CZone literature also describes {names} pages; they do not appear "
            f"in the menus until the matching interfaces are configured.",
            f"profile.{platform_key}.ui_pages",
            "section_inputs.gated_off",
            "vessel.display_name",
            block="troubleshooting",
            planted_expectation=True,
        )

    # Wireless alternate host — context_shaping only when unresolved
    if wireless_edge and not wireless_unresolved:
        _emit(
            "An iPad or phone running the CZone app can also host the same "
            "menus when connected.",
            f"profile.{hub_key}.runs_platform[mobile_app]",
            block="reference",
        )
    # else: leave in context_shaping_consumed only

    # Provenance-depth devices: attach to troubleshooting provenance metadata
    # without naming in body.
    path_meta = [f"path_device:{k}" for k in provenance_keys]

    paragraphs: list[str] = []
    by_block: dict[str, list[str]] = {b: [] for b in SECTION_ORDER}
    for row in provenance_map:
        text = str(row["sentence"])
        if row.get("config_placeholder"):
            text = text.replace(CONFIG_PLACEHOLDER_MARKER, "").strip()
            # Frame clearly as upgradeable placeholder
            if not text.startswith("("):
                text = f"(Configuration pending) {text}"
        by_block.setdefault(row["block"], []).append(text)
        if path_meta and row["block"] == "troubleshooting":
            row.setdefault("provenance_metadata", []).extend(path_meta)

    title = "# Controls and Monitoring\n"
    for block in SECTION_ORDER:
        lines = by_block.get(block) or []
        if not lines:
            continue
        paragraphs.append("\n\n".join(lines))
    draft = title + "\n\n".join(paragraphs)

    # Attach path devices + gated pages to provenance of monitoring/adjusting
    for row in provenance_map:
        if row["block"] in {"monitoring", "adjusting"} and path_meta:
            meta = list(row.get("provenance_metadata") or [])
            for m in path_meta:
                if m not in meta:
                    meta.append(m)
            if meta:
                row["provenance_metadata"] = meta

    vocab = lint_reader_vocabulary(
        draft.replace("(Configuration pending)", "")
    )
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
        "section_inputs": inputs,
        "block_order": block_order,
        "section_order_template": list(SECTION_ORDER),
        "context_shaping_consumed": context_shaping_consumed,
        "planted_expectation_ids": planted_expectation_ids,
        "config_placeholder_ids": config_placeholder_ids,
        "present_pages": present_page_names,
        "gated_off_pages": gated_off_pages,
        "summary_keys": summary_keys,
        "full_keys": full_keys,
        "provenance_keys": provenance_keys,
        "excluded_candidates": list(inputs.get("candidates_excluded") or []),
        "vocabulary_lint": vocab,
        "absence_lint": absence,
        "prose_economy_lint": economy,
        "vessel_display_name": boat,
        "version": "v4.13",
    }


def _gated_off_page_names(
    platform: dict[str, Any], present: list[str]
) -> list[str]:
    present_l = {p.lower() for p in present}
    out: list[str] = []
    for page in platform.get("ui_pages") or []:
        if not isinstance(page, dict):
            continue
        name = str(page.get("name") or "").strip()
        if not name or not page.get("appears_if_gate"):
            continue
        if name.lower() not in present_l:
            out.append(name)
    return out


def evaluate_controls_draft(
    composed: dict[str, Any],
    *,
    expected_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate Controls draft: Solar voice rules + criteria xx–xxii."""
    draft = str(composed.get("draft_markdown") or "")
    lower = draft.lower()
    boat = str(composed.get("vessel_display_name") or "")
    prov = list(composed.get("provenance_map") or [])

    unsourced = [p for p in prov if not (p.get("sources") or [])]
    vocab_hits = list(composed.get("vocabulary_lint") or [])
    absence_hits = list(composed.get("absence_lint") or [])
    economy = composed.get("prose_economy_lint") or lint_prose_economy(draft)
    voice = assess_reader_voice_style(draft, vessel_display_name=boat)

    # Path devices must not appear in body
    path_named = any(
        k.replace("_", " ") in lower
        for k in (composed.get("provenance_keys") or [])
    ) or ("masterbus bridge" in lower) or re.search(
        r"\bcoi\b", lower
    )

    # Summary discipline: no Combi manual depth (install/DIP/etc.)
    combi_manual_leak = bool(
        re.search(
            r"dip.?switch|install the battery temperature|shore inlet wiring",
            lower,
        )
    )

    placeholder_rows = [
        p for p in prov if p.get("config_placeholder") or p.get("kind") == "config_placeholder"
    ]
    placeholder_text = " ".join(str(p.get("sentence") or "") for p in placeholder_rows).lower()
    draft_for_placeholder = str(composed.get("draft_markdown") or "").lower()
    placeholder_ok = bool(placeholder_rows) and (
        "configuration pending" in draft_for_placeholder
        or "will appear here" in placeholder_text
        or "will be filled" in placeholder_text
        or "not yet recorded" in placeholder_text
    )
    modes_gap_ok = (
        "modes" in placeholder_text and "favourites" in placeholder_text
    ) or (
        "modes" in lower and "favourites" in lower and placeholder_ok
    )

    circuits = (composed.get("section_inputs") or {}).get("channel_map_circuits") or {}
    asserted_names = {
        re.sub(
            r"^\[(OPT|CUS)\]\s*",
            "",
            str(r.get("display_name") or r.get("circuit_name_en") or ""),
            flags=re.I,
        ).strip().lower()
        for r in (circuits.get("asserted") or [])
        if r.get("display_name") or r.get("circuit_name_en")
    }
    # xxiii — every rendered circuit name traces to adjudicated channel_entry
    rendered_circuit_ok = True
    if circuits.get("sourced"):
        for p in prov:
            if "vessel_fact.channel_map" not in " ".join(
                str(s) for s in (p.get("sources") or [])
            ):
                continue
            sent = str(p.get("sentence") or "")
            if "named circuits" not in sent.lower():
                continue
            # Extract names between "include " and ". When"
            m = re.search(
                r"include (.+?)(?:\s*\(and \d+ more\))?\. When",
                sent,
                re.I,
            )
            if not m:
                continue
            for part in m.group(1).split(","):
                name = part.strip().lower()
                if name and name not in asserted_names and not any(
                    name in a or a in name for a in asserted_names
                ):
                    rendered_circuit_ok = False
                    break

    # xxiv — no uncorroborated OPT/CUS asserted as fitted
    shaping_names = {
        str(r.get("display_name") or "").lower()
        for r in (circuits.get("context_shaping") or [])
    }
    opt_not_asserted = True
    for name in shaping_names:
        clean = re.sub(r"^\[(OPT|CUS)\]\s*", "", name, flags=re.I).strip()
        if clean and clean in lower and f"[opt] {clean}" not in lower:
            # Allow mention only if we didn't claim fitted — hard check: name
            # should not appear in Control circuit list sentence.
            for p in prov:
                sent = str(p.get("sentence") or "").lower()
                if "named circuits" in sent and clean in sent:
                    opt_not_asserted = False

    # xx — input set matches fixture
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

        # Alphas must be excluded from summary
        for excl in expected_inputs.get("must_exclude_from_summary") or []:
            if got.get(excl) == DEPTH_SUMMARY:
                input_match = False
                input_notes += f"; {excl} wrongly in summary"

    checks = {
        "zero_unsourced": len(unsourced) == 0,
        "no_absence_prose": len(absence_hits) == 0,
        "zero_internal_vocabulary": len(vocab_hits) == 0,
        "vessel_named": bool(boat) and voice["established"],
        "no_catalog_vocabulary": "control surface" not in lower,
        "confidence_via_phrasing": len(economy.get("source_citations") or []) == 0,
        "one_parenthetical_max": len(economy.get("parentheticals") or []) == 0,
        "no_clause_restatement": len(economy.get("restatement") or []) == 0,
        "path_devices_unnamed": not path_named,
        "input_set_matches_fixture": input_match,  # xx
        "summary_stays_summary": not combi_manual_leak,  # xxi
        "config_placeholder_present": placeholder_ok,  # xxii
        "circuit_names_trace_to_channel_map": rendered_circuit_ok,  # xxiii
        "opt_uncorroborated_not_asserted": opt_not_asserted,  # xxiv
        "modes_favourites_gap_explicit": modes_gap_ok,  # xxv
        "pages_mentioned": any(
            p.lower() in lower
            for p in ("favourites", "modes", "monitoring", "alarms", "control")
        ),
    }
    notes = {
        "xi": (
            "Vessel established by name"
            if checks["vessel_named"]
            else "missing recorded vessel display name in prose"
        ),
        "xx": f"Input set {input_notes}",
        "xxi": "Summary depth only"
        if checks["summary_stays_summary"]
        else "Combi manual content leaked",
        "xxii": "Config placeholder present"
        if checks["config_placeholder_present"]
        else "missing boat-upgradeable placeholder",
        "xxiii": "Rendered circuit names trace to channel_map"
        if checks["circuit_names_trace_to_channel_map"]
        else "ungrounded circuit name in draft",
        "xxiv": "Uncorroborated OPT/CUS not asserted"
        if checks["opt_uncorroborated_not_asserted"]
        else "OPT/CUS asserted without inventory corroboration",
        "xxv": "Modes/Favourites gap explicit"
        if checks["modes_favourites_gap_explicit"]
        else "modes/favourites gap missing",
    }
    return {
        "checks": checks,
        "pass": all(checks.values()),
        "style_warnings": voice.get("style_warnings") or [],
        "reader_voice": voice,
        "notes": notes,
        "version": "v4.13",
        "criteria": ["xx", "xxi", "xxii", "xxiii", "xxiv", "xxv"],
    }
