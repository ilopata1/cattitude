"""Stage 4 Navigation & helm — Zeus MFDs + shared software + Halo radar.

Uses ``assemble_section_inputs`` depths:
  full — Zeus SR instances, Zeus SR Software platform, Halo 20+
  provenance — path bridges (never named in body)

Standing policy: ship-with-honest-gaps — ``config_unsourced`` /
``platform_version_unconfirmed`` yield boat-upgradeable placeholders; Halo
installer-only actions stay out of the guest body (radar is named as fitted
and controlled from the MFDs).
"""

from __future__ import annotations

import re
from typing import Any

from guide_composition_rules import (
    WISDOM_PENDING,
    assess_global_composition,
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
    "bg_zeus_sr": "the chartplotters",
    "bg_zeus_sr_1": "the chartplotters",
    "bg_zeus_sr_2": "the chartplotters",
    "bg_zeus_sr_software": "Zeus SR Software",
    "bg_halo_20_plus": "the radar",
}

MANUFACTURER_MODEL: dict[str, tuple[str, str]] = {
    "bg_zeus_sr": ("B&G", "Zeus SR 12"),
    "bg_zeus_sr_1": ("B&G", "Zeus SR 12"),
    "bg_zeus_sr_2": ("B&G", "Zeus SR 12"),
    "bg_zeus_sr_software": ("B&G", "Zeus SR Software"),
    "bg_halo_20_plus": ("B&G", "Halo 20+"),
}

_FORBIDDEN_EXTRA = (
    re.compile(r"\bmasterbus_bridge_interface\b", re.I),
    re.compile(r"\bmasterbus bridge\b", re.I),
    re.compile(r"\bbearing alignment\b", re.I),
    re.compile(r"\bantenna height\b", re.I),
    re.compile(r"\bsector blanking\b", re.I),
    re.compile(r"\bczone touch\b", re.I),
    re.compile(r"\bbg_zeus_sr\b", re.I),
    re.compile(r"\bbg_halo\b", re.I),
)

CONFIG_PLACEHOLDER_MARKER = "[[CONFIG_PENDING]]"

# Installer/technician Halo actions — never guest body.
_HALO_INSTALLER_LEAK_RES = (
    re.compile(r"\bbearing alignment\b", re.I),
    re.compile(r"\bantenna height\b", re.I),
    re.compile(r"\bsector blanking\b", re.I),
    re.compile(r"\berror codes?\b", re.I),
)


def compose_nav_section(
    *,
    graph: VesselGraphResult,
    profiles: dict[str, dict[str, Any]],
    equipment_doc: dict[str, Any],
    section_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compose Navigation & helm Stage 4 for the vessel (v4.37 founding)."""
    boat = resolve_vessel_display_name(equipment_doc)
    inputs = section_inputs or assemble_section_inputs(
        graph, "nav", equipment_doc=equipment_doc
    )

    full_keys = keys_at_depth(inputs, DEPTH_FULL)
    summary_keys = keys_at_depth(inputs, DEPTH_SUMMARY)
    provenance_keys = keys_at_depth(inputs, DEPTH_PROVENANCE)

    # Prefer instance keys; exclude the software platform key.
    zeus_hub_keys = sorted(
        k
        for k in full_keys
        if (k == "bg_zeus_sr" or k.startswith("bg_zeus_sr_"))
        and "software" not in k
    )
    platform_key = next(
        (k for k in full_keys if graph.devices[k].role == "PLATFORM"),
        None,
    )
    halo_key = next((k for k in full_keys if k.startswith("bg_halo")), None)

    hub_profile: dict[str, Any] = {}
    if zeus_hub_keys:
        hub_profile = dict(graph.devices[zeus_hub_keys[0]].profile or {})
    platform_profile: dict[str, Any] = {}
    if platform_key:
        platform_profile = dict(graph.devices[platform_key].profile or {})

    controls_xref = format_section_xref("controls")

    first_use: set[str] = set()
    provenance_map: list[dict[str, Any]] = []
    block_order: list[str] = []
    context_shaping_consumed: list[dict[str, Any]] = []
    config_placeholder_ids: list[str] = []
    fact_queries: list[dict[str, str]] = []

    def _name(key: str) -> str:
        base = re.sub(r"_\d+$", "", key)
        if key not in first_use and base not in first_use:
            first_use.add(key)
            first_use.add(base)
            role = DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or "the device"
            mm = MANUFACTURER_MODEL.get(key) or MANUFACTURER_MODEL.get(base)
            if mm and mm[0]:
                return f"{role} ({mm[0]} {mm[1]})"
            if mm:
                return f"{role} ({mm[1]})"
            return role
        return DISPLAY_NAMES.get(key) or DISPLAY_NAMES.get(base) or "the device"

    def _emit(
        text: str,
        *sources: str,
        kind: str = "sourced",
        block: str = "capability_summary",
        config_placeholder: bool = False,
        links: list[dict[str, str]] | None = None,
    ) -> str:
        sid = f"S{len(provenance_map) + 1}"
        if kind != "planted_expectation" and not config_placeholder:
            abs_hits = lint_absence_prose(text)
            if abs_hits:
                raise ValueError(
                    f"absence prose forbidden on {sid!r}: {abs_hits} in {text!r}"
                )

        hits = lint_reader_vocabulary(text)
        for rx in _FORBIDDEN_EXTRA:
            if rx.search(text):
                hits.append(rx.pattern)
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
        if config_placeholder:
            entry["config_placeholder"] = True
            config_placeholder_ids.append(sid)
        if links:
            entry["links"] = list(links)
        provenance_map.append(entry)
        if block not in block_order:
            block_order.append(block)
        return sid

    config_unsourced = False
    for flag in inputs.get("flags") or []:
        fname = str(flag.get("flag") or "")
        rel = flag_reader_relevance(fname)
        if rel == "context_shaping":
            context_shaping_consumed.append(dict(flag))
        if fname == "config_unsourced":
            config_unsourced = True
        if fname == "platform_version_unconfirmed":
            context_shaping_consumed.append(dict(flag))

    # Halo installer actions → context_shaping (omit from body).
    if halo_key:
        halo_prof = graph.devices[halo_key].profile or {}
        for action in halo_prof.get("operator_actions") or []:
            if not isinstance(action, dict):
                continue
            if str(action.get("audience") or "") != "installer_or_technician":
                continue
            context_shaping_consumed.append(
                {
                    "flag": "installer_action_omitted",
                    "device": halo_key,
                    "action": action.get("action"),
                    "detail": "Halo install-manual commissioning — not guest body",
                }
            )

    present_pages = [
        str(p.get("name") or "").strip()
        for p in (inputs.get("present_platform_pages") or [])
        if p.get("present") and str(p.get("name") or "").strip()
    ]
    present_l = {n.lower() for n in present_pages}

    # App tiles vs shell chrome (System Guide inventory).
    _SHELL = {
        "home screen",
        "apps",
        "alerts",
        "connected devices",
        "czone digital switching",
    }
    app_names = [n for n in present_pages if n.lower() not in _SHELL]
    has_czone_page = "czone digital switching" in present_l
    has_radar_app = "radar" in present_l
    has_alerts = "alerts" in present_l
    has_home = "home screen" in present_l
    has_apps_shell = "apps" in present_l

    def _emit_topic(
        text: str,
        *sources: str,
        kind: str = "sourced",
        block: str = "capability_summary",
        topic: str = "",
        config_placeholder: bool = False,
        links: list[dict[str, str]] | None = None,
    ) -> str:
        sid = _emit(
            text,
            *sources,
            kind=kind,
            block=block,
            config_placeholder=config_placeholder,
            links=links,
        )
        if topic and provenance_map:
            provenance_map[-1]["topic"] = topic
        return sid

    # ========== CAPABILITY (what is fitted) ==========
    # nav-ix: identity → fitted sensors → app inventory; no imperatives here.
    zeus_label_key = zeus_hub_keys[0] if zeus_hub_keys else "bg_zeus_sr"
    chartplotters = _name(zeus_label_key)
    for k in zeus_hub_keys:
        first_use.add(k)
        first_use.add(re.sub(r"_\d+$", "", k))

    plat_role = DISPLAY_NAMES.get(platform_key or "", "Zeus SR Software")
    if platform_key:
        first_use.add(platform_key)
        first_use.add(re.sub(r"_\d+$", "", platform_key))

    if len(zeus_hub_keys) >= 2:
        mm = MANUFACTURER_MODEL.get("bg_zeus_sr") or ("B&G", "Zeus SR 12")
        chartplotters = f"two chartplotters ({mm[0]} {mm[1]})"

    _emit_topic(
        f"On {boat}, helm navigation runs through {chartplotters}, which host "
        f"{plat_role}.",
        *[f"equipment.{k}" for k in zeus_hub_keys] or ["equipment.bg_zeus_sr"],
        f"profile.{zeus_label_key}.runs_platform",
        f"profile.{platform_key}.entity_kind" if platform_key else "profile.platform",
        "vessel.display_name",
        block="capability_summary",
        topic="station",
    )

    if halo_key:
        first_use.add(halo_key)
        first_use.add(re.sub(r"_\d+$", "", halo_key))
        mm = MANUFACTURER_MODEL.get("bg_halo_20_plus") or ("B&G", "Halo 20+")
        _emit_topic(
            f"A radar ({mm[0]} {mm[1]}) is fitted on the boat network and is "
            f"controlled from those displays.",
            f"equipment.{halo_key}",
            f"profile.{halo_key}.data_roles",
            f"profile.{zeus_label_key}.operator_actions",
            block="capability_summary",
            topic="sensors",
        )

    if app_names:
        listed = ", ".join(app_names)
        _emit_topic(
            f"The home-screen apps include {listed}.",
            f"profile.{platform_key}.ui_pages" if platform_key else "profile.ui_pages",
            "section_inputs.present_platform_pages",
            block="capability_summary",
            topic="app_inventory",
        )

    # ========== HOW IT WORKS (orientation only — no day-to-day imperatives) ==========
    data_roles = hub_profile.get("data_roles") or {}
    if data_roles.get("displays_data_from_other_devices"):
        _emit_topic(
            "The chartplotters display data from other devices on the boat "
            "network.",
            f"profile.{zeus_label_key}.data_roles.displays_data_from_other_devices",
            block="how_it_works",
            topic="network",
        )

    # nav-xi: app-access how-to (home screen) belongs in adjusting AFTER power,
    # not in how_it_works orientation. Turning the unit on precedes reaching
    # apps. Keep how_it_works to network role + CZone xref only.

    if has_czone_page:
        # OEM System Guide: control-bar switches appear when a CZone device is
        # "commissioned on the NMEA 2000 network." CZone is already fitted on
        # this vessel — do not hedge "when commissioned" in guest prose.
        # Still queue whether Zeus actually shows/controls those switches.
        _emit_topic(
            "A CZone Digital switching controller is available on the "
            f"chartplotters; circuit control can be found in "
            f"{controls_xref['phrase']}.",
            f"profile.{platform_key}.ui_pages[CZone Digital switching]",
            f"profile.{zeus_label_key}.ui_pages[CZone Digital switching]",
            "xref.controls",
            "oem:system_guide:czone_controller_nmea_commissioned",
            block="how_it_works",
            topic="czone_xref",
            links=[section_xref_link("controls")],
        )
        fact_queries.append(
            {
                "id": "zeus_czone_controller_visible",
                "device": zeus_label_key,
                "platform_key": platform_key or "bg_zeus_sr_software",
                "missing": (
                    "Owner confirm: do the Zeus SR chartplotters show the "
                    "CZone Digital switching controller / control-bar switches "
                    "and control house circuits from there, or is CZone used "
                    "only from the Touch 7? OEM: switches appear when a CZone "
                    "device is commissioned on NMEA 2000 — fitted ≠ confirmed "
                    "visible on Zeus."
                ),
            }
        )

    # ========== MONITORING ==========
    # nav-x: no "day-to-day"; xxxix still needs a when/why occasion on imperatives.
    if has_alerts:
        _emit_topic(
            "Open Alerts when you want recent or historic system alerts on the "
            "chartplotters.",
            f"profile.{platform_key}.ui_pages[Alerts]",
            block="monitoring",
            topic="alerts",
        )
    else:
        _emit_topic(
            "Open Alerts when you want alert messages on the chartplotters.",
            f"profile.{zeus_label_key}.operator_actions",
            block="monitoring",
            topic="alerts",
        )

    # ========== STARTUP (power-on gates monitoring + adjusting) ==========
    # nav-xii / v4.37.5: turning the unit on is the session bookend and sorts
    # ahead of monitoring on the spine. nav-x: omit "day-to-day" timing labels.
    power_sources = [
        f"profile.{platform_key}.operator_actions" if platform_key else "",
        f"profile.{zeus_label_key}.operator_actions",
    ]
    _emit_topic(
        "Turn a chartplotter on or off from its power control when leaving or "
        "returning to the helm.",
        *[s for s in power_sources if s],
        block="startup",
        topic="power",
    )

    # ========== ADJUSTING (helm session: routine → customize → exceptional) ==========
    # nav-ix / v4.9: home → primary apps (chart, radar) → pin/split → MOB.

    if has_home:
        # nav-xiii: no "once powered on" bridge here — the startup→next-block
        # transition reads on its own. Keep the home step plain.
        _emit_topic(
            "Open the home screen when you need apps, settings, or alerts.",
            f"profile.{platform_key}.ui_pages[Home screen]" if platform_key else (
                "profile.ui_pages[Home screen]"
            ),
            block="adjusting",
            topic="home",
        )

    if "chart" in present_l:
        _emit_topic(
            "Open the Chart app from the home screen when you want navigation "
            "charts.",
            f"profile.{platform_key}.ui_pages[Chart]",
            block="adjusting",
            topic="chart",
        )

    if has_radar_app or halo_key:
        _emit_topic(
            "Open the Radar app from the home screen when you want the radar "
            "display, and set all radars to standby from a chartplotter when "
            "you want connected radars to stop transmitting.",
            f"profile.{platform_key}.ui_pages[Radar]" if has_radar_app and platform_key else (
                f"profile.{zeus_label_key}.operator_actions"
            ),
            f"profile.{zeus_label_key}.operator_actions",
            f"equipment.{halo_key}" if halo_key else "section_inputs.present_platform_pages",
            block="adjusting",
            topic="radar",
        )

    if has_apps_shell:
        _emit_topic(
            "Pin apps you use most often to the activity bar when you want "
            "faster access, and create a custom app group with New split when "
            "you want two or more apps on screen at once.",
            f"profile.{platform_key}.ui_pages[Apps]",
            block="adjusting",
            topic="customize",
        )

    if "mob" in present_l:
        _emit_topic(
            "Activate MOB in an emergency to create a MOB waypoint at the "
            "current position and open the MOB app.",
            f"profile.{platform_key}.ui_pages[MOB]",
            f"profile.{platform_key}.operator_actions" if platform_key else (
                f"profile.{zeus_label_key}.operator_actions"
            ),
            block="adjusting",
            topic="mob",
        )
    else:
        _emit_topic(
            "Activate MOB on a chartplotter in an emergency to mark the "
            "current position.",
            f"profile.{platform_key}.operator_actions" if platform_key else (
                f"profile.{zeus_label_key}.operator_actions"
            ),
            block="adjusting",
            topic="mob",
        )

    # ========== TROUBLESHOOTING / CONFIG GAP ==========
    placeholder = (
        f"{CONFIG_PLACEHOLDER_MARKER} "
        f"Exact chart layouts, radar overlays, pinned favourites, and alert "
        f"rules are not yet recorded for this installation; they will appear "
        f"here once an owner screen walkthrough or settings confirmation is "
        f"available."
    )
    _emit_topic(
        placeholder,
        "graph.flag:config_unsourced",
        "graph.flag:platform_version_unconfirmed",
        "policy:ship_with_honest_gaps",
        kind="config_placeholder",
        block="troubleshooting",
        topic="config_gap",
        config_placeholder=True,
    )
    if not config_unsourced:
        context_shaping_consumed.append(
            {
                "flag": "config_placeholder_emitted_without_flag",
                "detail": "Nav founding always ships honest-gap placeholder",
            }
        )

    # ========== REFERENCE (care) ==========
    _emit_topic(
        "Fit the sun cover to shield a chartplotter display when leaving the "
        "helm for an extended period.",
        f"profile.{zeus_label_key}.operator_actions",
        block="reference",
        topic="care_cover",
    )
    _emit_topic(
        "Clean the screen with a soft microfiber or cotton cloth to maintain "
        "clarity.",
        f"profile.{zeus_label_key}.operator_actions",
        block="reference",
        topic="care_clean",
    )

    path_meta = [f"path_device:{k}" for k in provenance_keys]
    for row in provenance_map:
        if path_meta and row["block"] in {"troubleshooting", "how_it_works"}:
            row.setdefault("provenance_metadata", []).extend(path_meta)

    title = "# Navigation & Helm\n"
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
            if r.get("config_placeholder"):
                text = text.replace(CONFIG_PLACEHOLDER_MARKER, "").strip()
                if not text.startswith("("):
                    text = f"(Configuration pending) {text}"
            lines.append(text)
        # nav-ix: capability = one functional-group paragraph (v4.15).
        if block == "capability_summary" and len(lines) > 1:
            paragraphs.append(" ".join(lines))
        elif block == "how_it_works" and len(rows) > 1:
            orient = [
                ln
                for ln, row in zip(lines, rows)
                if row.get("topic") != "czone_xref"
            ]
            xref = [
                ln
                for ln, row in zip(lines, rows)
                if row.get("topic") == "czone_xref"
            ]
            if orient:
                paragraphs.append(" ".join(orient))
            paragraphs.extend(xref)
        else:
            paragraphs.append("\n\n".join(lines))
    draft = title + "\n\n".join(paragraphs)

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

    wisdom_slot = {
        "status": WISDOM_PENDING,
        "sentence_id": None,
        "block": "how_it_works",
        "inference_ids": [],
        "note": (
            "Nav wisdom pending — comparative helm/radar claim not yet sourced."
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
        "config_placeholder_ids": config_placeholder_ids,
        "summary_keys": summary_keys,
        "full_keys": full_keys,
        "provenance_keys": provenance_keys,
        "zeus_hub_keys": zeus_hub_keys,
        "platform_key": platform_key,
        "halo_key": halo_key,
        "excluded_candidates": list(inputs.get("candidates_excluded") or []),
        "vocabulary_lint": vocab,
        "absence_lint": absence,
        "prose_economy_lint": economy,
        "vessel_display_name": boat,
        "wisdom_slot": wisdom_slot,
        "fact_queries": fact_queries,
        "version": "v4.37.6",
    }


def evaluate_nav_draft(
    composed: dict[str, Any],
    *,
    expected_inputs: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Evaluate Nav draft against founding criteria (nav-i–nav-viii)."""
    draft = str(composed.get("draft_markdown") or "")
    lower = draft.lower()
    boat = str(composed.get("vessel_display_name") or "")
    prov = list(composed.get("provenance_map") or [])

    unsourced = [p for p in prov if not (p.get("sources") or [])]
    vocab_hits = list(composed.get("vocabulary_lint") or [])
    absence_hits = list(composed.get("absence_lint") or [])
    economy = composed.get("prose_economy_lint") or lint_prose_economy(draft)
    voice = assess_reader_voice_style(draft, vessel_display_name=boat)
    global_comp = assess_global_composition(
        composed, require_filled_wisdom=False
    )

    path_named = any(
        k.replace("_", " ") in lower for k in (composed.get("provenance_keys") or [])
    ) or ("masterbus bridge" in lower)

    installer_leak = any(rx.search(draft) for rx in _HALO_INSTALLER_LEAK_RES)

    placeholder_rows = [
        p
        for p in prov
        if p.get("config_placeholder") or p.get("kind") == "config_placeholder"
    ]
    placeholder_ok = bool(placeholder_rows) and (
        "configuration pending" in lower
        or "will appear here" in lower
        or "not yet recorded" in lower
    )

    has_zeus = "zeus" in lower or "chartplotter" in lower
    has_halo = "halo" in lower or "radar" in lower
    has_mob = "mob" in lower
    has_controls_xref = "controls" in lower and "section of this guide" in lower

    inputs_ok = True
    notes: list[str] = []
    if expected_inputs:
        got = {
            c["device_key"]: c["depth"]
            for c in (composed.get("section_inputs") or {}).get("contributors")
            or []
        }
        exp = {
            c["device_key"]: c["depth"]
            for c in (expected_inputs.get("contributors") or [])
        }
        if got != exp:
            inputs_ok = False
            notes.append(f"inputs mismatch got={got} expected={exp}")

    # nav-ix — helm session topic order within adjusting (routine → exceptional).
    adjusting_topics = [
        str(p.get("topic") or "")
        for p in prov
        if p.get("block") == "adjusting" and p.get("topic")
    ]
    expected_rank = {
        "home": 0,
        "chart": 1,
        "radar": 2,
        "customize": 3,
        "mob": 4,
    }
    ranks = [expected_rank[t] for t in adjusting_topics if t in expected_rank]
    helm_arc_ok = ranks == sorted(ranks)
    # nav-xii — power-on lives in the "startup" block and sorts before monitoring.
    startup_topics = [
        str(p.get("topic") or "")
        for p in prov
        if p.get("block") == "startup" and p.get("topic")
    ]
    power_in_startup = "power" in startup_topics
    # how_it_works must not carry day-to-day Open/Turn/Activate imperatives.
    hiw = " ".join(
        str(p.get("sentence") or "")
        for p in prov
        if p.get("block") == "how_it_works"
    )
    hiw_no_imperative = not bool(
        re.search(r"\b(Open|Turn|Activate|Set|Press)\b", hiw)
    )
    # CZone mentioned at most once in body (xref slot, not duplicated adjusting).
    czone_mentions = lower.count("czone")
    czone_once = czone_mentions <= 2  # "CZone" + "CZone Digital" in one sentence OK

    # nav-xi: turning the unit on precedes any app-access how-to (home screen).
    power_idx = lower.find("turn a chartplotter on or off")
    home_access_idx = lower.find("open the home screen")
    power_before_app_access = (
        power_idx == -1
        or home_access_idx == -1
        or power_idx < home_access_idx
    )
    # how_it_works must not pre-explain reaching apps (home screen) before power.
    hiw_lower = hiw.lower()
    hiw_no_app_access = (
        "home screen" not in hiw_lower and "open " not in hiw_lower
    )
    # nav-xii: power-on renders before monitoring (Alerts).
    alerts_idx = lower.find("open alerts")
    power_before_monitoring = (
        power_idx == -1
        or alerts_idx == -1
        or power_idx < alerts_idx
    )
    # nav-xiii: a startup→next-block bridge ("once powered on", etc.), if used
    # at all, belongs only on the first post-startup body action (the first
    # monitoring action, or first adjusting action when no monitoring). It must
    # never ride the home / app-access step.
    home_idx = lower.find("open the home screen")
    startup_bridge_res = ("once powered on", "after powering on", "with the unit on")
    home_sentence = ""
    if home_idx != -1:
        home_end = lower.find(".", home_idx)
        home_sentence = lower[home_idx:home_end if home_end != -1 else None]
    no_bridge_on_home = not any(b in home_sentence for b in startup_bridge_res)

    has_app_inventory = "home-screen apps include" in lower or (
        "chart" in lower and "radar" in lower and "mob" in lower
    )

    checks = {
        "no_unsourced_sentences": len(unsourced) == 0,
        "vocabulary_ok": len(vocab_hits) == 0,
        "absence_ok": len(absence_hits) == 0,
        "prose_economy_ok": not any(economy.values()),
        "path_devices_unnamed": not path_named,
        "halo_installer_omitted": not installer_leak,
        "config_placeholder_present": placeholder_ok,
        "names_zeus_station": has_zeus,
        "names_radar": has_halo,
        "includes_mob": has_mob,
        "app_inventory_present": has_app_inventory,
        "helm_session_arc_ok": helm_arc_ok,
        "how_it_works_orientation_only": hiw_no_imperative,
        "power_in_startup_block": power_in_startup,
        "power_precedes_monitoring": power_before_monitoring,
        "no_startup_bridge_on_home": no_bridge_on_home,
        "power_precedes_app_access": power_before_app_access,
        "how_it_works_no_app_access": hiw_no_app_access,
        "czone_xref_not_duplicated": czone_once,
        "no_routine_timing_label": "day-to-day" not in lower,
        "no_commissioned_hedge": "commissioned" not in lower,
        "controls_xref_present": has_controls_xref,
        "inputs_match": inputs_ok,
        "global_composition_ok": bool(global_comp.get("pass")),
        "vessel_named": bool(boat) and boat.lower() in lower,
        "zeus_czone_visibility_queued": (
            any(
                isinstance(q, dict) and q.get("id") == "zeus_czone_controller_visible"
                for q in (composed.get("fact_queries") or [])
            )
            if has_controls_xref
            else True
        ),
    }
    style_warnings = list(voice.get("style_warnings") or [])
    authorial = [w for w in style_warnings if w.get("code") == "authorial_xref_voice"]
    checks["authorial_xref_clean"] = len(authorial) == 0

    passed = all(checks.values())
    if not passed:
        notes.append(f"failed={[k for k, v in checks.items() if not v]}")
        if not global_comp.get("pass"):
            notes.append(f"global={global_comp.get('findings')}")

    return {
        "pass": passed,
        "checks": checks,
        "notes": notes,
        "style_warnings": style_warnings,
        "global_composition": global_comp,
        "criteria": "nav-i–nav-xiii (founding v4.37.6; plain home step)",
    }
