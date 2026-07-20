"""v4.29 — direction_mismatch, occasion_circular, vote-margin retention.

Usage (from backend/):
  python scripts/verify_stage15_zeus_v429.py
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile import normalize_profile
from interaction_profile_validate import (
    evidence_note_is_hub_commanding,
    occasion_is_circular,
    validate_interaction_profile,
    validation_flag_names,
)

ZEUS = _BACKEND / "fixtures" / "pipeline" / "scratch" / "bg_zeus_sr.json"


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    # --- direction_mismatch founding ---
    check(
        evidence_note_is_hub_commanding(
            "CZone app controls devices via the network.",
            "CZone Digital switching Controller",
        )
        is True,
        "Zeus founding note must classify as hub-commanding",
    )
    bad = {
        "device": {"manufacturer": "B&G", "model": "Zeus SR", "category_freeform": "display"},
        "control_surfaces": [],
        "operator_actions": [],
        "networks": {"speaks": [], "bridges": []},
        "data_roles": {
            "exposes_data_to_network": True,
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
                "supports_field": "data_roles.exposes_data_to_network",
                "manual_section": "CZone Digital switching Controller",
                "note": "CZone app controls devices via the network.",
            }
        ],
        "confidence": {"overall": 0.5, "notes": ""},
    }
    bad_ann = validate_interaction_profile(bad, excerpts=[])
    check(
        "direction_mismatch" in validation_flag_names(bad_ann),
        "hub-commanding note on exposes_data must flag direction_mismatch",
    )
    check(
        bad_ann.get("needs_rextraction") is True,
        "direction_mismatch must set needs_rextraction",
    )

    # --- occasion_circular founding ---
    check(
        occasion_is_circular("turn off the device", "to power down the unit") is True,
        "power-down occasion must be circular for turn-off",
    )
    check(
        occasion_is_circular("turn the unit on", "to start the unit") is True,
        "start-unit occasion must be circular for turn-on",
    )
    check(
        occasion_is_circular(
            "connect to mobile app",
            "to connect your mobile device to the unit's hotspot",
        )
        is False,
        "hotspot occasion must NOT be circular",
    )
    circ = {
        "device": {"manufacturer": "B&G", "model": "Zeus", "category_freeform": "display"},
        "control_surfaces": [],
        "operator_actions": [
            {
                "action": "turn off the device",
                "audience": "operator",
                "context": "situational",
                "occasion": "to power down the unit",
            },
            {
                "action": "turn the unit on",
                "audience": "operator",
                "context": "situational",
                "occasion": "to start the unit",
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
        "evidence": [],
        "confidence": {"overall": 0.5, "notes": ""},
    }
    circ_ann = validate_interaction_profile(circ, excerpts=[])
    check(
        "occasion_circular" in validation_flag_names(circ_ann),
        "circular power occasions must flag occasion_circular",
    )
    for a in circ_ann.get("operator_actions") or []:
        check(
            not a.get("occasion"),
            f"circular occasion must be cleared; got {a}",
        )

    # --- vote_margin retention through normalize + validate ---
    voted = {
        "device": {"manufacturer": "B&G", "model": "Zeus", "category_freeform": "display"},
        "control_surfaces": [
            {
                "surface": "touchscreen",
                "location_class": "on_device",
                "optional_accessory": False,
                "label_verbatim": "Touchscreen",
                "path": "control_surfaces[0]",
                "vote_margin": "3/3",
            }
        ],
        "operator_actions": [
            {
                "action": "create a MOB waypoint",
                "audience": "operator",
                "context": "emergency",
                "occasion": "to mark the vessel location in an emergency",
                "vote_margin": "3/3",
                "source": "extracted",
            }
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
        "evidence": [],
        "confidence": {"overall": 0.8, "notes": ""},
        "extraction_votes": [{"field_path": "operator_actions", "kind": "presence"}],
        "instability_triage": {"material_count": 0, "cosmetic_count": 1},
    }
    normed = normalize_profile(voted)
    check(
        (normed.get("operator_actions") or [{}])[0].get("vote_margin") == "3/3",
        "normalize must retain operator_actions vote_margin",
    )
    check(
        isinstance(normed.get("extraction_votes"), list)
        and len(normed["extraction_votes"]) == 1,
        "normalize must retain extraction_votes",
    )
    check(
        (normed.get("instability_triage") or {}).get("cosmetic_count") == 1,
        "normalize must retain instability_triage",
    )
    retained = validate_interaction_profile(normed, excerpts=[])
    check(
        (retained.get("operator_actions") or [{}])[0].get("vote_margin") == "3/3",
        "validate must retain vote_margin",
    )
    check(
        isinstance(retained.get("extraction_votes"), list),
        "validate must retain extraction_votes",
    )

    # --- live Zeus scrub ---
    if ZEUS.is_file():
        zeus = json.loads(ZEUS.read_text(encoding="utf-8"))
        check(
            (zeus.get("data_roles") or {}).get("exposes_data_to_network") is False,
            "live Zeus exposes_data must be false",
        )
        check(
            any(
                "czone" in str(p.get("name") or "").lower()
                for p in (zeus.get("ui_pages") or [])
                if isinstance(p, dict)
            ),
            "live Zeus must have CZone Digital switching ui_page",
        )
        check(
            any(
                isinstance(a, dict) and a.get("vote_margin")
                for a in (zeus.get("operator_actions") or [])
            ),
            "live Zeus must retain vote_margin on actions",
        )
        check(
            isinstance(zeus.get("extraction_votes"), list)
            and len(zeus.get("extraction_votes") or []) > 0,
            "live Zeus must retain extraction_votes",
        )

    if failures:
        print("FAIL")
        for item in failures:
            print(f"  - {item}")
        return 1
    print("OK — Stage 1.5 Zeus v4.29 direction / occasion / vote retention")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
