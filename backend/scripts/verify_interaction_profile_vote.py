"""Unit checks for Stage 1 stability voting (union-with-provenance) + partition.

Fixtures (v4.1):
  (a) grounded action in 1/3 runs survives with vote_margin 1/3
  (b) ungrounded 1-run item is blocked
  (c) attribute conflict (context / needed_for) majority-resolves

Also: needed_for speaks→data_roles normalize collapses GX path disagreement.

Usage (from backend/):
  python scripts/verify_interaction_profile_vote.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_kinds import finalize_profile_requires
from interaction_profile_partition import (
    inventory_top_chapters,
    partition_excerpts,
)
from interaction_profile_vote import (
    profiles_identical_post_merge,
    vote_merged_profiles,
)


def _prof(**kwargs):
    base = {
        "device": {
            "manufacturer": "Mastervolt",
            "model": "Mass Combi Pro",
            "category_freeform": "inverter/charger",
        },
        "control_surfaces": [],
        "operator_actions": [],
        "networks": {"speaks": [], "bridges": []},
        "data_roles": {
            "exposes_data_to_network": True,
            "displays_data_from_other_devices": False,
            "controllable_from_network": True,
        },
        "requires_devices": [],
        "safety_role": {
            "is_protective_device": False,
            "has_manual_override": False,
            "has_emergency_procedure": True,
        },
        "protected_by": [],
        "protects": [],
        "supply_requirements": [],
        "evidence": [],
        "confidence": {"overall": 0.5, "notes": ""},
    }
    base.update(kwargs)
    return base


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    # --- (a) grounded 1/3 presence → keep with margin 1/3 ---
    grounded_excerpts = [
        {
            "text": (
                "The Power Sharing level can be adjusted by means of the "
                "DIP-switches locally on the Mass Combi Ultra."
            )
        }
    ]
    a1 = _prof(
        operator_actions=[
            {
                "action": "set Power Sharing level",
                "audience": "operator",
                "context": "situational",
            }
        ]
    )
    a_empty = _prof(operator_actions=[])
    voted_a, votes_a, flags_a = vote_merged_profiles(
        [a1, a_empty, a_empty], excerpts=grounded_excerpts
    )
    actions_a = voted_a.get("operator_actions") or []
    check(len(actions_a) == 1, "(a) grounded 1/3 action must survive union")
    check(
        (actions_a[0] or {}).get("vote_margin") == "1/3",
        f"(a) expected vote_margin 1/3, got {(actions_a[0] or {}).get('vote_margin')}",
    )
    check(
        not any(f.get("flag") == "extraction_unstable" for f in flags_a),
        "(a) presence-only union must NOT flag extraction_unstable",
    )
    check(
        any(
            v.get("attribute") == "presence" and v.get("vote_margin") == "1/3"
            for v in votes_a
        ),
        "(a) presence vote with margin 1/3 must be recorded",
    )

    # --- (b) ungrounded 1-run item blocked ---
    ungrounded = _prof(
        operator_actions=[
            {
                "action": "calibrate the flux capacitor",
                "audience": "technician",
                "context": "setup",
            }
        ]
    )
    voted_b, votes_b, _flags_b = vote_merged_profiles(
        [ungrounded, a_empty, a_empty],
        excerpts=grounded_excerpts,
    )
    check(
        not (voted_b.get("operator_actions") or []),
        "(b) ungrounded 1-run action must be blocked",
    )
    check(
        any(v.get("blocked") == "ungrounded" for v in votes_b),
        "(b) must record blocked=ungrounded vote",
    )

    # --- (c) attribute conflict majority-resolves; 1/1/1 flags unstable ---
    c_setup = _prof(
        operator_actions=[
            {
                "action": "set Power Sharing level",
                "audience": "operator",
                "context": "setup",
            }
        ]
    )
    c_sit = _prof(
        operator_actions=[
            {
                "action": "set Power Sharing level",
                "audience": "operator",
                "context": "situational",
            }
        ]
    )
    c_maint = _prof(
        operator_actions=[
            {
                "action": "set Power Sharing level",
                "audience": "operator",
                "context": "maintenance",
            }
        ]
    )
    # Clear majority 2/3 — no unstable flag required.
    voted_c_maj, _votes_c_maj, flags_c_maj = vote_merged_profiles(
        [c_setup, c_sit, c_sit], excerpts=grounded_excerpts
    )
    actions_c = voted_c_maj.get("operator_actions") or []
    check(len(actions_c) == 1, "(c) majority conflict must yield one action")
    check(
        (actions_c[0] or {}).get("context") == "situational",
        "(c) majority context=situational must win",
    )
    check(
        not any(f.get("flag") == "extraction_unstable" for f in flags_c_maj),
        "(c) clear 2/3 majority must not flag extraction_unstable",
    )
    # 1/1/1 split — majority tie-break + unstable flag.
    voted_c, votes_c, flags_c = vote_merged_profiles(
        [c_setup, c_sit, c_maint], excerpts=grounded_excerpts
    )
    check(
        any(v.get("attribute") == "context" for v in votes_c),
        "(c) 1/1/1 context disagreement must be recorded in extraction_votes",
    )
    check(
        any(f.get("flag") == "extraction_unstable" for f in flags_c),
        "(c) 1/1/1 attribute split must flag extraction_unstable",
    )

    # needed_for majority on same description + speaks→data_roles normalize
    gx_speaks = _prof(
        requires_devices=[
            {
                "description_verbatim": "GX device",
                "needed_for": "networks.speaks[0]",
                "requirement_kind": "device",
            }
        ],
        networks={
            "speaks": [{"name_verbatim": "VE.Direct", "physical_or_wireless": "physical"}],
            "bridges": [],
        },
    )
    gx_role = _prof(
        requires_devices=[
            {
                "description_verbatim": "GX device",
                "needed_for": "data_roles.exposes_data_to_network",
                "requirement_kind": "device",
            }
        ],
        networks={
            "speaks": [{"name_verbatim": "VE.Direct", "physical_or_wireless": "physical"}],
            "bridges": [],
        },
    )
    speak_excerpts = [{"text": "Connect the VE.Direct cable to a GX device."}]
    voted_gx, votes_gx, flags_gx = vote_merged_profiles(
        [gx_speaks, gx_role, gx_role], excerpts=speak_excerpts
    )
    reqs_pre = voted_gx.get("requires_devices") or []
    check(len(reqs_pre) == 1, "GX description identity must cluster to one require")
    check(
        (reqs_pre[0] or {}).get("needed_for") == "data_roles.exposes_data_to_network",
        "needed_for majority must prefer data_roles path",
    )
    # Also cover speaks-only runs → normalize rewrite + no duplicate after OR/dedupe
    voted_speaks_only, _, _ = vote_merged_profiles(
        [gx_speaks, gx_speaks, gx_speaks], excerpts=speak_excerpts
    )
    nf_flags = finalize_profile_requires(voted_speaks_only)
    reqs_norm = voted_speaks_only.get("requires_devices") or []
    check(
        len(reqs_norm) == 1
        and (reqs_norm[0] or {}).get("needed_for")
        == "data_roles.exposes_data_to_network",
        "normalize must rewrite speaks needed_for → data_roles.exposes_data_to_network",
    )
    check(not nf_flags, "mappable speaks→role must not emit needed_for_unmappable")

    # Dual-path collapse (speaks + role already both present pre-normalize)
    dual = _prof(
        requires_devices=[
            {
                "description_verbatim": "GX device",
                "needed_for": "networks.speaks[0]",
                "requirement_kind": "device",
            },
            {
                "description_verbatim": "GX device",
                "needed_for": "data_roles.exposes_data_to_network",
                "requirement_kind": "device",
            },
            {
                "description_verbatim": "GlobalLink 520",
                "needed_for": "data_roles.exposes_data_to_network",
                "requirement_kind": "device",
            },
        ]
    )
    finalize_profile_requires(dual)
    descs = {
        (
            str(r.get("description_verbatim") or ""),
            str(r.get("needed_for") or ""),
        )
        for r in (dual.get("requires_devices") or [])
    }
    check(
        (
            "GX device",
            "data_roles.exposes_data_to_network",
        )
        in descs
        and ("GX device", "networks.speaks[0]") not in descs,
        "dual GX paths must collapse to single data_roles entry",
    )
    check(
        ("GlobalLink 520", "data_roles.exposes_data_to_network") in descs,
        "GlobalLink alternative must remain",
    )

    identical_vote, _, identical_flags = vote_merged_profiles(
        [a1, a1], excerpts=grounded_excerpts
    )
    check(
        profiles_identical_post_merge(
            {**identical_vote, "operator_actions": [
                {k: v for k, v in a.items() if k != "vote_margin"}
                for a in (identical_vote.get("operator_actions") or [])
            ]},
            a1,
        )
        or any(
            "power sharing" in str(x.get("action") or "").lower()
            for x in (identical_vote.get("operator_actions") or [])
        ),
        "identical grounded runs keep the action",
    )
    check(not identical_flags, "identical runs must not flag unstable")

    # Combi flap: Power Sharing adjust text joins chapter 3 via section topic.
    headings = [
        "1 GENERAL INFORMATION",
        "3 HOW IT WORKS",
        "3.4.4 Power sharing mode",
        "4 OPERATION",
        "5 INSTALLATION",
        "6 CONFIGURATION",
    ]
    top = inventory_top_chapters(headings)
    check("3" in top, "chapter 3 must be inventoried")
    excerpts = [
        {
            "text": (
                "This means that the charge current of the Mass Combi will be "
                "reduced to 0 A. The Power Sharing level can be adjusted by "
                "means of the DIP-switches locally on the Mass Combi Ultra."
            ),
            "query": "MasterView remote panel",
            "source_heading_guess": "This means that the",
        },
        {
            "text": "3.4.4 Power sharing mode See figure 3-7. If the available "
            "power at the AC-input is limited...",
            "query": "shore power AC input current limit",
        },
    ]
    groups = partition_excerpts(excerpts, inventory_headings=headings)
    by_id = {g["group_id"]: g for g in groups}
    check("chapter_3" in by_id, "chapter_3 group must exist")
    ch3_texts = " ".join(
        str(e.get("text") or "") for e in (by_id["chapter_3"].get("excerpts") or [])
    )
    check(
        "Power Sharing level can be adjusted" in ch3_texts,
        "Power Sharing adjust excerpt must join chapter_3 (not leftover batch)",
    )

    # MLI-style dotted TOC titles.
    mli_heads = [
        "1. SAFETY INSTRUCTIONS",
        "6. PRODUCT DESCRIPTION",
        "7. INSTALLATION",
        "8. COMMISSIONING",
        "13. MASTERBUS",
        "17. TROUBLESHOOTING",
        "18. TECHNICAL DATA",
    ]
    mli_top = inventory_top_chapters(mli_heads)
    check(
        {"1", "6", "7", "8", "13", "17", "18"} <= set(mli_top),
        f"MLI dotted TOC must inventory chapters, got {sorted(mli_top)}",
    )

    mli_excerpts = [
        {"text": "7. INSTALLATION Integrate a fuse holder in the positive battery wire."},
        {"text": "8. COMMISSIONING Set the safety relay to REMOTE OFF."},
        {"text": "13. MASTERBUS Connect the MasterBus cable."},
        {"text": "17. TROUBLESHOOTING If the safety relay has been triggered."},
        {"text": "18. TECHNICAL DATA T-Fuse of max. 500A."},
        {"text": "6. PRODUCT DESCRIPTION LITHIUM-ION BATTERY with built-in BMS."},
        {"text": "9. MAINTENANCE Charge the battery fully."},
        {"text": "10. DECOMMISSIONING Disconnect all wiring."},
        {"text": "1. SAFETY INSTRUCTIONS IMPORTANT SAFETY INSTRUCTIONS."},
        {"text": "Unrelated leftover without chapter title tokens."},
    ]
    mli_groups = partition_excerpts(
        mli_excerpts,
        inventory_headings=mli_heads
        + [
            "9. MAINTENANCE",
            "10. DECOMMISSIONING",
            "2. LIABILITY",
            "3. WARRANTY",
            "4. CYCLE LIFE AND C-RATE",
            "11. REPLACEMENTS",
            "12. STORAGE",
            "14. MASTERBUS ON THE MLI ULTRA",
            "15. CZONE",
        ],
    )
    partitions = {g["group_id"]: g.get("partition") for g in mli_groups}
    check(
        any(p in {"chapter", "chapter_merge"} for p in partitions.values()),
        f"MLI must keep chapter/chapter_merge groups, got {partitions}",
    )
    check(
        not all(
            str(gid).startswith("batch_") for gid in partitions if gid != "chapter_1"
        ),
        "MLI must not collapse all non-intro groups into leftover batches",
    )

    if failures:
        print("FAIL - stability vote / partition checks:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("OK - Stage 1 union voting + needed_for normalize + partition checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
