"""Stage 1 procedure inventory (v4.2) — heuristics + reconcile + gated repair.

Usage (from backend/):
  python scripts/verify_interaction_profile_procedures.py
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_procedures import (
    PROCEDURE_REPAIR_ENABLED,
    PROCEDURE_UNACCOUNTED,
    ALTERNATIVE_UNACCOUNTED,
    DETERMINISTIC_FILL,
    adjudicated_repair_id,
    apply_procedure_repair,
    build_procedure_inventory,
    build_procedure_repair_trailer,
    filter_adjudicated_unaccounted,
    inventory_procedures_from_excerpts,
    reconcile_procedure_inventory,
    run_procedure_inventory_pass,
)
from interaction_profile_options import collapse_option_value_actions

FIXTURES = _BACKEND / "tests" / "fixtures"
LAST_GREEN = _BACKEND / "fixtures" / "pipeline" / "last_green"


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    # Gate on; repair still scoped to adjudicated classes only (v4.3).
    check(
        PROCEDURE_REPAIR_ENABLED is True,
        "PROCEDURE_REPAIR_ENABLED must default True (adjudicated-classes scope)",
    )

    # Synthetic excerpts covering SmartSolar recall targets.
    excerpts = [
        {
            "text": (
                "5.3. Updating firmware\n"
                "The firmware can be checked and updated with the VictronConnect app.\n"
                "• Connect to the solar charger.\n"
                "• Perform a firmware update.\n"
            ),
            "source_heading_guess": "5.3. Updating firmware",
        },
        {
            "text": (
                "5.4. Disabling and enabling Bluetooth\n"
                "Bluetooth is by default enabled. It can be disabled or enabled "
                "via the VictronConnect app.\n"
                "To disable or enable Bluetooth:\n"
                "• Connect with the VictronConnect app.\n"
            ),
            "source_heading_guess": "5.4. Disabling and enabling Bluetooth",
        },
        {
            "text": (
                "Setting the Sunset action\n"
                "At sunset you can choose any of the following actions:\n"
                "• Keep the lights off\n"
                "• Switch on for a fixed time\n"
            ),
        },
        {
            "text": (
                "Use this function when connecting to a GX device or GlobalLink 520, "
                "or any other device that needs to communicate via VE.Direct.\n"
            ),
        },
        {
            "text": "18. TECHNICAL DATA\nBattery voltage 12/24/48V\n",
            "source_heading_guess": "18. TECHNICAL DATA",
        },
    ]

    inventory = build_procedure_inventory(excerpts)
    titles = {str(p.get("title") or "").lower() for p in inventory["procedures"]}
    check(
        any("firmware" in t for t in titles),
        f"inventory must include firmware procedure; got {sorted(titles)}",
    )
    check(
        any("bluetooth" in t for t in titles),
        f"inventory must include Bluetooth procedure; got {sorted(titles)}",
    )
    check(
        any("sunset" in t for t in titles),
        f"inventory must include sunset action; got {sorted(titles)}",
    )
    alt_titles = " ".join(
        str(a.get("title") or "") for a in inventory["alternatives"]
    ).lower()
    check(
        "globallink" in alt_titles or "gx device" in alt_titles,
        f"inventory must see GX/GlobalLink alternatives; got {inventory['alternatives']}",
    )

    sparse_profile = {
        "operator_actions": [
            {"action": "monitor via the VictronConnect app", "context": "daily"}
        ],
        "requires_devices": [
            {
                "description_verbatim": "GX device",
                "needed_for": "data_roles.exposes_data_to_network",
            }
        ],
        "validation_flags": [],
    }
    recon = reconcile_procedure_inventory(inventory, sparse_profile)
    unacc_titles = [
        str(u.get("title") or "").lower()
        for u in recon.get("unaccounted_procedures") or []
    ]
    check(
        any("firmware" in t for t in unacc_titles),
        f"firmware must be unaccounted vs sparse profile; got {unacc_titles}",
    )
    check(
        any("bluetooth" in t for t in unacc_titles),
        f"bluetooth must be unaccounted; got {unacc_titles}",
    )
    check(
        any("sunset" in t for t in unacc_titles),
        f"sunset must be unaccounted; got {unacc_titles}",
    )
    check(
        any(f.get("flag") == PROCEDURE_UNACCOUNTED for f in recon["validation_flags"]),
        "must emit procedure_unaccounted flags",
    )
    check(
        any(f.get("flag") == ALTERNATIVE_UNACCOUNTED for f in recon["validation_flags"]),
        "GlobalLink missing must emit alternative_unaccounted",
    )
    # TECHNICAL DATA is dropped by structural/spec filters (or classified).
    tech_in_inv = any(
        "technical" in str(p.get("title") or "").lower()
        for p in inventory.get("procedures") or []
    )
    check(
        not tech_in_inv
        or any(
            "spec" in str(c.get("classification") or "").lower()
            for c in recon.get("classified") or []
        ),
        "TECHNICAL DATA must be filtered or classified, not unaccounted",
    )

    # --- (1) Shutdown/restart maps to derived pair ---
    shutdown_inv = build_procedure_inventory(
        [
            {
                "text": (
                    "7.1. Shutdown and restart procedure\n"
                    "To shut down the solar charger:\n"
                    "• Disconnect the PV supply.\n"
                    "To restart:\n"
                    "• Connect the battery supply.\n"
                ),
                "source_heading_guess": "7.1. Shutdown and restart procedure",
            }
        ]
    )
    derived_pair_profile = {
        "operator_actions": [
            {
                "action": "shutdown the device",
                "context": "situational",
                "source": "derived",
                "derived_from": "evidence[0]",
            },
            {
                "action": "restart the device",
                "context": "situational",
                "source": "derived",
                "derived_from": "evidence[0]",
            },
        ],
        "control_surfaces": [],
        "requires_devices": [],
        "validation_flags": [],
    }
    recon_sd = reconcile_procedure_inventory(shutdown_inv, derived_pair_profile)
    check(
        any(
            "shutdown" in str(a.get("title") or "").lower()
            and a.get("status") == "accounted_action"
            for a in recon_sd.get("accounted") or []
        ),
        "'Shutdown and restart procedure' must map to derived pair",
    )
    check(
        not any(
            "shutdown" in str(u.get("title") or "").lower()
            for u in recon_sd.get("unaccounted_procedures") or []
        ),
        "shutdown/restart must not remain unaccounted against derived pair",
    )

    # --- (1) VictronConnect or MPPT Control display = surface + requires ---
    vc_excerpts = [
        {
            "text": (
                "Settings can be made using the VictronConnect or the optional "
                "MPPT Control display.\n"
            )
        }
    ]
    vc_inv = build_procedure_inventory(vc_excerpts)
    # Ensure OR alt is present (may need display wording match).
    if not vc_inv.get("alternatives"):
        vc_inv = {
            "procedures": [],
            "alternatives": [
                {
                    "title": "VictronConnect or MPPT Control display",
                    "kind": "enumerated_alternatives",
                    "alternatives": ["VictronConnect", "MPPT Control display"],
                    "excerpt_ref": "excerpt[0]",
                    "source": "heuristic",
                }
            ],
        }
    vc_profile = {
        "operator_actions": [],
        "control_surfaces": [
            {
                "surface": "mobile_app_bluetooth",
                "label_verbatim": "VictronConnect app",
                "optional_accessory": False,
            }
        ],
        "requires_devices": [
            {
                "description_verbatim": "MPPT Control - an (optional) external display",
                "needed_for": "control_surfaces[0]",
                "requirement_kind": "device",
            }
        ],
        "validation_flags": [],
    }
    recon_vc = reconcile_procedure_inventory(vc_inv, vc_profile)
    check(
        not recon_vc.get("unaccounted_alternatives"),
        "VictronConnect or MPPT Control display must be fully accounted "
        f"(surface+requires); left {recon_vc.get('unaccounted_alternatives')}",
    )

    # --- (2) Installer auto-classify (DIP) recorded not flagged ---
    dip_inv = build_procedure_inventory(
        [
            {
                "text": (
                    "8.1 Set DIP switch 1 to the OFF position\n"
                    "• Use a small screwdriver.\n"
                    "• Set DIP switch 1 to OFF.\n"
                ),
                "source_heading_guess": "8.1 Set DIP switch 1 to the OFF position",
            }
        ]
    )
    recon_dip = reconcile_procedure_inventory(dip_inv, {"operator_actions": [], "validation_flags": []})
    check(
        any(
            str(c.get("classification") or "").endswith(":installer")
            for c in recon_dip.get("classified") or []
        ),
        f"DIP procedure must auto-classify installer; got {recon_dip}",
    )
    check(
        not any(
            f.get("flag") == PROCEDURE_UNACCOUNTED
            for f in recon_dip.get("validation_flags") or []
        ),
        "installer-classified items must not emit procedure_unaccounted",
    )

    # --- (4) fuzzy dedupe heading vs in-text ---
    dedupe_inv = build_procedure_inventory(
        [
            {
                "text": (
                    "5.4. Disabling and enabling Bluetooth\n"
                    "To disable or enable Bluetooth:\n"
                    "• Connect with the VictronConnect app.\n"
                ),
                "source_heading_guess": "5.4. Disabling and enabling Bluetooth",
            }
        ]
    )
    bt_titles = [
        str(p.get("title") or "")
        for p in dedupe_inv.get("procedures") or []
        if "bluetooth" in str(p.get("title") or "").lower()
    ]
    check(
        len(bt_titles) <= 1,
        f"Bluetooth heading variants must fuzzy-dedupe to ≤1; got {bt_titles}",
    )

    # Full profile that accounts for everything.
    full = {
        "operator_actions": [
            {"action": "update firmware", "context": "situational"},
            {"action": "disable Bluetooth", "context": "situational"},
            {"action": "enable Bluetooth", "context": "situational"},
            {"action": "set the sunset action", "context": "situational"},
            {"action": "monitor via the VictronConnect app", "context": "daily"},
        ],
        "control_surfaces": [
            {"surface": "mobile_app_bluetooth", "label_verbatim": "VictronConnect app"}
        ],
        "requires_devices": [
            {"description_verbatim": "GX device", "needed_for": "data_roles.exposes_data_to_network"},
            {
                "description_verbatim": "GlobalLink 520",
                "needed_for": "data_roles.exposes_data_to_network",
            },
        ],
        "validation_flags": [],
    }
    recon_full = reconcile_procedure_inventory(inventory, full)
    check(
        not recon_full.get("unaccounted_procedures"),
        f"full profile must account procedures; left {recon_full.get('unaccounted_procedures')}",
    )
    check(
        not recon_full.get("unaccounted_alternatives"),
        f"full profile must account GlobalLink; left {recon_full.get('unaccounted_alternatives')}",
    )

    # Without map_fn, gate-on pass skips repair but keeps unaccounted flags.
    profile2, payload = run_procedure_inventory_pass(
        sparse_profile, excerpts=excerpts, repair_enabled=None, repair_map_fn=None
    )
    check(
        payload.get("repair_enabled") is True,
        "default pass must leave repair enabled",
    )
    check(
        (payload.get("repair") or {}).get("skipped") is True
        or (payload.get("repair") or {}).get("attempted") is False,
        "repair must skip when map_fn is absent",
    )
    check(
        any(
            f.get("flag") == PROCEDURE_UNACCOUNTED
            for f in (profile2.get("validation_flags") or [])
        ),
        "no-map_fn pass must still attach procedure_unaccounted",
    )
    adjudicated = filter_adjudicated_unaccounted(
        list((payload.get("reconciliation") or {}).get("unaccounted") or [])
        or list(recon.get("unaccounted") or [])
    )
    check(
        len(adjudicated) >= 3,
        f"synthetic unaccounted must include adjudicated SmartSolar items; got {adjudicated}",
    )
    check(
        adjudicated_repair_id({"title": "Noise TOC chapter"}) is None,
        "non-adjudicated titles must not match repair scope",
    )

    # Repairer fixture-tested when explicitly enabled.
    trailer = build_procedure_repair_trailer(
        filter_adjudicated_unaccounted(list(recon["unaccounted"]))
    )
    check(
        "not yet profiled" in trailer and "firmware" in trailer.lower(),
        f"repair trailer must name procedures; got {trailer!r}",
    )
    check(
        "ADJUDICATION:" in trailer,
        f"repair trailer must include adjudication notes; got {trailer!r}",
    )

    def _fake_map(_scoped, _trailer):
        return {
            "operator_actions": [
                {"action": "update firmware", "audience": "operator", "context": "situational"},
                {
                    "action": "disable Bluetooth",
                    "audience": "operator",
                    "context": "situational",
                },
                {
                    "action": "set the sunset action",
                    "audience": "operator",
                    "context": "situational",
                },
            ],
            "requires_devices": [
                {
                    "description_verbatim": "GlobalLink 520",
                    "needed_for": "data_roles.exposes_data_to_network",
                }
            ],
        }

    repaired, meta = apply_procedure_repair(
        deepcopy(sparse_profile),
        unaccounted=list(recon["unaccounted"]),
        excerpts=excerpts,
        map_fn=_fake_map,
        enabled=True,
    )
    check(meta.get("attempted") is True, "enabled repair must attempt")
    acts = " | ".join(
        str(a.get("action") or "").lower()
        for a in (repaired.get("operator_actions") or [])
    )
    check("firmware" in acts, f"repair must union firmware action; got {acts}")
    check("sunset" in acts, f"repair must union sunset action; got {acts}")
    reqs = " | ".join(
        str(r.get("description_verbatim") or "").lower()
        for r in (repaired.get("requires_devices") or [])
    )
    check("globallink" in reqs, f"repair must union GlobalLink; got {reqs}")

    # Disabled gate ignores map_fn.
    untouched, meta_off = apply_procedure_repair(
        deepcopy(sparse_profile),
        unaccounted=list(recon["unaccounted"]),
        excerpts=excerpts,
        map_fn=_fake_map,
        enabled=False,
    )
    check(meta_off.get("skipped") is True, "disabled repair must skip")
    check(
        len(untouched.get("operator_actions") or [])
        == len(sparse_profile.get("operator_actions") or []),
        "disabled repair must not mutate actions",
    )

    # --- Guard: Gen-/Mains style operator-mode titles cannot be filtered/classified ---
    protect_excerpts = [
        {
            "text": (
                "3.4.5 Gen-/Mains support\n"
                "See figure 3-8. With Generator / mains support mode enabled, "
                "the inverter will operate in parallel with the external AC source.\n"
            ),
            "source_heading_guess": "3.4.5 Gen-/Mains support",
        },
        {
            "text": (
                "3.4.4 Power sharing mode\n"
                "The Power Sharing level can be adjusted.\n"
                "• Set the Power Sharing level.\n"
            ),
            "source_heading_guess": "3.4.4 Power sharing mode",
        },
    ]
    protect_inv = build_procedure_inventory(protect_excerpts)
    protect_titles = {
        str(p.get("title") or "").lower() for p in protect_inv.get("procedures") or []
    }
    check(
        any("gen" in t and "mains" in t and "support" in t for t in protect_titles),
        f"Gen-/Mains support must survive inventory filters; got {sorted(protect_titles)}",
    )
    check(
        not any(
            "gen" in str(f.get("title") or "").lower() and "mains" in str(f.get("title") or "").lower()
            for f in protect_inv.get("filtered") or []
        ),
        "Gen-/Mains support must not appear in filtered trail",
    )
    protect_recon = reconcile_procedure_inventory(
        protect_inv, {"operator_actions": [], "control_surfaces": [], "requires_devices": []}
    )
    check(
        any(
            "gen" in str(u.get("title") or "").lower() and "support" in str(u.get("title") or "").lower()
            for u in protect_recon.get("unaccounted_procedures") or []
        ),
        "Gen-/Mains support must be unaccounted (not installer-classified) vs empty profile",
    )
    trail_gen = [
        t
        for t in protect_recon.get("accounting_trail") or []
        if "gen" in str(t.get("title") or "").lower() and "support" in str(t.get("title") or "").lower()
    ]
    check(
        trail_gen and trail_gen[0].get("disposition") == "unaccounted",
        f"Gen-/Mains trail must be unaccounted; got {trail_gen}",
    )

    # --- Per-alternative: combined surface label does NOT satisfy SmartRemote+EasyView ---
    sr_inv = {
        "procedures": [],
        "filtered": [],
        "alternatives": [
            {
                "title": "SmartRemote or EasyView 5",
                "kind": "enumerated_alternatives",
                "alternatives": ["SmartRemote", "EasyView 5"],
                "excerpt_ref": "excerpt[0]",
            }
        ],
    }
    sr_profile = {
        "operator_actions": [],
        "control_surfaces": [
            {"label_verbatim": "SmartRemote or EasyView 5", "surface": "remote_panel_accessory"}
        ],
        "requires_devices": [
            {"description_verbatim": "MasterView remote panel"}
        ],
    }
    sr_recon = reconcile_procedure_inventory(sr_inv, sr_profile)
    check(
        sr_recon.get("unaccounted_alternatives"),
        "SmartRemote/EasyView must NOT be satisfied by combined label or MasterView",
    )
    miss = (sr_recon.get("unaccounted_alternatives") or [{}])[0].get("missing_alternatives") or []
    check(
        "SmartRemote" in miss and "EasyView 5" in miss,
        f"both alternatives must be missing; got {miss}",
    )

    # Deterministic fill forbidden for enumerated_alternatives — flag stands.
    alt_only_profile = {
        "operator_actions": [],
        "control_surfaces": [],
        "requires_devices": [
            {
                "description_verbatim": "GX device",
                "needed_for": "data_roles.exposes_data_to_network",
            }
        ],
        "validation_flags": [],
    }
    alt_excerpts = [
        {
            "text": (
                "Use this function when connecting to a GX device or GlobalLink 520, "
                "or any other device that needs to communicate via VE.Direct.\n"
            ),
        }
    ]
    alt_inv = build_procedure_inventory(alt_excerpts)
    alt_recon = reconcile_procedure_inventory(alt_inv, alt_only_profile)

    def _empty_map(_scoped, _trailer):
        return {"operator_actions": [], "requires_devices": []}

    alt_repaired, alt_meta = apply_procedure_repair(
        deepcopy(alt_only_profile),
        unaccounted=list(alt_recon.get("unaccounted") or []),
        excerpts=alt_excerpts,
        map_fn=_empty_map,
        enabled=True,
    )
    alt_descs = " | ".join(
        str(r.get("description_verbatim") or "").lower()
        for r in (alt_repaired.get("requires_devices") or [])
    )
    check(
        "globallink" not in alt_descs,
        f"alternatives miss must NOT deterministic-fill requires; got {alt_descs}",
    )
    alt_recon2 = reconcile_procedure_inventory(alt_inv, alt_repaired)
    check(
        any(
            "globallink" in " ".join(
                str(x).lower()
                for x in (u.get("missing_alternatives") or [])
            )
            for u in (alt_recon2.get("unaccounted") or [])
        ),
        "GlobalLink alternative must remain unaccounted when LLM repair misses",
    )
    check(
        not any(
            f.get("flag") == DETERMINISTIC_FILL
            for f in (alt_repaired.get("validation_flags") or [])
            if isinstance(f, dict)
        ),
        "enumerated_alternatives must not emit deterministic_fill flag",
    )

    # Mode descriptions also skip deterministic fill.
    mode_item = {
        "title": "Gen-/Mains support",
        "kind": "headed_procedure",
        "excerpt_ref": "excerpt[0]",
        "adjudicated_id": "combi_gen_mains",
    }
    mode_prof = {"operator_actions": [], "requires_devices": [], "validation_flags": []}
    mode_ex = [
        {
            "text": "3.4.5 Gen-/Mains support\nWith Generator / mains support mode enabled.\n"
        }
    ]
    mode_repaired, _ = apply_procedure_repair(
        deepcopy(mode_prof),
        unaccounted=[mode_item],
        excerpts=mode_ex,
        map_fn=_empty_map,
        enabled=True,
    )
    check(
        not (mode_repaired.get("operator_actions") or []),
        "mode-description titles must not get deterministic fill",
    )

    # Options collapse: sunset to-tail variants → one action + options[].
    collapsed = collapse_option_value_actions(
        [
            {
                "action": "set the sunset action to keep the lights off",
                "audience": "operator",
                "context": "situational",
            },
            {
                "action": "set the sunset action to switch on for a fixed time",
                "audience": "operator",
                "context": "situational",
            },
            {
                "action": "set the sunset action to switch on till midnight",
                "audience": "operator",
                "context": "situational",
            },
            {
                "action": "set the sunset action to switch on till sunrise",
                "audience": "operator",
                "context": "situational",
            },
        ]
    )
    check(len(collapsed) == 1, f"sunset must collapse to 1 action; got {collapsed}")
    check(
        str(collapsed[0].get("action") or "").lower() == "set the sunset action",
        f"collapsed stem wrong: {collapsed[0].get('action')!r}",
    )
    opts = collapsed[0].get("options") or []
    check(len(opts) == 4, f"sunset must keep 4 options; got {opts}")

    # Truncated numbered heading at excerpt clip ("6.2 HOW TO SE"):
    # intra-excerpt join cannot see the continuation; complete from group corpus
    # (TOC / other excerpt), then bare-chapter / installer classify — not unaccounted.
    trunc_excerpts = [
        {
            "text": (
                "6 MASTERBUS\n"
                "6.1 About MasterBus\n"
                "6.2 How to set up a MasterBus network .......... 18\n"
                "6.3 Network wiring .......... 18\n"
            ),
        },
        {
            "text": (
                "Never connect a non-MasterBus device to the MasterBus network directly!\n"
                "6.2 HOW TO SE"
            ),
        },
    ]
    trunc_inv = build_procedure_inventory(
        trunc_excerpts,
        map_groups=[{"group_id": "chapter_6", "excerpts": trunc_excerpts}],
    )
    trunc_titles = {
        str(p.get("title") or "").lower()
        for p in trunc_inv.get("procedures") or []
    }
    trunc_filtered = {
        str(r.get("title") or "").lower(): r.get("filter")
        for r in trunc_inv.get("filtered") or []
    }
    check(
        "how to se" not in trunc_titles,
        f"truncated HOW TO SE must not remain as inventory title; got {trunc_titles}",
    )
    check(
        any("how to set up a masterbus network" in t for t in trunc_titles)
        or any(
            "how to set up a masterbus network" in t for t in trunc_filtered
        ),
        "corpus completion must recover full MasterBus how-to title",
    )
    # Residual truncations without a corpus match must be structurally filtered.
    orphan = inventory_procedures_from_excerpts(
        [{"text": "9.9 HOW TO SE"}],
        group_id="orphan",
    )
    orphan_kept, orphan_filt = orphan
    check(
        not any(
            (p.get("title") or "").upper().endswith("SE") for p in orphan_kept
        ),
        "orphan truncated heading must not stay in kept inventory",
    )
    check(
        any(r.get("filter") == "filter:truncated_heading" for r in orphan_filt),
        f"orphan truncation must use filter:truncated_heading; got {orphan_filt}",
    )

    # --- v4.24: other-variant scope (Zeus SR founding) ---
    from interaction_profile_procedures import (
        classify_other_variant_scope,
        _model_phrase_in,
    )

    check(
        _model_phrase_in("Zeus SRX", "Zeus SR") is False,
        "Zeus SR must not word-boundary-match Zeus SRX",
    )
    check(
        _model_phrase_in("B&G Zeus SR", "Zeus SR") is True,
        "Zeus SR must match inside B&G Zeus SR",
    )
    zeus_excerpt = (
        "VIDEO INPUT (TOUCH CONTROL)\n"
        "This functionality applies to NSO 4 and Zeus SRX only.\n"
        "Use the Video In port to connect an external video source.\n"
        "To enable touch control, navigate to the Video input app > Settings > "
        "Source settings and turn on the Touch control option.\n"
        "Note: Not all multi-function displays are supported.\n"
    )
    zeus_profile = {
        "device": {
            "manufacturer": "B&G",
            "model": "Zeus SR",
            "category_freeform": "display unit",
        },
        "control_surfaces": [
            {
                "surface": "touchscreen",
                "location_class": "on_device",
                "optional_accessory": False,
                "label_verbatim": "Touchscreen",
                "path": "control_surfaces[0]",
            }
        ],
        "operator_actions": [],
        "networks": {"speaks": [], "bridges": []},
        "data_roles": {
            "exposes_data_to_network": False,
            "displays_data_from_other_devices": False,
            "controllable_from_network": False,
        },
        "requires_devices": [],
        "safety_role": {
            "is_protective_device": False,
            "has_manual_override": False,
            "has_emergency_procedure": False,
        },
        "protected_by": [],
        "protects": [],
        "supply_requirements": [],
        "evidence": [],
        "confidence": {"overall": 0.5, "notes": ""},
    }
    v_cls, v_rule = classify_other_variant_scope(
        "To enable touch control, navigate to the Video input app",
        "turn on the Touch control option",
        zeus_profile,
        excerpt_text=zeus_excerpt,
    )
    check(
        v_cls == "not_applicable:other_variant",
        f"Zeus Video Input must classify other_variant; got {v_cls!r} {v_rule!r}",
    )
    check(
        v_rule == "rule:variant_scope:applies_to_only",
        f"expected applies_to_only rule; got {v_rule!r}",
    )
    # Sibling model that IS in scope must not classify.
    srx_profile = deepcopy(zeus_profile)
    srx_profile["device"] = {
        "manufacturer": "B&G",
        "model": "Zeus SRX",
        "category_freeform": "display unit",
    }
    srx_cls, _ = classify_other_variant_scope(
        "To enable touch control",
        "Touch control",
        srx_profile,
        excerpt_text=zeus_excerpt,
    )
    check(
        srx_cls is None,
        f"Zeus SRX must remain in-scope for Video Input; got {srx_cls!r}",
    )

    zeus_excerpts = [{"text": zeus_excerpt}]
    zeus_inv = build_procedure_inventory(zeus_excerpts)
    zeus_recon = reconcile_procedure_inventory(
        zeus_inv, zeus_profile, excerpts=zeus_excerpts
    )
    check(
        not any(
            f.get("flag") == PROCEDURE_UNACCOUNTED
            for f in (zeus_recon.get("validation_flags") or [])
        ),
        "Zeus SR Video Input must not emit procedure_unaccounted",
    )
    check(
        any(
            str(c.get("classification") or "") == "not_applicable:other_variant"
            or str(c.get("auto_classified") or "") == "not_applicable:other_variant"
            for c in (zeus_recon.get("classified") or [])
        )
        or any(
            str(t.get("auto_classified") or "") == "not_applicable:other_variant"
            for t in (zeus_recon.get("accounting_trail") or [])
        ),
        f"Zeus founding must land in classified other_variant; "
        f"classified={zeus_recon.get('classified')} "
        f"trail={zeus_recon.get('accounting_trail')}",
    )

    # Persist SmartSolar fixture inventory from synthetic excerpts (pinned titles).
    fixture_path = FIXTURES / "smartsolar_procedure_inventory.json"
    fixture_path.write_text(
        json.dumps(
            {
                "device": "victron_mppt",
                "required_procedure_substrings": [
                    "firmware",
                    "bluetooth",
                    "sunset",
                ],
                "required_alternative_substrings": ["globallink"],
                "inventory": inventory,
                "note": (
                    "Synthetic routed-excerpt inventory pin for v4.2. "
                    "Live last_green inventories are regenerated by "
                    "scripts/run_procedure_inventory.py."
                ),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    pinned = json.loads(fixture_path.read_text(encoding="utf-8"))
    pin_titles = {
        str(p.get("title") or "").lower()
        for p in (pinned.get("inventory") or {}).get("procedures") or []
    }
    for needle in pinned["required_procedure_substrings"]:
        check(
            any(needle in t for t in pin_titles),
            f"fixture pin missing {needle!r}",
        )

    if failures:
        print("FAIL - procedure inventory checks:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("OK - procedure inventory (2a/2b flags) + gated repair fixture checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
