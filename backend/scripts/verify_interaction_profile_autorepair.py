"""Unit checks for contradiction_builtin auto-repair (Stage 1.5).

Usage (from backend/):
  python scripts/verify_interaction_profile_autorepair.py
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_validate import (
    validate_interaction_profile,
    validation_flag_names,
)


def _base_profile() -> dict:
    return {
        "device": {
            "manufacturer": "Victron Energy",
            "model": "SmartSolar MPPT 75 | 15",
            "category_freeform": "MPPT solar charger",
        },
        "control_surfaces": [
            {
                "surface": "mobile_app_bluetooth",
                "location_class": "wireless",
                "optional_accessory": False,
                "label_verbatim": "VictronConnect app",
                "path": "control_surfaces[0]",
            },
            {
                "surface": "remote_panel_accessory",
                "location_class": "remote_wired",
                "optional_accessory": True,
                "label_verbatim": "MPPT Control",
                "path": "control_surfaces[1]",
            },
        ],
        "operator_actions": [],
        "networks": {"speaks": [], "bridges": []},
        "data_roles": {
            "exposes_data_to_network": True,
            "displays_data_from_other_devices": False,
            "controllable_from_network": False,
        },
        "requires_devices": [
            {
                "description_verbatim": "GX device",
                "needed_for": "data_roles.exposes_data_to_network",
            },
            {
                "description_verbatim": "VE.Direct Bluetooth Smart Dongle",
                "needed_for": "control_surfaces[0]",
            },
            {
                "description_verbatim": "MPPT Control display",
                "needed_for": "control_surfaces[1]",
            },
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
                "supports_field": "data_roles.exposes_data_to_network",
                "manual_section": "VE.Direct",
                "note": "Port exposes data via GX",
            },
            {
                "supports_field": "requires_devices[0]",
                "manual_section": "VE.Direct",
                "note": "GX required for remote monitoring",
            },
            {
                "supports_field": "requires_devices[2]",
                "manual_section": "External display",
                "note": "Optional panel for local control",
            },
        ],
        "confidence": {"overall": 0.8, "notes": ""},
    }


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    raw = _base_profile()
    surface_before = copy.deepcopy(raw["control_surfaces"])
    annotated = validate_interaction_profile(raw, excerpts=[])

    reqs = annotated.get("requires_devices") or []
    descs = {
        str(r.get("description_verbatim") or "")
        for r in reqs
        if isinstance(r, dict)
    }
    check(
        "VE.Direct Bluetooth Smart Dongle" not in descs,
        "dongle entry targeting built-in surface must be dropped",
    )
    check("GX device" in descs, "data_roles dependency must be kept")
    check(
        "MPPT Control display" in descs,
        "optional_accessory:true dependency must be kept",
    )
    check(
        annotated.get("control_surfaces") == surface_before,
        "control surfaces must be untouched by auto-repair",
    )
    check(
        "contradiction_builtin_requires_accessory" in validation_flag_names(annotated),
        "repaired contradiction must remain as a flag",
    )
    warn = [
        f
        for f in (annotated.get("validation_flags") or [])
        if f.get("flag") == "contradiction_builtin_requires_accessory"
    ]
    check(warn and warn[0].get("severity") == "warning", "flag must be warning")
    check(
        any("repaired: dropped_entry" in str(f.get("detail") or "") for f in warn),
        "warning detail must note repaired: dropped_entry",
    )
    check(
        annotated.get("needs_rextraction") is False,
        "auto-repaired contradiction must not set needs_rextraction",
    )
    repairs = annotated.get("repairs") or []
    check(len(repairs) == 1, f"expected one repairs[] entry, got {len(repairs)}")
    if repairs:
        check(
            repairs[0].get("repair") == "dropped_entry",
            "repairs[].repair must be dropped_entry",
        )
        original = repairs[0].get("original_entry") or {}
        check(
            original.get("description_verbatim")
            == "VE.Direct Bluetooth Smart Dongle",
            "repairs[] must preserve original entry",
        )

    if failures:
        print("FAIL")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("OK - Stage 1.5 contradiction auto-repair checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
