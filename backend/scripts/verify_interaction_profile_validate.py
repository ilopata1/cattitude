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
        leak_ann.get("needs_rextraction") is False,
        "mechanically repaired fewshot_leakage must not set needs_rextraction",
    )
    leak_warn = [
        f
        for f in (leak_ann.get("validation_flags") or [])
        if f.get("flag") == "fewshot_leakage"
    ]
    check(
        leak_warn and leak_warn[0].get("severity") == "warning",
        "repaired fewshot_leakage must be warning severity",
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

    # Blocking evidence_incomplete must set needs_rextraction (Zeus gate).
    from interaction_profile_validate import stage15_gate_passes

    incomplete = {
        "device": {
            "manufacturer": "B&G",
            "model": "Zeus SR",
            "category_freeform": "MFD",
        },
        "control_surfaces": [],
        "operator_actions": [],
        "networks": {"speaks": [], "bridges": []},
        "data_roles": {
            "exposes_data_to_network": False,
            "displays_data_from_other_devices": True,
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
                "note": "Model named on cover",
            }
        ],
        "confidence": {"overall": 0.5, "notes": ""},
    }
    incomplete_ann = validate_interaction_profile(incomplete, excerpts=[])
    check(
        "evidence_incomplete" in validation_flag_names(incomplete_ann),
        "true data_roles without evidence must fire evidence_incomplete",
    )
    check(
        incomplete_ann.get("needs_rextraction") is True,
        "blocking evidence_incomplete must set needs_rextraction",
    )
    check(
        stage15_gate_passes(incomplete_ann) is False,
        "blocking evidence gaps must fail stage15_gate_passes",
    )

    # --- v4.25: networks.speaks grounding (Zeus founding + Victron control) ---
    from interaction_profile_validate import network_name_grounded_in_corpus

    zeus_net_excerpts = [
        {
            "text": (
                "NMEA 2000 backbone connection. CZone Digital switching. "
                "Bluetooth pairing with the mobile app."
            )
        }
    ]
    check(
        network_name_grounded_in_corpus("MasterBus", ["NMEA 2000 CZone Bluetooth"])
        is False,
        "MasterBus must not ground in Zeus-like corpus",
    )
    check(
        network_name_grounded_in_corpus(
            "VE.Direct", ["VE.Direct port connection to a GX device"]
        )
        is True,
        "VE.Direct must ground when named in excerpts",
    )
    zeus_leak = {
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
        "networks": {
            "speaks": [
                {"name_verbatim": "NMEA 2000", "physical_or_wireless": "wired"},
                {"name_verbatim": "MasterBus", "physical_or_wireless": "wired"},
                {"name_verbatim": "CZone", "physical_or_wireless": "wired"},
                {"name_verbatim": "VE.Direct", "physical_or_wireless": "wired"},
                {"name_verbatim": "Bluetooth", "physical_or_wireless": "wireless"},
            ],
            "bridges": [
                {"from": "MasterBus", "to": "CZone"},
            ],
        },
        "data_roles": {
            "exposes_data_to_network": True,
            "displays_data_from_other_devices": True,
            "controllable_from_network": True,
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
                "manual_section": "NMEA 2000",
                "note": "Unit speaks on the backbone",
            },
            {
                "supports_field": "data_roles.displays_data_from_other_devices",
                "manual_section": "Connected devices",
                "note": "Shows data from connected sensors",
            },
            {
                "supports_field": "data_roles.controllable_from_network",
                "manual_section": "CZone Digital switching",
                "note": "CZone control from the display",
            },
        ],
        "confidence": {"overall": 0.7, "notes": ""},
    }
    zeus_ann = validate_interaction_profile(zeus_leak, excerpts=zeus_net_excerpts)
    kept_speaks = {
        str(s.get("name_verbatim") or "")
        for s in ((zeus_ann.get("networks") or {}).get("speaks") or [])
        if isinstance(s, dict)
    }
    check(
        "MasterBus" not in kept_speaks and "VE.Direct" not in kept_speaks,
        f"ungrounded MasterBus/VE.Direct must be dropped; kept {kept_speaks}",
    )
    check(
        {"NMEA 2000", "CZone", "Bluetooth"} <= kept_speaks,
        f"grounded speaks must remain; kept {kept_speaks}",
    )
    check(
        not ((zeus_ann.get("networks") or {}).get("bridges") or []),
        "ungrounded MasterBus bridge must be dropped",
    )
    check(
        "fewshot_leakage" in validation_flag_names(zeus_ann),
        "ungrounded speaks must flag fewshot_leakage warning",
    )
    check(
        zeus_ann.get("needs_rextraction") is False,
        "repaired speak leakage must not set needs_rextraction",
    )
    # Existing Zeus leak note is also polarity-inverted (controls others).
    check(
        (zeus_ann.get("data_roles") or {}).get("controllable_from_network") is False,
        "Zeus CZone-control-from-display note must clear controllable_from_network",
    )
    check(
        "data_role_polarity" in validation_flag_names(zeus_ann),
        "Zeus inverted controllable evidence must flag data_role_polarity",
    )

    # --- v4.26: data_roles controllable_from_network polarity ---
    from interaction_profile_validate import controllable_evidence_is_controls_others

    check(
        controllable_evidence_is_controls_others(
            "Control devices via the CZone network",
            "CZone Digital switching Controller",
        )
        is True,
        "Zeus founding note must classify as controls-others",
    )
    check(
        controllable_evidence_is_controls_others(
            "configure charger via VictronConnect app",
            "VictronConnect",
        )
        is False,
        "VictronConnect this-unit note must not classify as controls-others",
    )
    zeus_polarity = {
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
        "networks": {
            "speaks": [
                {"name_verbatim": "NMEA 2000", "physical_or_wireless": "wired"},
                {"name_verbatim": "CZone", "physical_or_wireless": "wired"},
            ],
            "bridges": [],
        },
        "data_roles": {
            "exposes_data_to_network": False,
            "displays_data_from_other_devices": True,
            "controllable_from_network": True,
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
                "supports_field": "data_roles.displays_data_from_other_devices",
                "manual_section": "CONNECTED DEVICES",
                "note": "Shows status from connected sensors",
            },
            {
                "supports_field": "data_roles.controllable_from_network",
                "manual_section": "CZone Digital switching Controller",
                "note": "Control devices via the CZone network",
            },
        ],
        "confidence": {"overall": 0.8, "notes": ""},
    }
    zeus_pol_ann = validate_interaction_profile(zeus_polarity, excerpts=[])
    check(
        (zeus_pol_ann.get("data_roles") or {}).get("controllable_from_network")
        is False,
        "Zeus founding: controllable_from_network must clear to false",
    )
    check(
        (zeus_pol_ann.get("data_roles") or {}).get("displays_data_from_other_devices")
        is True,
        "Zeus founding: displays_data_from_other_devices must remain true",
    )
    check(
        "data_role_polarity" in validation_flag_names(zeus_pol_ann),
        "Zeus founding must flag data_role_polarity warning",
    )
    check(
        zeus_pol_ann.get("needs_rextraction") is False,
        "data_role_polarity repair must not set needs_rextraction",
    )
    check(
        stage15_gate_passes(zeus_pol_ann) is True,
        "cleared polarity must still pass stage15_gate_passes",
    )
    pol_paths = {
        str(e.get("supports_field") or "")
        for e in (zeus_pol_ann.get("evidence") or [])
        if isinstance(e, dict)
    }
    check(
        "data_roles.controllable_from_network" not in pol_paths,
        "inverted controllable evidence must be dropped",
    )

    victron_ok = {
        "device": {
            "manufacturer": "Victron",
            "model": "SmartSolar",
            "category_freeform": "MPPT solar charger",
        },
        "control_surfaces": [
            {
                "surface": "mobile_app_bluetooth",
                "location_class": "wireless",
                "optional_accessory": False,
                "label_verbatim": "VictronConnect",
                "path": "control_surfaces[0]",
            }
        ],
        "operator_actions": [],
        "networks": {
            "speaks": [
                {"name_verbatim": "Bluetooth", "physical_or_wireless": "wireless"},
            ],
            "bridges": [],
        },
        "data_roles": {
            "exposes_data_to_network": True,
            "displays_data_from_other_devices": False,
            "controllable_from_network": True,
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
                "manual_section": "Bluetooth",
                "note": "Charger publishes status over Bluetooth",
            },
            {
                "supports_field": "data_roles.controllable_from_network",
                "manual_section": "VictronConnect",
                "note": "configure charger via VictronConnect app",
            },
        ],
        "confidence": {"overall": 0.8, "notes": ""},
    }
    victron_ann = validate_interaction_profile(victron_ok, excerpts=[])
    check(
        (victron_ann.get("data_roles") or {}).get("controllable_from_network") is True,
        "Victron this-unit app control must keep controllable_from_network",
    )
    check(
        "data_role_polarity" not in validation_flag_names(victron_ann),
        "Victron this-unit note must not flag data_role_polarity",
    )

    # --- v4.27: evidence note better-matches a different action ---
    from interaction_profile_validate import evidence_action_support_mismatch

    mismatch_profile = {
        "operator_actions": [
            {
                "action": "turn off the device",
                "audience": "operator",
                "context": "situational",
            },
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
        ],
    }
    check(
        evidence_action_support_mismatch(
            mismatch_profile,
            note="Initial setup steps for first use",
            section="FIRST STARTUP",
            linked_action="turn off the device",
        )
        is not None
        and "initial setup"
        in (
            evidence_action_support_mismatch(
                mismatch_profile,
                note="Initial setup steps for first use",
                section="FIRST STARTUP",
                linked_action="turn off the device",
            )
            or ""
        ),
        "scrambled setup note must better-match initial-setup action",
    )
    check(
        evidence_action_support_mismatch(
            mismatch_profile,
            note="Initial setup steps for first use",
            section="FIRST STARTUP",
            linked_action=(
                "complete initial setup for Language, Country selection, "
                "Time zone, and Boat network"
            ),
        )
        is None,
        "correctly paired setup evidence must not flag mismatch",
    )
    scrambled = {
        "device": {
            "manufacturer": "B&G",
            "model": "Zeus SR",
            "category_freeform": "display",
        },
        "control_surfaces": [],
        "operator_actions": mismatch_profile["operator_actions"],
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
                "supports_field": "operator_actions[action=turn off the device]",
                "manual_section": "FIRST STARTUP",
                "note": "Initial setup steps for first use",
            }
        ],
        "confidence": {"overall": 0.7, "notes": ""},
    }
    scrambled_ann = validate_interaction_profile(scrambled, excerpts=[])
    check(
        "evidence_support_mismatch" in validation_flag_names(scrambled_ann),
        "scrambled supports_field/note must flag evidence_support_mismatch",
    )
    check(
        scrambled_ann.get("needs_rextraction") is False,
        "evidence_support_mismatch must be warning only",
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
