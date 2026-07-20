"""Unit checks for Stage 1 reduce merge semantics.

Usage (from backend/):
  python scripts/verify_interaction_profile_merge.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_merge import (
    merge_group_profiles,
    prioritize_evidence,
    _action_same,
    _requires_same,
    _surfaces_same_identity,
    fuzzy_text_similar,
)
from interaction_profile_validate import (
    validate_interaction_profile,
    validation_flag_names,
)


def _prof(**kwargs):
    base = {
        "device": {
            "manufacturer": "Mastervolt",
            "model": "Mass Combi Pro",
            "category_freeform": "",
        },
        "control_surfaces": [],
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
    base.update(kwargs)
    return base


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    intro = {
        "group_id": "chapter_1",
        "is_introduction": True,
        "excerpts": [{"text": "intro"}],
        "predicted_fields": ["device"],
        "profile": _prof(
            device={
                "manufacturer": "Mastervolt",
                "model": "Mass Combi Pro",
                "category_freeform": "inverter/charger",
            },
            confidence={"overall": 0.4, "notes": "from intro"},
        ),
    }
    ops = {
        "group_id": "chapter_4",
        "is_introduction": False,
        "excerpts": [{"text": "ops", "query": "operation daily"}],
        "predicted_fields": ["operator_actions", "control_surfaces"],
        "profile": _prof(
            device={
                "manufacturer": "Mastervolt",
                "model": "Mass Combi Pro",
                "category_freeform": "IGNORE ME",
            },
            control_surfaces=[
                {
                    "surface": "physical_controls",
                    "location_class": "on_device",
                    "optional_accessory": False,
                    "label_verbatim": "Main switch",
                    "path": "control_surfaces[0]",
                }
            ],
            operator_actions=[
                {
                    "action": "switch inverter on",
                    "audience": "operator",
                    "context": "daily",
                },
                {
                    "action": "switch the inverter on",
                    "audience": "operator",
                    "context": "daily",
                },
            ],
            data_roles={
                "exposes_data_to_network": False,
                "displays_data_from_other_devices": False,
                "controllable_from_network": False,
            },
            confidence={"overall": 0.8, "notes": "from ops"},
        ),
    }
    net = {
        "group_id": "chapter_5",
        "is_introduction": False,
        "excerpts": [{"text": "net", "query": "network MasterBus"}],
        "predicted_fields": ["networks", "data_roles"],
        "profile": _prof(
            networks={
                "speaks": [
                    {"name_verbatim": "MasterBus", "physical_or_wireless": "wired"}
                ],
                "bridges": [],
            },
            data_roles={
                "exposes_data_to_network": True,
                "displays_data_from_other_devices": False,
                "controllable_from_network": True,
            },
            control_surfaces=[
                {
                    "surface": "physical_controls",
                    "location_class": "on_device",
                    "optional_accessory": True,  # conflict with ops
                    "label_verbatim": "Main switch",
                    "path": "control_surfaces[0]",
                }
            ],
            confidence={"overall": 0.6, "notes": "from net"},
        ),
    }
    hollow = {
        "group_id": "chapter_8",
        "is_introduction": False,
        "excerpts": [{"text": "specs only", "query": "technical data"}],
        "predicted_fields": ["operator_actions", "evidence"],
        "profile": _prof(),
    }

    reduced = merge_group_profiles([intro, ops, net, hollow])
    profile = reduced["profile"]

    check(
        profile["device"]["category_freeform"] == "inverter/charger",
        "category must come from introduction group only",
    )
    actions = profile.get("operator_actions") or []
    check(len(actions) == 1, f"fuzzy dedupe should collapse on/off variants; got {actions}")
    check(
        profile["data_roles"]["exposes_data_to_network"] is True
        and profile["data_roles"]["controllable_from_network"] is True,
        "boolean OR failed for data_roles",
    )
    check(float(profile["confidence"]["overall"]) == 0.8, "confidence should be max")
    check(
        "[chapter_4]" in profile["confidence"]["notes"]
        and "[chapter_5]" in profile["confidence"]["notes"],
        "confidence notes should be tagged by group",
    )
    check(reduced["conflicts"], "expected merge conflict on optional_accessory")
    util = {u["group_id"]: u for u in reduced["utilization"]}
    check(util["chapter_8"]["unutilized"] is True, "hollow group must be unutilized")
    check(util["chapter_4"]["unutilized"] is False, "ops group must contribute")

    profile["merge_conflicts"] = reduced["conflicts"]
    profile["group_utilization"] = reduced["utilization"]
    ann = validate_interaction_profile(profile, excerpts=[])
    names = validation_flag_names(ann)
    check("merge_conflict" in names, "validator must flag merge_conflict")
    check("group_unutilized" in names, "validator must flag group_unutilized")

    # Evidence cap prefers requires_devices / data_roles over action clutter.
    clutter = [
        {
            "supports_field": f"operator_actions[{i}]",
            "manual_section": "x",
            "note": f"action note {i}",
        }
        for i in range(8)
    ] + [
        {
            "supports_field": "requires_devices[0]",
            "manual_section": "3.6",
            "note": "GX device required for network",
        },
        {
            "supports_field": "data_roles.exposes_data_to_network",
            "manual_section": "3.6",
            "note": "Shares data via GX",
        },
    ]
    kept = prioritize_evidence(clutter, max_evidence=8)
    kept_fields = {e["supports_field"] for e in kept}
    check(
        "requires_devices[0]" in kept_fields
        and "data_roles.exposes_data_to_network" in kept_fields,
        "prioritize_evidence must keep requires/data_roles under cap",
    )
    check(len(kept) == 8, f"evidence cap should remain 8; got {len(kept)}")

    # v4.0: post-merge OR-split + exact-key dedupe for requires_devices.
    or_group = {
        "group_id": "chapter_3",
        "is_introduction": False,
        "excerpts": [{"text": "gx"}],
        "predicted_fields": ["requires_devices"],
        "profile": _prof(
            requires_devices=[
                {
                    "description_verbatim": "GX device or GlobalLink 520",
                    "needed_for": "data_roles.exposes_data_to_network",
                },
                {
                    "description_verbatim": "GX device or GlobalLink 520",
                    "needed_for": "data_roles.exposes_data_to_network",
                },
            ]
        ),
    }
    or_merged = merge_group_profiles([intro, or_group])["profile"]
    or_reqs = or_merged.get("requires_devices") or []
    or_descs = sorted(
        str(r.get("description_verbatim") or "") for r in or_reqs if isinstance(r, dict)
    )
    check(
        or_descs == ["GX device", "GlobalLink 520"],
        f"post-merge must OR-split + dedupe GX/GlobalLink; got {or_descs}",
    )
    check(
        all(
            str(r.get("needed_for") or "") == "data_roles.exposes_data_to_network"
            for r in or_reqs
            if isinstance(r, dict)
        ),
        "OR alts must share needed_for",
    )
    check(
        all(
            str(r.get("requirement_kind") or "") == "device"
            for r in or_reqs
            if isinstance(r, dict)
        ),
        "GX/GlobalLink kinds must be device",
    )

    # Exact-key uniqueness: (norm desc, needed_for, kind) — SmartSolar fixture.
    from collections import Counter

    from interaction_profile import normalize_profile
    from interaction_profile_kinds import normalize_requirement_description

    # Two map groups, same OR phrase, same needed_for → still one alt each.
    dup_groups = [
        {
            "group_id": "chapter_a",
            "is_introduction": True,
            "excerpts": [{"text": "a"}],
            "predicted_fields": ["requires_devices"],
            "profile": _prof(
                requires_devices=[
                    {
                        "description_verbatim": "GX device or GlobalLink 520",
                        "needed_for": "data_roles.exposes_data_to_network",
                    }
                ]
            ),
        },
        {
            "group_id": "chapter_b",
            "is_introduction": False,
            "excerpts": [{"text": "b"}],
            "predicted_fields": ["requires_devices"],
            "profile": _prof(
                requires_devices=[
                    {
                        "description_verbatim": "GX device or GlobalLink 520",
                        "needed_for": "data_roles.exposes_data_to_network",
                    }
                ]
            ),
        },
    ]
    dup_merged = merge_group_profiles(dup_groups)["profile"]
    dup_reqs = dup_merged.get("requires_devices") or []
    check(
        len(dup_reqs) == 2,
        f"two map groups same OR phrase must yield exactly 2 alts; got {dup_reqs}",
    )
    key_counts = Counter(
        (
            normalize_requirement_description(str(r.get("description_verbatim") or "")),
            str(r.get("needed_for") or "").lower(),
            str(r.get("requirement_kind") or ""),
        )
        for r in dup_reqs
        if isinstance(r, dict)
    )
    check(
        all(n == 1 for n in key_counts.values()),
        f"exact-key duplicates survive reduce: {dict(key_counts)}",
    )

    # SmartSolar golden: normalize → exactly one entry per OR alternative
    # on data_roles.exposes_data_to_network.
    golden = json.loads(
        (
            Path(__file__).resolve().parent.parent
            / "tests"
            / "fixtures"
            / "smartsolar_corrected_extraction.json"
        ).read_text(encoding="utf-8")
    )
    voted = normalize_profile(golden)
    alts = [
        r
        for r in (voted.get("requires_devices") or [])
        if isinstance(r, dict)
        and str(r.get("needed_for") or "") == "data_roles.exposes_data_to_network"
        and str(r.get("requirement_kind") or "") == "device"
    ]
    alt_descs = Counter(
        normalize_requirement_description(str(r.get("description_verbatim") or ""))
        for r in alts
    )
    check(
        alt_descs.get("gx device") == 1 and alt_descs.get("globallink 520") == 1,
        f"SmartSolar must have exactly one entry per GX/GlobalLink alt; got {dict(alt_descs)}",
    )
    check(len(alts) == 2, f"SmartSolar data_roles OR set size must be 2; got {alts}")

    # Dedupe identity: requires exact-key post-split; surfaces/actions remain fuzzy.
    check(
        _requires_same(
            {
                "description_verbatim": "GX device",
                "needed_for": "data_roles.exposes_data_to_network",
            },
            {
                "description_verbatim": "GX device",
                "needed_for": "networks.speaks[0]",
            },
        )
        is False,
        "requires_devices merge identity includes needed_for (not desc-only)",
    )
    check(
        fuzzy_text_similar("monitor via app", "monitor via the app"),
        "operator_actions still use fuzzy text similarity",
    )
    check(
        callable(_action_same) and callable(_surfaces_same_identity),
        "action/surface same_fn remain fuzzy-identity helpers",
    )

    check(
        _action_same(
            {"action": "close quick access menu"},
            {"action": "open quick access menu"},
        )
        is False,
        "antonym open/close must not collapse",
    )
    check(
        _action_same(
            {"action": "clean the display"},
            {"action": "clean the screen"},
        )
        is True,
        "synonym display/screen must collapse",
    )
    check(
        fuzzy_text_similar("turn unit on", "turn unit off") is False,
        "antonym on/off must not fuzzy-match",
    )

    # --- v4.27: per-group index→action rewrite before merge (Zeus founding) ---
    zeus_intro = {
        "group_id": "batch_0",
        "is_introduction": True,
        "excerpts": [{"text": "intro"}],
        "predicted_fields": ["operator_actions", "evidence"],
        "profile": _prof(
            device={
                "manufacturer": "B&G",
                "model": "Zeus SR",
                "category_freeform": "display",
            },
            operator_actions=[
                {
                    "action": "turn off the device",
                    "audience": "operator",
                    "context": "situational",
                },
                {
                    "action": "set all radars to standby",
                    "audience": "operator",
                    "context": "situational",
                },
            ],
            evidence=[
                {
                    "supports_field": "operator_actions",
                    "manual_section": "Quick access menu",
                    "note": "Actions for accessing and closing the quick access menu",
                }
            ],
        ),
    }
    zeus_batch1 = {
        "group_id": "batch_1",
        "is_introduction": False,
        "excerpts": [{"text": "startup alerts"}],
        "predicted_fields": ["operator_actions", "evidence"],
        "profile": {
            "device": {
                "manufacturer": "B&G",
                "model": "Zeus SR",
                "category_freeform": "display",
            },
            "control_surfaces": [],
            "operator_actions": [
                {
                    "action": (
                        "complete initial setup for Language, Country selection, "
                        "Time zone, and Boat network"
                    ),
                    "audience": "operator",
                    "context": "commissioning",
                },
                {
                    "action": "view alert messages",
                    "audience": "operator",
                    "context": "daily",
                },
                {
                    "action": "manage alert rules",
                    "audience": "operator",
                    "context": "situational",
                },
            ],
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
            "evidence": [
                {
                    "supports_field": "operator_actions[0]",
                    "manual_section": "FIRST STARTUP",
                    "note": "Initial setup steps for first use",
                },
                {
                    "supports_field": "operator_actions[1]",
                    "manual_section": "ALERTS",
                    "note": "Viewing alert messages on the display",
                },
                {
                    "supports_field": "operator_actions[2]",
                    "manual_section": "Manage alert rules",
                    "note": "Editing and creating alert rules",
                },
            ],
            "confidence": {"overall": 0.8, "notes": ""},
        },
    }
    # Without per-group rewrite, post-merge index resolve would bind [0] to
    # "turn off the device". With rewrite, setup note stays on setup action.
    zeus_merged = merge_group_profiles([zeus_intro, zeus_batch1])["profile"]
    by_note = {
        str(e.get("note") or ""): str(e.get("supports_field") or "")
        for e in (zeus_merged.get("evidence") or [])
        if isinstance(e, dict)
    }
    check(
        "complete initial setup" in by_note.get("Initial setup steps for first use", ""),
        "Zeus founding: FIRST STARTUP evidence must stay on initial-setup action; "
        f"got {by_note.get('Initial setup steps for first use')!r}",
    )
    check(
        "view alert messages" in by_note.get("Viewing alert messages on the display", ""),
        "Zeus founding: ALERTS evidence must stay on view-alert action; "
        f"got {by_note.get('Viewing alert messages on the display')!r}",
    )
    check(
        "turn off the device"
        not in by_note.get("Initial setup steps for first use", ""),
        "Zeus founding: setup evidence must not retarget to turn-off",
    )

    if failures:
        print("FAIL")
        for item in failures:
            print(f"  - {item}")
        return 1
    print("OK - Stage 1 reduce merge checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
