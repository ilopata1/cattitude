"""Stage 1.5 validator regression — defect sample + corrected sample.

- ``stage15_defective_extraction.json``: must fire dangling / contradiction /
  unknown_field / evidence_shape / evidence_verbatim (full-sentence strings).
- ``smartsolar_corrected_extraction.json``: must produce ZERO evidence_verbatim
  flags, keep the three restored operator actions, and
  ``has_emergency_procedure: true``.

Usage (from backend/):
  python scripts/verify_interaction_profile_validate.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_validate import (
    validate_interaction_profile,
    validation_flag_names,
)

FIXTURES = _BACKEND / "tests" / "fixtures"
DEFECTIVE = FIXTURES / "stage15_defective_extraction.json"
CORRECTED = FIXTURES / "smartsolar_corrected_extraction.json"

REQUIRED_DEFECT_FLAGS = {
    "dangling_needed_for",
    "contradiction_builtin_requires_accessory",
    "unknown_field",
    "evidence_shape_invalid",
    "evidence_verbatim",
}

REQUIRED_ACTIONS = [
    ("shutdown the solar charger", "situational"),
    ("restart the solar charger", "situational"),
    ("consult error codes and alarms", "emergency"),
]


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    # --- defective sample (both directions pinned) ---
    raw = json.loads(DEFECTIVE.read_text(encoding="utf-8"))
    excerpts = [
        {"text": item}
        for item in (raw.get("evidence") or [])
        if isinstance(item, str)
    ]
    annotated = validate_interaction_profile(raw, excerpts=excerpts)
    names = validation_flag_names(annotated)

    for flag in REQUIRED_DEFECT_FLAGS:
        check(flag in names, f"defective: missing {flag!r}; have {sorted(names)}")

    check(
        annotated.get("needs_rextraction") is True,
        "defective: unresolvable dangling_needed_for must set needs_rextraction=True",
    )
    # Builtin-dongle contradiction is auto-repaired to a warning (entry dropped).
    contra = [
        f
        for f in (annotated.get("validation_flags") or [])
        if f.get("flag") == "contradiction_builtin_requires_accessory"
    ]
    check(contra, "defective: contradiction flag must still appear after auto-repair")
    check(
        all(f.get("severity") == "warning" for f in contra),
        "defective: contradiction_builtin must be warning after auto-repair",
    )
    check(
        not any(
            "Dongle" in str(r.get("description_verbatim") or "")
            for r in (annotated.get("requires_devices") or [])
            if isinstance(r, dict)
        ),
        "defective: dongle requires_devices entry must be dropped by auto-repair",
    )

    # --- corrected SmartSolar: no evidence_verbatim; actions + safety ---
    corrected = json.loads(CORRECTED.read_text(encoding="utf-8"))
    # Realistic excerpt corpus that includes section titles (must NOT trigger
    # evidence_verbatim on manual_section) and short note-like phrases.
    corrected_excerpts = [
        {"text": "VictronConnect Bluetooth setup and status screens"},
        {"text": "VE.Direct port connection to a GX device for VRM monitoring"},
        {"text": "Error codes table listing fault numbers and recovery steps"},
        {"text": "Shutdown and restart procedures for the solar charger"},
        {
            "text": (
                "Device communicates over VE.Smart Networking when networked "
                "with compatible products on the vessel"
            )
        },
    ]
    corr_ann = validate_interaction_profile(corrected, excerpts=corrected_excerpts)
    corr_names = validation_flag_names(corr_ann)
    check(
        "evidence_verbatim" not in corr_names,
        f"corrected SmartSolar must have ZERO evidence_verbatim; have "
        f"{[f for f in corr_ann.get('validation_flags') or [] if f.get('flag') == 'evidence_verbatim']}",
    )
    check(
        corr_ann.get("needs_rextraction") is False,
        "corrected SmartSolar must not need re-extraction",
    )
    check(
        "fewshot_leakage" not in corr_names,
        "corrected SmartSolar must not flag fewshot_leakage",
    )
    check(
        "evidence_incomplete" not in corr_names,
        "corrected SmartSolar must not flag evidence_incomplete",
    )

    actions = corrected.get("operator_actions") or []

    def has_action(text: str, context: str) -> bool:
        needle = text.lower()
        return any(
            needle in str(a.get("action") or "").lower()
            and str(a.get("context") or "") == context
            for a in actions
            if isinstance(a, dict)
        )

    for text, context in REQUIRED_ACTIONS:
        check(
            has_action(text, context),
            f"corrected fixture missing action {text!r} ({context})",
        )

    safety = corrected.get("safety_role") or {}
    check(
        safety.get("has_emergency_procedure") is True,
        "corrected fixture must have has_emergency_procedure == true",
    )

    # fewshot_leakage: calibration-C stock phrase without BMS grounding in excerpts.
    leak = {
        "device": {
            "manufacturer": "Victron Energy",
            "model": "SmartSolar MPPT 75 | 15",
            "category_freeform": "MPPT solar charger",
        },
        "control_surfaces": [],
        "operator_actions": [
            {
                "action": "reset BMS after protective disconnect",
                "audience": "operator",
                "context": "emergency",
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
            "has_emergency_procedure": True,
        },
        "protected_by": [],
        "protects": [],
        "supply_requirements": [],
        "evidence": [
            {
                "supports_field": "safety_role.has_emergency_procedure",
                "manual_section": "Error codes",
                "note": "Error code table present",
            }
        ],
        "confidence": {"overall": 0.5, "notes": ""},
    }
    leak_excerpts = [
        {"text": "8.12. Error code overview. Error 1 battery temperature too high."}
    ]
    leak_ann = validate_interaction_profile(leak, excerpts=leak_excerpts)
    check(
        "fewshot_leakage" in validation_flag_names(leak_ann),
        "calibration-C stock action must flag fewshot_leakage without BMS grounding",
    )
    check(
        leak_ann.get("needs_rextraction") is True,
        "fewshot_leakage must set needs_rextraction",
    )

    # Example K leakage: MasterView remote panel surface without grounding.
    leak_k = {
        "device": {
            "manufacturer": "Victron Energy",
            "model": "SmartSolar MPPT 75 | 15",
            "category_freeform": "MPPT solar charger",
        },
        "control_surfaces": [
            {
                "surface": "remote_panel_accessory",
                "location_class": "remote_wired",
                "optional_accessory": True,
                "label_verbatim": "MasterView remote panel",
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
        "requires_devices": [
            {
                "description_verbatim": "MasterView remote panel",
                "needed_for": "control_surfaces[0]",
            }
        ],
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
                "supports_field": "device.model",
                "manual_section": "Overview",
                "note": "Solar charger product identity",
            }
        ],
        "confidence": {"overall": 0.5, "notes": ""},
    }
    leak_k_ann = validate_interaction_profile(
        leak_k,
        excerpts=[{"text": "Bluetooth VictronConnect app VE.Direct GX device."}],
    )
    check(
        "fewshot_leakage" in validation_flag_names(leak_k_ann),
        "calibration-K MasterView remote panel must flag fewshot_leakage "
        "without MasterView grounding",
    )

    # Example L stock sentence without 30cm/fuse install wording in excerpts.
    leak_l = {
        **{k: v for k, v in leak.items() if k != "operator_actions"},
        "operator_actions": [],
        "control_surfaces": [],
        "requires_devices": [],
        "supply_requirements": [
            {
                "description_verbatim": (
                    "Install a fuse in the positive DC supply cable "
                    "within 30cm of the battery."
                )
            }
        ],
        "evidence": [
            {
                "supports_field": "supply_requirements[0]",
                "manual_section": "Wiring",
                "note": "Fuse required on supply",
            }
        ],
        "safety_role": {
            "is_protective_device": False,
            "has_manual_override": False,
            "has_emergency_procedure": False,
        },
    }
    leak_l_ann = validate_interaction_profile(
        leak_l,
        excerpts=[
            {
                "text": "The positive battery cable must be fused and connected "
                "to the positive post of the battery bank."
            }
        ],
    )
    check(
        "fewshot_leakage" in validation_flag_names(leak_l_ann),
        "calibration-L stock supply sentence must flag fewshot_leakage when "
        "excerpts only have generic fused-cable language (no 30cm example)",
    )

    # Clean empty profile still clean.
    clean = {
        "device": {
            "manufacturer": "Example",
            "model": "Widget",
            "category_freeform": "widget",
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
                "supports_field": "device.model",
                "manual_section": "Overview",
                "note": "Passive component no operator UI",
            }
        ],
        "confidence": {"overall": 0.8, "notes": ""},
    }
    clean_ann = validate_interaction_profile(clean, excerpts=[])
    check(
        clean_ann.get("needs_rextraction") is False
        and validation_flag_names(clean_ann) == set(),
        f"clean profile unexpectedly flagged: {clean_ann.get('validation_flags')}",
    )

    if failures:
        print("FAIL")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("OK - Stage 1.5 validator defect + corrected checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
