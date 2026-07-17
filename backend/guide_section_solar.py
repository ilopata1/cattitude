"""Stage 4 Solar subsection — v4 capability + task template.

Section order: capability_summary → monitoring → adjusting → troubleshooting.

Rules (spec v4.9):
  - Vessel addressed by recorded vessel_display_name (+ she); never 'this vessel'
  - Role/function first; manufacturer+model in parentheses on first use only
  - ≤1 parenthetical per sentence (split overloaded sentences)
  - Confidence via phrasing (about / ranges / up to); no source cites in prose
  - No clause restatement (— that is where/how …)
  - Owner language (app/screen); no catalog vocabulary
  - Verified facts plain; uncertainty as conditions only
  - Flag reader_relevance: operator_caveat | scope_limit | context_shaping | internal
  - Absences/gated-off → context_shaping (provenance only), unless planted_expectation
  - No commissioning/wiring; placement kept when operationally useful
  - composed_inference only from attached-evidence / document-cited facts
"""

from __future__ import annotations

import re
from typing import Any

from system_graph import VesselGraphResult
from vessel_evidence import (
    annotate_facts_with_evidence,
    contributing_facts_ok_for_inference,
    merge_evidence_flags_into_graph_flags,
    validate_evidence_attachments,
)

FLAG_READER_RELEVANCE: dict[str, str] = {
    # Absences / gated-off — shape wording, never render as 'not fitted'
    "unresolved_dependency": "context_shaping",
    "island_with_daily_use": "context_shaping",
    "network_alias_gap": "internal",
    "edge_provenance_weak": "internal",
    "section_low_margin": "internal",
    "section_unassigned": "internal",
    "no_hub_found": "internal",
    "multiple_hubs": "internal",
    "orphan_bridge": "internal",
    "controllable_but_unreachable": "internal",
    "evidence_unattached": "internal",
    # Genuine conditional / scope limits (may render as conditions)
    "platform_version_unconfirmed": "scope_limit",
    "config_unsourced": "scope_limit",
    "hub_operation_unsourced": "scope_limit",
}

_GX_UNRESOLVED_PATH_HINTS = (
    "exposes_data_to_network",
    "gx",
    "globallink",
    "vrm",
)

DISPLAY_NAMES: dict[str, str] = {
    "victron_mppt_150_60": "the davit array controller",
    "victron_mppt": "the coachroof array controllers",
}

MANUFACTURER_MODEL: dict[str, tuple[str, str]] = {
    "victron_mppt_150_60": ("Victron", "SmartSolar MPPT 150/60"),
    "victron_mppt": ("Victron", "SmartSolar MPPT 75/15"),
}

_FORBIDDEN_VOCAB_RES = (
    re.compile(r"\bvictron_mppt(?:_150_60)?\b", re.I),
    re.compile(r"\bczone_2_0\b", re.I),
    re.compile(r"\bmli_ultra\b", re.I),
    re.compile(r"\b(?:ISLAND|HUB|ENDPOINT|PLATFORM)\b"),
    re.compile(r"\bStage\s*\d+\b", re.I),
    re.compile(r"\b(?:pipeline|graph\.|fragment|provenance)\b", re.I),
    re.compile(
        r"\b(?:island_with_daily_use|unresolved_dependency|network_alias_gap|"
        r"ve_smart_version_conditional|config_unsourced|"
        r"platform_version_unconfirmed|evidence_unattached|context_shaping)\b",
        re.I,
    ),
    re.compile(r"\bFlag:\s*", re.I),
    re.compile(r"\bquantity\s+\d+\b", re.I),
    re.compile(r"\b(?:when needed|if needed|as needed)\b", re.I),
    re.compile(r"\bcontrol surfaces?\b", re.I),
    re.compile(r"\bthis vessel\b", re.I),
    re.compile(r"\bdoes not appear\b", re.I),
    re.compile(r"\bis described in the manuals\b", re.I),
    re.compile(r"\bnot (?:confirmed )?fitted\b", re.I),
    re.compile(r"\bnot confirmed\b", re.I),
    re.compile(r"\bnameplate\b", re.I),
)

_ABSENCE_PROSE_RES = (
    re.compile(r"\bdoes not (?:have|appear)\b", re.I),
    re.compile(r"\bthere is no\b", re.I),
    re.compile(r"\bnot (?:confirmed )?fitted\b", re.I),
    re.compile(r"\bnot confirmed\b", re.I),
    re.compile(r"\bno czone\b", re.I),
    re.compile(r"\bdo not appear on the czone\b", re.I),
    re.compile(r"\bdo not expect vrm\b", re.I),
)

SECTION_ORDER = (
    "capability_summary",
    "monitoring",
    "adjusting",
    "troubleshooting",
)


class VesselNameMissing(ValueError):
    """Raised when composition needs vessel_display_name and it is absent."""


def flag_reader_relevance(
    flag_name: str,
    *,
    needed_for: str = "",
) -> str:
    fname = str(flag_name or "").strip()
    base = FLAG_READER_RELEVANCE.get(fname, "internal")
    if fname == "unresolved_dependency":
        return "context_shaping"
    return base


def resolve_vessel_display_name(equipment_doc: dict[str, Any]) -> str:
    """Return recorded display name or raise — never invent."""
    for key in ("vessel_display_name", "vessel_name", "display_name"):
        val = str(equipment_doc.get(key) or "").strip()
        if val and val.lower() not in {"outremer_55n60", "outremer_example"}:
            # Reject fixture keys mistaken for names.
            if re.fullmatch(r"[a-z0-9_]+", val) and "_" in val:
                continue
            return val
    raise VesselNameMissing(
        "vessel_display_name is not recorded on the vessel fixture "
        f"(key={equipment_doc.get('vessel')!r}). Supply the boat's name; "
        "do not invent one."
    )


def display_name(device_key: str) -> str:
    return DISPLAY_NAMES.get(device_key, "this solar controller")


def first_mention(device_key: str, *, quantity: int = 1) -> str:
    """Role first; manufacturer + model in parentheses once (sole paren on phrase)."""
    role = display_name(device_key)
    mfr, model = MANUFACTURER_MODEL.get(device_key, ("", ""))
    if quantity > 1:
        lead = f"{quantity} interchangeable {role.removeprefix('the ')}"
    else:
        lead = role
    if mfr and model:
        return f"{lead} ({mfr} {model})"
    return lead


_SOURCE_CITATION_IN_PROSE_RES = (
    re.compile(r"\bowner[\s-]survey\b", re.I),
    re.compile(r"\bsurvey estimate\b", re.I),
    re.compile(r"\bper the (?:manual|survey|inventory)\b", re.I),
    re.compile(r"\baccording to\b", re.I),
    re.compile(r"\bas (?:documented|attested|recorded) in\b", re.I),
    re.compile(r"\b\(owner[^\)]*\)", re.I),
    re.compile(r"\b\(survey[^\)]*\)", re.I),
    re.compile(r"\b\(inspection[^\)]*\)", re.I),
    re.compile(r"\b\(photo[^\)]*\)", re.I),
    re.compile(r"\b\(folio[^\)]*\)", re.I),
)

_RESTATEMENT_MARKERS_RES = (
    re.compile(r"—\s*that is (?:where|how|why)\b", re.I),
    re.compile(r"—\s*that (?:array|controller|app|place) is\b", re.I),
    re.compile(r", which is (?:where|how|why)\b", re.I),
    re.compile(r"\bthat tell you what\b", re.I),
)


def lint_source_citations_in_prose(text: str) -> list[str]:
    """Confidence belongs in phrasing; source labels stay in provenance only."""
    hits: list[str] = []
    for pat in _SOURCE_CITATION_IN_PROSE_RES:
        m = pat.search(text or "")
        if m:
            hits.append(m.group(0))
    return hits


def lint_parentheticals(text: str) -> list[str]:
    """At most one parenthetical per sentence."""
    hits: list[str] = []
    for sentence in re.split(r"(?<=[.!?])\s+", (text or "").strip()):
        if not sentence:
            continue
        n = len(re.findall(r"\([^)]*\)", sentence))
        if n > 1:
            hits.append(f"{n} parentheticals: {sentence[:80]}")
    return hits


def lint_restatement(text: str) -> list[str]:
    """Do not restate a sentence's point in the next clause."""
    hits: list[str] = []
    for pat in _RESTATEMENT_MARKERS_RES:
        m = pat.search(text or "")
        if m:
            hits.append(m.group(0))
    return hits


def lint_reader_vocabulary(text: str) -> list[str]:
    hits: list[str] = []
    for pat in _FORBIDDEN_VOCAB_RES:
        m = pat.search(text or "")
        if m:
            hits.append(m.group(0))
    return hits


def lint_absence_prose(text: str) -> list[str]:
    hits: list[str] = []
    for pat in _ABSENCE_PROSE_RES:
        m = pat.search(text or "")
        if m:
            hits.append(m.group(0))
    return hits


def lint_prose_economy(text: str) -> dict[str, list[str]]:
    return {
        "source_citations": lint_source_citations_in_prose(text),
        "parentheticals": lint_parentheticals(text),
        "restatement": lint_restatement(text),
    }


def _src_tag(row: dict[str, Any]) -> str:
    src = str(row.get("source") or "").strip() or "extracted"
    if row.get("vote_margin") == "repaired" or src == "repaired":
        return "repaired"
    if src == "derived":
        return "derived"
    return "extracted"


def _fact_key(source: str) -> str:
    s = str(source or "").strip()
    s = re.sub(r"\s*\[(?:extracted|derived|repaired)\]\s*$", "", s)
    s = re.sub(
        r"^graph\.flag:island_with_daily_use:.+$",
        "fact:island_daily_monitoring",
        s,
    )
    s = re.sub(
        r"^graph\.flag:unresolved_dependency:[^:]+:(.*)$",
        lambda m: (
            "fact:gx_telemetry_unresolved"
            if any(h in m.group(1).lower() for h in _GX_UNRESOLVED_PATH_HINTS)
            else (
                "fact:optional_display_unresolved"
                if "control_surfaces" in m.group(1).lower()
                else f"fact:unresolved:{m.group(1)}"
            )
        ),
        s,
    )
    s = re.sub(r"^graph\.role:.+$", "fact:solar_island_roles", s)
    s = re.sub(
        r"^vessel\.consequence:no_czone_surface$",
        "fact:no_czone_surface",
        s,
    )
    if "victronconnect" in s.lower():
        return "fact:victronconnect_monitoring"
    if re.search(r"control_surfaces\[\d+\]\.label_verbatim", s):
        return "fact:victronconnect_monitoring"
    if s.startswith("vessel_fact:"):
        return s
    return s


class _ProvenanceDeduper:
    def __init__(self) -> None:
        self.rendered: dict[str, str] = {}

    def claim(self, sources: list[str], sid: str) -> tuple[list[str], list[str]]:
        primary: list[str] = []
        meta: list[str] = []
        seen_here: set[str] = set()
        for src in sources:
            key = _fact_key(src)
            if key in seen_here:
                meta.append(src)
                continue
            seen_here.add(key)
            if key in self.rendered:
                meta.append(src)
            else:
                self.rendered[key] = sid
                primary.append(src)
        return primary, meta


def _collect_actions(
    profiles: dict[str, dict[str, Any]],
    device_keys: tuple[str, ...],
) -> dict[str, list[dict[str, Any]]]:
    buckets: dict[str, list[dict[str, Any]]] = {
        "routine": [],
        "situational": [],
        "fault": [],
    }
    group_map = {
        "daily": "routine",
        "situational": "situational",
        "emergency": "fault",
        "maintenance": "situational",
    }
    seen: set[str] = set()
    for key in device_keys:
        profile = profiles.get(key) or {}
        for i, act in enumerate(profile.get("operator_actions") or []):
            if not isinstance(act, dict):
                continue
            action = str(act.get("action") or "").strip()
            if not action:
                continue
            if "victronconnect" in action.lower() and "monitor" in action.lower():
                continue
            if "charge status" in action.lower() and "app" in action.lower():
                continue
            if "connect the display" in action.lower():
                continue
            ctx = str(act.get("context") or "situational")
            group = group_map.get(ctx, "situational")
            norm = re.sub(r"\s+", " ", action.lower())
            if norm in seen:
                continue
            seen.add(norm)
            buckets[group].append(
                {
                    "action": action,
                    "context": ctx,
                    "group": group,
                    "source": f"{key}.operator_actions[{i}].action [{_src_tag(act)}]",
                }
            )
    return buckets


def compose_solar_section(
    *,
    graph: VesselGraphResult,
    profiles: dict[str, dict[str, Any]],
    equipment_doc: dict[str, Any],
    tiers: dict[str, Any] | None = None,
    device_keys: tuple[str, ...] = ("victron_mppt_150_60", "victron_mppt"),
    allow_planted_expectation: bool = False,
) -> dict[str, Any]:
    """Compose reader-facing Solar section (v4 template)."""
    _ = tiers
    boat = resolve_vessel_display_name(equipment_doc)

    by_key = {
        str(r.get("device_key")): r
        for r in (equipment_doc.get("equipment") or [])
        if isinstance(r, dict) and r.get("device_key")
    }
    resolved_profiles = {
        k: dict(graph.devices[k].profile)
        for k in device_keys
        if k in graph.devices
    }
    for k in device_keys:
        resolved_profiles.setdefault(k, dict(profiles.get(k) or {}))

    evidence_flags = validate_evidence_attachments(equipment_doc)
    annotated_facts = annotate_facts_with_evidence(equipment_doc)
    facts_by_id = {str(f.get("id")): f for f in annotated_facts}
    all_flags = merge_evidence_flags_into_graph_flags(
        list(graph.flags), evidence_flags
    )

    section_sentences: list[dict[str, Any]] = []
    provenance_map: list[dict[str, Any]] = []
    deduper = _ProvenanceDeduper()
    context_shaping_consumed: list[dict[str, Any]] = []
    internal_flags_consumed: list[dict[str, Any]] = []
    flag_facts_in_provenance: dict[str, str] = {}
    first_use_done: set[str] = set()
    block_order: list[str] = []
    planted_expectation_ids: list[str] = []

    def _role(key: str, *, quantity: int | None = None) -> str:
        line = by_key.get(key) or {}
        q = int(quantity if quantity is not None else (line.get("quantity") or 1))
        if key not in first_use_done:
            first_use_done.add(key)
            return first_mention(key, quantity=q)
        return display_name(key)

    def _emit(
        text: str,
        *sources: str,
        kind: str = "sourced",
        block: str = "capability_summary",
        contributing_facts: list[str] | None = None,
        force_sources: bool = False,
        planted_expectation: bool = False,
    ) -> str | None:
        sid = f"S{len(provenance_map) + 1}"
        if planted_expectation:
            if not allow_planted_expectation:
                raise ValueError(
                    "planted_expectation sentences require explicit allow flag "
                    "and solar v4 fixture keeps GX/MPPT-display absences unrendered"
                )
            kind = "planted_expectation"
        elif kind != "planted_expectation":
            abs_hits = lint_absence_prose(text)
            if abs_hits:
                raise ValueError(
                    f"absence prose forbidden on {sid!r}: {abs_hits} in {text!r}"
                )

        primary, meta = deduper.claim(list(sources), sid)
        if not primary and not force_sources and kind != "composed_inference":
            for src in sources:
                key = _fact_key(src)
                if key in deduper.rendered:
                    owner = deduper.rendered[key]
                    for row in provenance_map:
                        if row["id"] == owner:
                            row.setdefault("provenance_metadata", []).append(src)
            return None
        use_sources = primary if primary else list(sources)
        if kind == "composed_inference":
            use_sources = list(dict.fromkeys(list(sources) + list(meta)))
            meta = []
            contrib = list(contributing_facts or [])
            check_ids = [
                c for c in contrib if not c.startswith("fact:") or c in facts_by_id
            ]
            for src in use_sources:
                if src.startswith("vessel_fact:"):
                    check_ids.append(src.removeprefix("vessel_fact:"))
            ok, bad = contributing_facts_ok_for_inference(check_ids, annotated_facts)
            if not ok:
                raise ValueError(
                    f"composed_inference blocked by evidence_unattached: {bad}"
                )

        hits = lint_reader_vocabulary(text)
        if hits:
            raise ValueError(f"vocabulary lint failed on {sid!r}: {hits} in {text!r}")
        economy = lint_prose_economy(text)
        for kind_name, econ_hits in economy.items():
            if econ_hits:
                raise ValueError(
                    f"prose economy ({kind_name}) failed on {sid!r}: "
                    f"{econ_hits} in {text!r}"
                )

        entry: dict[str, Any] = {
            "id": sid,
            "sentence": text,
            "sources": use_sources,
            "kind": kind,
            "block": block,
        }
        if meta:
            entry["provenance_metadata"] = meta
        if planted_expectation or kind == "planted_expectation":
            entry["planted_expectation"] = True
            planted_expectation_ids.append(sid)
        if kind == "composed_inference":
            entry["composed_inference"] = True
            entry["contributing_facts"] = list(contributing_facts or use_sources)
            for cf in entry["contributing_facts"]:
                deduper.rendered.setdefault(cf, sid)
        section_sentences.append(
            {"id": sid, "text": text, "kind": kind, "block": block}
        )
        provenance_map.append(entry)
        if block not in block_order:
            block_order.append(block)
        return sid

    # Collect context-shaping absences for provenance attachment
    solar_flags = [
        f
        for f in all_flags
        if isinstance(f, dict)
        and (
            str(f.get("device") or "") in device_keys
            or (
                f.get("flag") == "evidence_unattached"
                and any(d in device_keys for d in (f.get("applies_to") or []))
            )
        )
    ]
    gx_absence_sources: list[str] = []
    optional_display_sources: list[str] = []
    island_sources: list[str] = []
    for flag in solar_flags:
        fname = str(flag.get("flag") or "")
        rel = flag_reader_relevance(
            fname, needed_for=str(flag.get("needed_for") or "")
        )
        if rel == "internal":
            internal_flags_consumed.append(dict(flag))
            continue
        if rel == "context_shaping":
            context_shaping_consumed.append(dict(flag))
            cite = f"graph.flag:{fname}:{flag.get('device')}"
            if flag.get("needed_for"):
                cite = f"{cite}:{flag.get('needed_for')}"
            if fname == "island_with_daily_use":
                island_sources.append(cite)
            elif fname == "unresolved_dependency":
                path = str(flag.get("needed_for") or "").lower()
                if any(h in path for h in _GX_UNRESOLVED_PATH_HINTS):
                    gx_absence_sources.append(cite)
                elif "control_surfaces" in path:
                    optional_display_sources.append(cite)

    wattage = facts_by_id.get("solar_array_wattage_inventory") or {}
    davit_obs = facts_by_id.get("solar_davit_array_observation")
    coach_obs = facts_by_id.get("solar_coachroof_array_observation")
    yield_inf = facts_by_id.get("solar_coachroof_yield_inference")
    w = (wattage.get("wattage_kw") or {}) if wattage else {}

    # ========== 1. CAPABILITY SUMMARY ==========
    davit = _role("victron_mppt_150_60")
    coach = _role(
        "victron_mppt",
        quantity=int((by_key.get("victron_mppt") or {}).get("quantity") or 2),
    )
    cap_sources = [
        "graph.role:victron_mppt=ISLAND",
        "graph.role:victron_mppt_150_60=ISLAND",
        "equipment.victron_mppt_150_60.model",
        "equipment.victron_mppt.model",
        "equipment.victron_mppt.quantity",
        "graph.section:victron_mppt=batteries",
        "equipment.mli_ultra",
        "vessel.display_name",
    ]
    if w:
        dmin = float(w.get("davit_min", 1.0))
        dmax = float(w.get("davit_max", 1.2))
        ckw = float(w.get("coachroof", 0.6))
        total_lo = dmin + ckw
        total_hi = dmax + ckw
        cap_sources.extend(
            [
                "vessel_fact:solar_array_wattage_inventory",
                f"vessel.installation_notes[{wattage.get('source') or 'survey'}]",
            ]
        )
        if davit_obs and davit_obs.get("evidence_attached"):
            cap_sources.extend(
                [
                    "vessel_fact:solar_davit_array_observation",
                    "artifact:photo_davit_array",
                ]
            )
        if coach_obs and coach_obs.get("evidence_attached"):
            cap_sources.extend(
                [
                    "vessel_fact:solar_coachroof_array_observation",
                    "artifact:photo_coachroof_boom",
                ]
            )
        _emit(
            f"{boat} carries about {total_lo:.1f}–{total_hi:.1f} kW of solar.",
            *cap_sources,
            block="capability_summary",
            force_sources=True,
        )
        _emit(
            f"Her davit array is three rigid panels, about {dmin:.1f}–{dmax:.1f} kW, "
            f"on {davit}.",
            *cap_sources,
            block="capability_summary",
            force_sources=True,
        )
        _emit(
            f"Her coachroof array is six semi-flex panels, about "
            f"{int(ckw * 1000)} W, on {coach}.",
            *cap_sources,
            block="capability_summary",
            force_sources=True,
        )
        _emit(
            "Those chargers feed her Mastervolt MLI Ultra house bank.",
            "graph.section:victron_mppt=batteries",
            "equipment.mli_ultra",
            block="capability_summary",
            force_sources=True,
        )
    else:
        _emit(
            f"{boat} has solar on {davit}.",
            *cap_sources,
            block="capability_summary",
            force_sources=True,
        )
        _emit(
            f"She also has {coach}.",
            *cap_sources,
            block="capability_summary",
            force_sources=True,
        )
        _emit(
            "Those chargers feed her Mastervolt MLI Ultra house bank.",
            "graph.section:victron_mppt=batteries",
            "equipment.mli_ultra",
            block="capability_summary",
            force_sources=True,
        )

    # ========== 2. MONITORING ==========
    # VictronConnect once; GX / no-CZone / island absences shape wording → provenance
    monitor_sources = [
        "victron_mppt.control_surfaces[VictronConnect] [extracted]",
        "vessel.consequence:no_czone_surface",
        *island_sources,
        *gx_absence_sources,
    ]
    sid = _emit(
        "Day-to-day, check her solar charge in the VictronConnect app on each "
        "controller.",
        *monitor_sources,
        block="monitoring",
        force_sources=True,
    )
    if sid:
        flag_facts_in_provenance["fact:victronconnect_monitoring"] = sid
        flag_facts_in_provenance["fact:no_czone_surface"] = sid
        if island_sources:
            flag_facts_in_provenance["fact:island_daily_monitoring"] = sid
        if gx_absence_sources:
            flag_facts_in_provenance["fact:gx_telemetry_unresolved"] = sid

    if (
        coach_obs
        and coach_obs.get("evidence_attached")
        and yield_inf
        and yield_inf.get("evidence_attached")
    ):
        _emit(
            "Under sail, when yield looks soft, watch the coachroof controllers "
            "first because the boom can shade that array, and treat the davit "
            "array controller as the steadier production reference.",
            "vessel_fact:solar_coachroof_array_observation",
            "vessel_fact:solar_coachroof_yield_inference",
            "artifact:photo_coachroof_boom",
            "vessel_fact:solar_davit_array_observation",
            kind="composed_inference",
            block="monitoring",
            contributing_facts=[
                "solar_coachroof_array_observation",
                "solar_coachroof_yield_inference",
                "solar_davit_array_observation",
                "fact:where_to_look",
            ],
            force_sources=True,
        )

    # ========== 3. ADJUSTING ==========
    buckets = _collect_actions(resolved_profiles, device_keys)
    configure = [
        a
        for a in (buckets.get("situational") or [])
        if "configure" in a["action"].lower() or "settings" in a["action"].lower()
    ]
    sunset = [
        a for a in (buckets.get("situational") or []) if "sunset" in a["action"].lower()
    ]
    if configure:
        _emit(
            "To change charger settings, open VictronConnect on the controller "
            "you are working with.",
            *[a["source"] for a in configure[:2]],
            block="adjusting",
        )
    if sunset:
        _emit(
            "The sunset action turns off load output at dusk if loads are wired "
            "to a charger’s load terminals.",
            *[a["source"] for a in sunset],
            block="adjusting",
        )

    # ========== 4. TROUBLESHOOTING ==========
    fault = buckets.get("fault") or []
    power = [
        a
        for a in (buckets.get("situational") or [])
        if any(k in a["action"].lower() for k in ("shutdown", "restart"))
    ]
    firmware = [
        a
        for a in (buckets.get("situational") or [])
        if "firmware" in a["action"].lower()
    ]
    if fault:
        _emit(
            "If something looks wrong, VictronConnect shows the error codes and "
            "alarms.",
            *[a["source"] for a in fault[:3]],
            block="troubleshooting",
        )
    if power or firmware:
        bits = []
        sources: list[str] = []
        if power:
            bits.append("shut a controller down or restart it from the app")
            sources.extend(a["source"] for a in power[:2])
        if firmware:
            bits.append("apply firmware updates from the same place")
            sources.extend(a["source"] for a in firmware[:1])
        _emit(
            "For recovery, " + "; ".join(bits) + ".",
            *sources,
            block="troubleshooting",
        )

    # Optional display absence: context_shaping only (provenance on monitoring).
    # Attach leftover optional-display cites to monitoring sentence metadata.
    if optional_display_sources and sid:
        for row in provenance_map:
            if row["id"] == sid:
                row.setdefault("provenance_metadata", []).extend(optional_display_sources)
                flag_facts_in_provenance["fact:optional_display_unresolved"] = sid
                break

    # VE.Smart — genuine version-conditional → clear condition
    for key in device_keys:
        speaks = (
            (resolved_profiles.get(key) or {}).get("networks") or {}
        ).get("speaks") or []
        for i, sp in enumerate(speaks):
            if not isinstance(sp, dict):
                continue
            name = str(sp.get("name_verbatim") or "")
            if "ve.smart" in name.lower() or "ve smart" in name.lower():
                _emit(
                    "If a controller’s firmware supports VE.Smart Networking, "
                    "networked features may be used after you confirm that "
                    "version on the unit; otherwise treat each charger as "
                    "standalone in VictronConnect.",
                    f"{key}.networks.speaks[{i}] [{_src_tag(sp)}]",
                    f"flag:ve_smart_version_conditional:{key}",
                    kind="flag_prose",
                    block="troubleshooting",
                )
                break
        else:
            continue
        break

    draft = "## Solar\n\n" + "\n\n".join(s["text"] for s in section_sentences)
    economy = lint_prose_economy(draft)
    return {
        "draft_markdown": draft,
        "provenance_map": provenance_map,
        "section_sentences": section_sentences,
        "fragments": [],
        "action_buckets": {k: [a["action"] for a in v] for k, v in buckets.items()},
        "context_shaping_consumed": context_shaping_consumed,
        "internal_flags_consumed": internal_flags_consumed,
        "flag_facts_in_provenance": flag_facts_in_provenance,
        "flag_facts_rendered": {},
        "planted_expectation_ids": planted_expectation_ids,
        "vocabulary_lint": lint_reader_vocabulary(draft),
        "absence_lint": lint_absence_prose(draft),
        "prose_economy_lint": economy,
        "evidence_flags": evidence_flags,
        "annotated_facts": annotated_facts,
        "block_order": block_order,
        "section_order_template": list(SECTION_ORDER),
        "vessel_display_name": boat,
        "version": "v4",
    }


def evaluate_solar_draft(composed: dict[str, Any]) -> dict[str, Any]:
    """Report against Solar v4 criteria (i)–(iii), (iv′), (v), (vi′), (vii)–(viii),
    (ix′), (x), (xi)–(xvi)."""
    draft = str(composed.get("draft_markdown") or "")
    prov = list(composed.get("provenance_map") or [])
    lower = draft.lower()
    boat = str(composed.get("vessel_display_name") or "")

    vc_once = lower.count("victronconnect") >= 1 and (
        lower.count("day-to-day, check") <= 1
    )
    section_only = any(tok in lower for tok in ("davit", "coachroof", "semi-flex"))
    unsourced = [p for p in prov if not (p.get("sources") or [])]
    vocab_hits = list(composed.get("vocabulary_lint") or lint_reader_vocabulary(draft))
    absence_hits = list(composed.get("absence_lint") or lint_absence_prose(draft))
    # Untagged planted expectations: any absence prose not marked
    planted_ids = set(composed.get("planted_expectation_ids") or [])
    untagged_absence = []
    for p in prov:
        if p.get("id") in planted_ids:
            continue
        hits = lint_absence_prose(str(p.get("sentence") or ""))
        if hits:
            untagged_absence.extend(hits)

    inferences = [
        p
        for p in prov
        if p.get("composed_inference") or p.get("kind") == "composed_inference"
    ]
    inference_ok = any(
        "coachroof" in str(p.get("sentence") or "").lower()
        and "davit" in str(p.get("sentence") or "").lower()
        for p in inferences
    )

    you_can = len(re.findall(r"(?i)\byou can\b", draft))
    when_needed = bool(re.search(r"(?i)\bwhen needed\b", draft))
    no_enumeration = you_can <= 1 and not when_needed

    block_order = list(composed.get("block_order") or [])
    template = list(composed.get("section_order_template") or SECTION_ORDER)
    idxs = [template.index(b) for b in block_order if b in template]
    ordering_ok = idxs == sorted(idxs) and block_order[:1] == ["capability_summary"]
    ordering_ok = ordering_ok and all(
        b in template for b in block_order
    ) and "caveats" not in block_order and "identity" not in block_order

    annotated = list(composed.get("annotated_facts") or [])
    unattached_ids = {
        str(f.get("id")) for f in annotated if f.get("reduced_confidence")
    }
    inference_bad: list[str] = []
    for inf in inferences:
        for cf in inf.get("contributing_facts") or []:
            if cf in unattached_ids:
                inference_bad.append(cf)

    # (vi′) context_shaping absences must appear in monitoring provenance
    prov_map = composed.get("flag_facts_in_provenance") or {}
    shaping_in_prov = (
        "fact:gx_telemetry_unresolved" in prov_map
        and "fact:victronconnect_monitoring" in prov_map
    )
    # GX must not have its own rendered sentence
    no_gx_sentence = "gx" not in lower and "vrm" not in lower
    no_mppt_display_caveat = "mppt control" not in lower or "optional" not in lower

    # (xi) vessel named
    named_ok = bool(boat) and boat.lower() in lower and "this vessel" not in lower

    # (xii) first-use paren pattern present; avoid repeating full Victron SmartSolar strings many times
    model_repeats = len(re.findall(r"Victron SmartSolar MPPT", draft))
    role_first_ok = "davit array controller" in lower and model_repeats <= 2

    # (xiv) no hedging of verified facts
    hedge_ok = not re.search(
        r"does not appear|is described in the manuals|not confirmed fitted",
        lower,
    )

    economy = composed.get("prose_economy_lint") or lint_prose_economy(draft)
    no_source_cite = len(economy.get("source_citations") or []) == 0
    one_paren = len(economy.get("parentheticals") or []) == 0
    no_restate = len(economy.get("restatement") or []) == 0

    checks = {
        "victronconnect_say_once": vc_once,
        "section_level_claim": section_only,
        "zero_unsourced": len(unsourced) == 0,
        "no_absence_prose": len(absence_hits) == 0 and len(untagged_absence) == 0,
        "zero_internal_vocabulary": len(vocab_hits) == 0,
        "absence_in_provenance": shaping_in_prov and no_gx_sentence,
        "composed_inference_ok": inference_ok,
        "no_per_action_enumeration": no_enumeration,
        "ordering_follows_template": ordering_ok,
        "inference_evidence_clean": len(inference_bad) == 0 and len(inferences) >= 1,
        "vessel_named": named_ok,
        "role_first_model_once": role_first_ok,
        "no_catalog_vocabulary": "control surface" not in lower,
        "no_verified_hedging": hedge_ok and no_mppt_display_caveat,
        "task_ordering": ordering_ok,
        "confidence_via_phrasing": no_source_cite,
        "one_parenthetical_max": one_paren,
        "no_clause_restatement": no_restate,
    }
    notes = {
        "i": "VictronConnect monitoring once" if checks["victronconnect_say_once"] else "fail",
        "ii": "Section-level claim" if checks["section_level_claim"] else "fail",
        "iii": "Zero unsourced" if checks["zero_unsourced"] else "fail",
        "iv′": "No absence prose" if checks["no_absence_prose"] else f"hits {absence_hits}",
        "v": "No internal vocabulary" if checks["zero_internal_vocabulary"] else f"{vocab_hits}",
        "vi′": "Absences in provenance only" if checks["absence_in_provenance"] else "fail",
        "vii": "composed_inference" if checks["composed_inference_ok"] else "fail",
        "viii": "No per-action enumeration" if checks["no_per_action_enumeration"] else "fail",
        "ix′": f"Order {block_order}" if checks["ordering_follows_template"] else f"bad {block_order}",
        "x": "Evidence-clean inference" if checks["inference_evidence_clean"] else "fail",
        "xi": "Vessel named" if checks["vessel_named"] else "missing/forbidden this vessel",
        "xii": "Role-first, model once" if checks["role_first_model_once"] else "fail",
        "xiii": "No catalog vocabulary" if checks["no_catalog_vocabulary"] else "fail",
        "xiv": "No verified-fact hedging" if checks["no_verified_hedging"] else "fail",
        "xv": "No untagged absence" if checks["no_absence_prose"] else "fail",
        "xvi": "Task ordering" if checks["task_ordering"] else "fail",
        "xvii": "Confidence via phrasing (no source cites in prose)"
        if checks["confidence_via_phrasing"]
        else f"citations {economy.get('source_citations')}",
        "xviii": "≤1 parenthetical per sentence"
        if checks["one_parenthetical_max"]
        else f"{economy.get('parentheticals')}",
        "xix": "No clause restatement"
        if checks["no_clause_restatement"]
        else f"{economy.get('restatement')}",
    }
    return {
        "checks": checks,
        "pass": all(checks.values()),
        "version": "v4",
        "obsoleted_criteria": {
            "iv": "flags_as_caveats (GX/optional-display caveat sentences)",
            "vi": "flag_facts_once as rendered Flag prose",
            "ix": "identity→daily_use→operational_guidance→caveats→reference",
        },
        "victronconnect_mentions": lower.count("victronconnect"),
        "unsourced_count": len(unsourced),
        "vocabulary_hits": vocab_hits,
        "absence_hits": absence_hits,
        "prose_economy": economy,
        "flag_facts_in_provenance": prov_map,
        "composed_inferences": len(inferences),
        "context_shaping_consumed": len(composed.get("context_shaping_consumed") or []),
        "block_order": block_order,
        "notes": notes,
    }
