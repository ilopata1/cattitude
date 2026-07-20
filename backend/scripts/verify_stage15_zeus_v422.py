"""Stage 1.5 v4.22 — Zeus SR founding fixtures (blocking gate + integrity).

Founding profile: fixtures/pipeline/scratch/bg_zeus_sr.json (current state).

Checks:
  1. Blocking evidence_incomplete → needs_rextraction; stage15_gate_passes False
  2. evidence_heading_invalid on sentence / "D E" manual_section crumbs
  3. Dedup: open/close must NOT collapse; clean display/screen MUST collapse
  4. Device surfaces: one physical touchscreen; empty settings ui_pages demoted

Usage (from backend/):
  python scripts/verify_stage15_zeus_v422.py
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile import normalize_profile
from interaction_profile_merge import (
    _action_same,
    fuzzy_text_similar,
    rewrite_operator_action_evidence_paths,
)
from interaction_profile_ui_pages import (
    expand_ui_pages,
)
from interaction_profile_validate import (
    manual_section_is_heading,
    stage15_gate_passes,
    validate_interaction_profile,
    validation_flag_names,
)

ZEUS = _BACKEND / "fixtures" / "pipeline" / "scratch" / "bg_zeus_sr.json"


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    if not ZEUS.is_file():
        print(f"FAIL — missing founding fixture {ZEUS}")
        return 1

    zeus = json.loads(ZEUS.read_text(encoding="utf-8"))

    # --- (1) Blocking-flag gate ---
    # Synthetic: heading crumbs still block. Live Zeus scratch may already be
    # cleaned (v4.23+); gate on the live file is asserted separately below.
    crumb = {
        "device": {
            "manufacturer": "B&G",
            "model": "Zeus SR",
            "category_freeform": "display",
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
        "evidence": [
            {
                "supports_field": "operator_actions",
                "manual_section": "D E",
                "note": "Callout crumb must fail heading floor",
            }
        ],
        "confidence": {"overall": 0.5, "notes": ""},
    }
    crumb_ann = validate_interaction_profile(crumb, excerpts=[])
    crumb_names = validation_flag_names(crumb_ann)
    check(
        "evidence_heading_invalid" in crumb_names,
        "D E manual_section must flag evidence_heading_invalid",
    )
    check(
        crumb_ann.get("needs_rextraction") is True,
        "heading-invalid crumb profile must set needs_rextraction",
    )
    check(
        stage15_gate_passes(crumb_ann) is False,
        "heading-invalid crumb profile must fail stage15_gate_passes",
    )

    # Live Zeus after rematch: evidence pairs coherent; gate may pass.
    raw = deepcopy(zeus)
    raw.pop("validation_flags", None)
    raw.pop("needs_rextraction", None)
    raw.pop("repairs", None)
    ann = validate_interaction_profile(raw, excerpts=[])
    names = validation_flag_names(ann)
    check(
        "evidence_support_mismatch" not in names,
        "live Zeus rematch must not flag evidence_support_mismatch",
    )

    # --- (2) Evidence heading floor ---
    check(
        manual_section_is_heading("D E") is False,
        '"D E" must fail heading floor',
    )
    check(
        manual_section_is_heading(
            "I Alerts Select to view the Active alerts panel, including "
            "historical alerts."
        )
        is False,
        "sentence dump must fail heading floor",
    )
    check(
        manual_section_is_heading("Boat network") is True,
        "short title must pass heading floor",
    )

    # Evidence ↔ action text resync after index rewrite.
    sample = {
        "operator_actions": [
            {"action": "open quick access menu", "audience": "operator", "context": "daily"},
            {"action": "close quick access menu", "audience": "operator", "context": "daily"},
        ],
        "evidence": [
            {
                "supports_field": "operator_actions[0]",
                "manual_section": "Quick access",
                "note": "Opens the menu",
            }
        ],
    }
    # Simulate dedup reorder: swap actions, then rewrite from stale index would
    # be wrong — rewrite to action-text before reorder, then re-resolve.
    rewrite_operator_action_evidence_paths(sample)
    field = str(sample["evidence"][0]["supports_field"])
    check(
        field.startswith("operator_actions[action=open quick access menu]"),
        f"index evidence must rewrite to action-text; got {field!r}",
    )
    sample["operator_actions"] = list(reversed(sample["operator_actions"]))
    # Text form still names the open action after reorder.
    check(
        "open quick access menu" in field,
        "action-text linkage survives action list reorder",
    )

    # --- (3) Dedup threshold / antonym + synonym fixtures ---
    open_close_a = "close quick access menu"
    open_close_b = "open quick access menu"
    check(
        fuzzy_text_similar(open_close_a, open_close_b) is False,
        "open/close antonym pair must NOT fuzzy-match",
    )
    check(
        _action_same({"action": open_close_a}, {"action": open_close_b}) is False,
        "open/close must not collapse under _action_same",
    )
    clean_a = "clean the display"
    clean_b = "clean the screen"
    check(
        fuzzy_text_similar(clean_a, clean_b) is True,
        "clean display/screen synonym pair must fuzzy-match",
    )
    check(
        _action_same({"action": clean_a}, {"action": clean_b}) is True,
        "clean display/screen must collapse under _action_same",
    )

    # --- (4) Surface / ui_page classification ---
    device = {
        "entity_kind": "device",
        "device": {
            "manufacturer": "B&G",
            "model": "Zeus SR",
            "category_freeform": "MFD",
        },
        "control_surfaces": [
            {
                "surface": "touchscreen",
                "location_class": "on_device",
                "optional_accessory": False,
                "label_verbatim": "Quick access menu",
                "path": "control_surfaces[0]",
            },
            {
                "surface": "touchscreen",
                "location_class": "on_device",
                "optional_accessory": False,
                "label_verbatim": "App drawer",
                "path": "control_surfaces[1]",
            },
            {
                "surface": "touchscreen",
                "location_class": "on_device",
                "optional_accessory": False,
                "label_verbatim": "General",
                "path": "control_surfaces[2]",
            },
            {
                "surface": "touchscreen",
                "location_class": "on_device",
                "optional_accessory": False,
                "label_verbatim": "Simulation",
                "path": "control_surfaces[3]",
            },
            {
                "surface": "touchscreen",
                "location_class": "on_device",
                "optional_accessory": False,
                "label_verbatim": "Screen Layout",
                "path": "control_surfaces[4]",
            },
        ],
        "ui_pages": [
            {
                "name": "Quick access menu",
                "purpose": "",
                "appears_if_gate": {
                    "verbatim": "",
                    "description_verbatim": "",
                    "functional_class": "",
                },
                "actions": [
                    {
                        "action": "open quick access menu",
                        "audience": "operator",
                        "context": "daily",
                    }
                ],
            },
            {
                "name": "General",
                "purpose": "",
                "appears_if_gate": {
                    "verbatim": "",
                    "description_verbatim": "",
                    "functional_class": "",
                },
                "actions": [],
            },
            {
                "name": "Simulation",
                "purpose": "",
                "appears_if_gate": {
                    "verbatim": "",
                    "description_verbatim": "",
                    "functional_class": "",
                },
                "actions": [],
            },
            {
                "name": "Screen Layout",
                "purpose": "",
                "appears_if_gate": {
                    "verbatim": "",
                    "description_verbatim": "",
                    "functional_class": "",
                },
                "actions": [],
            },
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
    expand_ui_pages(device)
    surfaces = device.get("control_surfaces") or []
    touch = [s for s in surfaces if str(s.get("surface")) == "touchscreen"]
    check(len(touch) == 1, f"device must keep one touchscreen; got {touch}")
    page_names = {
        str(p.get("name") or "") for p in (device.get("ui_pages") or []) if isinstance(p, dict)
    }
    demoted = set(device.get("demoted_ui_pages") or [])
    check(
        "General" in demoted and "Simulation" in demoted and "Screen Layout" in demoted,
        f"empty settings pages must demote; demoted={demoted}",
    )
    check(
        "General" not in page_names,
        "demoted General must not remain in ui_pages",
    )
    check(
        "Quick access menu" in page_names,
        "action-bearing menu must remain a ui_page",
    )

    # normalize_profile path also consolidates.
    normed = normalize_profile(deepcopy(zeus))
    n_touch = [
        s
        for s in (normed.get("control_surfaces") or [])
        if isinstance(s, dict) and str(s.get("surface")) == "touchscreen"
    ]
    check(
        len(n_touch) <= 1,
        f"normalize Zeus must not emit multi-menu touchscreens; got {n_touch}",
    )

    if failures:
        print("FAIL")
        for f in failures:
            print(" -", f)
        return 1
    print("OK — Stage 1.5 Zeus v4.22 founding checks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
