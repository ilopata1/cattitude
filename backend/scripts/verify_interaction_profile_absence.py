"""Absence-class + coverage validator checks (Stage 1.5).

Usage (from backend/):
  python scripts/verify_interaction_profile_absence.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_validate import (
    validate_interaction_profile,
    validation_flag_names,
)


def _base(**overrides: object) -> dict:
    profile = {
        "device": {
            "manufacturer": "Example",
            "model": "Widget",
            "category_freeform": "inverter/charger",
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
                "note": "Product identified in title",
            }
        ],
        "confidence": {"overall": 0.5, "notes": ""},
    }
    profile.update(overrides)
    return profile


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    hollow = _base(
        operator_actions=[
            {
                "action": "adjust daily settings",
                "audience": "operator",
                "context": "daily",
            }
        ],
        networks={
            "speaks": [{"name_verbatim": "NMEA 2000", "physical_or_wireless": "wired"}],
            "bridges": [],
        },
        device={
            "manufacturer": "Example Marine",
            "model": "Test Inverter",
            "category_freeform": "electrical_dc",
        },
    )
    ann = validate_interaction_profile(hollow, excerpts=[])
    names = validation_flag_names(ann)
    check("action_without_surface" in names, "missing action_without_surface")
    check("speaks_but_inert" in names, "missing speaks_but_inert")
    check("category_freeform_provenance" in names, "missing category_freeform_provenance")
    check(ann.get("needs_rextraction") is False, "absence flags must not set needs_rextraction")

    cov = validate_interaction_profile(
        _base(),
        excerpts=[],
        coverage={
            "chunk_count": 63,
            "heading_count": 40,
            "headings_covered_count": 4,
            "heading_coverage_fraction": 0.1,
            "coverage_low_threshold": 0.25,
            "top_k_used": 4,
        },
    )
    check("coverage_low" in validation_flag_names(cov), "coverage_low must warn")
    check(
        isinstance(cov.get("coverage"), dict)
        and cov["coverage"].get("heading_coverage_fraction") == 0.1,
        "coverage metric must persist on profile",
    )
    check(cov.get("needs_rextraction") is False, "coverage_low must not force rextraction")

    if failures:
        print("FAIL")
        for item in failures:
            print(f"  - {item}")
        return 1
    print("OK - absence + coverage validator checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
