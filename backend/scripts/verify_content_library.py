"""Verify content assembler output matches guide_content_library_legacy.py."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

import guide_content_library_legacy as legacy
from content.assembler import LIBRARY_MODULE_BUILDERS

ALL_CATEGORIES = [
    "propulsion",
    "sanitation",
    "freshwater_system",
    "electrical_dc",
    "electrical_ac_shore_power",
    "refrigeration_galley",
    "navigation_electronics",
    "communications",
    "anchoring_ground_tackle",
    "rigging_sail_handling",
    "sails",
    "hvac_climate",
    "tenders_davits",
]

BASE_CONTEXT = {
    "displayName": "Abacos",
    "regionLabel": "Abacos",
    "officeVhf": {"label": "Cruise Abaco", "channel": "VHF 68", "hours": "08:00–17:00"},
    "localRules": [
        "Never anchor on coral",
        "Monitor VHF Ch 16 underway",
    ],
    "emergencyContacts": [{"label": "Base", "value": "test", "action": "call", "tel": "1"}],
}


def make_snapshot(
    categories: list[str] | None = None,
    *,
    vessel_type: str = "sailing_catamaran",
    twin_propulsion: bool = False,
    watermaker_model: bool = False,
) -> dict[str, Any]:
    equipment: list[dict[str, Any]] = []
    for category in categories or []:
        if category == "propulsion" and twin_propulsion:
            equipment.extend(
                [
                    {
                        "manufacturer": "Yanmar",
                        "model": "4JH45",
                        "system_category": "propulsion",
                        "zone": "port-hull",
                        "zone_instance": "port",
                    },
                    {
                        "manufacturer": "Yanmar",
                        "model": "4JH45",
                        "system_category": "propulsion",
                        "zone": "stbd-hull",
                        "zone_instance": "starboard",
                    },
                ]
            )
            continue
        row: dict[str, Any] = {
            "manufacturer": "Generic",
            "model": "Unit",
            "system_category": category,
            "zone": "cockpit",
        }
        if category == "freshwater_system" and watermaker_model:
            row["model"] = "Spectra watermaker"
        equipment.append(row)

    return {
        "vessel": {"name": "Test Vessel", "slug": "test", "vessel_type": vessel_type},
        "charter_company": {"name": "Cruise Abaco"},
        "operating_base": {"name": "Boat Harbour"},
        "guide_context": BASE_CONTEXT,
        "equipment": equipment,
    }


FIXTURES = [
    ("minimal", make_snapshot([])),
    ("full", make_snapshot(ALL_CATEGORIES, twin_propulsion=True, watermaker_model=True)),
    ("twin-engines", make_snapshot(["propulsion"], twin_propulsion=True)),
    ("monohull", make_snapshot(["propulsion"], vessel_type="sailing_monohull")),
]


def main() -> int:
    failures: list[str] = []
    for fixture_name, snapshot in FIXTURES:
        for key, builder in LIBRARY_MODULE_BUILDERS.items():
            legacy_builder = legacy.LIBRARY_MODULE_BUILDERS[key]
            expected = legacy_builder(snapshot)
            actual = builder(snapshot)
            if expected != actual:
                failures.append(
                    f"{fixture_name} {key[0]}/{key[1]}:\n"
                    f"expected={json.dumps(expected, ensure_ascii=False, sort_keys=True)}\n"
                    f"actual  ={json.dumps(actual, ensure_ascii=False, sort_keys=True)}"
                )

    if failures:
        print(f"FAILED: {len(failures)} mismatch(es)")
        for failure in failures[:10]:
            print(failure)
            print("---")
        return 1

    print(f"OK: {len(FIXTURES)} fixtures × {len(LIBRARY_MODULE_BUILDERS)} modules")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
