"""Verify primary-home routing and skeleton assembly for Electrical / Batteries.

Usage (from backend/):
  python scripts/verify_system_assembly.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_equipment_coverage import equipment_for_system, system_has_equipment
from guide_system_assembly import (
    assemble_system_from_fragments,
    draft_target_systems,
    primary_system_for_equipment,
)


def _section(title: str) -> dict:
    return {"t": title, "type": "prose", "c": f"Content for {title}."}


def _row(
    manufacturer: str,
    model: str,
    category: str,
    *,
    systems: dict[str, list[str]],
) -> dict:
    return {
        "equipment_id": f"{manufacturer}-{model}",
        "manufacturer": manufacturer,
        "model": model,
        "system_category": category,
        "fragment": {
            "system_sections": {
                sid: {
                    "summary": f"{manufacturer} {model}",
                    "sections": [_section(title) for title in titles],
                }
                for sid, titles in systems.items()
            }
        },
    }


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    # --- primary home ---
    cases = [
        ("Mastervolt", "MLI Ultra 24/6000", "electrical_dc", "batteries"),
        ("Victron Energy", "SmartSolar MPPT 75/15", "electrical_dc", "batteries"),
        ("Balmar", "MC-624 regulator", "electrical_dc", "batteries"),
        ("Silentwind", "Hybrid 1000", "electrical_dc", "batteries"),
        ("Mass", "Combi Pro", "electrical_dc", "batteries"),
        ("CZone", "system touchscreen", "electrical_dc", "controls"),
        ("CZone", "Touch 7", "electrical_dc", "controls"),
        ("Blue Sea", "ML switch", "electrical_dc", "electrical"),
        ("Blue Sea", "Class T fuse holder", "electrical_dc", "electrical"),
        ("ProInstaller", "busbar", "electrical_dc", "electrical"),
        ("MasterBus", "COI CZone interface", "electrical_dc", "electrical"),
        ("Generic", "shore inlet", "electrical_ac_shore_power", "electrical"),
    ]
    for manufacturer, model, category, expected in cases:
        row = {
            "manufacturer": manufacturer,
            "model": model,
            "system_category": category,
        }
        got = primary_system_for_equipment(row)
        check(
            got == expected,
            f"primary_system({manufacturer} {model}) = {got!r}, expected {expected!r}",
        )
        targets = draft_target_systems(
            category, manufacturer=manufacturer, model=model
        )
        check(
            targets == [expected],
            f"draft_target({manufacturer} {model}) = {targets!r}, expected {[expected]!r}",
        )

    # Unclassified electrical_dc keeps dual catalog membership for drafting.
    unknown_targets = draft_target_systems(
        "electrical_dc", manufacturer="Acme", model="Mystery box"
    )
    check(
        set(unknown_targets) == {"electrical", "batteries"},
        f"unclassified draft targets = {unknown_targets!r}",
    )

    # --- coverage: solar alone should not claim Electrical is configured ---
    solar_only = [
        {
            "manufacturer": "Victron Energy",
            "model": "SmartSolar MPPT 75/15",
            "system_category": "electrical_dc",
        }
    ]
    check(
        not system_has_equipment(solar_only, "electrical"),
        "solar-only vessel should not report electrical equipment present",
    )
    check(
        system_has_equipment(solar_only, "batteries"),
        "solar-only vessel should report batteries equipment present",
    )
    check(
        len(equipment_for_system(solar_only, "batteries")) == 1,
        "solar should appear under batteries",
    )

    # --- assembly: dual-dump legacy fragment lands only on primary home ---
    fragments = [
        _row(
            "CZone",
            "Touch 7",
            "electrical_dc",
            systems={"electrical": ["CZone home page"], "controls": ["CZone home page"]},
        ),
        _row(
            "Victron Energy",
            "SmartSolar MPPT 75/15",
            "electrical_dc",
            # Legacy: drafted into both systems
            systems={
                "electrical": ["Solar install dump"],
                "batteries": ["Solar day-to-day"],
            },
        ),
        _row(
            "Mastervolt",
            "MLI Ultra 24/6000",
            "electrical_dc",
            # Legacy: only wrote into electrical
            systems={"electrical": ["BMS recovery"]},
        ),
        _row(
            "Blue Sea",
            "Class T fuse holder",
            "electrical_dc",
            systems={"electrical": ["Class T location"]},
        ),
    ]

    controls = assemble_system_from_fragments("controls", fragments)
    assert controls is not None
    ctitles = [s["t"] for s in controls["sections"]]
    check(
        "CZone home page" in ctitles,
        f"controls missing CZone; got {ctitles}",
    )
    check(
        "Class T location" not in ctitles,
        f"controls must not include Class T; got {ctitles}",
    )

    electrical = assemble_system_from_fragments("electrical", fragments)
    assert electrical is not None
    titles = [s["t"] for s in electrical["sections"]]
    check(
        "Solar install dump" not in titles,
        f"electrical must not include solar dump; got {titles}",
    )
    check(
        "BMS recovery" not in titles,
        f"electrical must not include MLI; got {titles}",
    )
    check(
        "CZone home page" not in titles,
        f"electrical must not include CZone after controls home; got {titles}",
    )
    check(
        "Class T location" in titles,
        f"electrical missing panel gear; got {titles}",
    )

    batteries = assemble_system_from_fragments("batteries", fragments)
    assert batteries is not None
    btitles = [s["t"] for s in batteries["sections"]]
    check(
        "Solar day-to-day" in btitles,
        f"batteries missing solar guest content: {btitles}",
    )
    check(
        "BMS recovery" in btitles,
        f"batteries should recover legacy MLI content from electrical key: {btitles}",
    )
    check(
        "CZone home page" not in btitles,
        f"batteries must not include CZone: {btitles}",
    )
    check(
        "Solar install dump" not in btitles,
        f"batteries should prefer batteries key over electrical dump: {btitles}",
    )

    # Engines (no skeleton): stable concat with device headings when multi.
    engines = assemble_system_from_fragments(
        "engines",
        [
            _row("Yanmar", "4JH45", "propulsion", systems={"engines": ["Start"]}),
            _row("Yanmar", "SailDrive", "propulsion", systems={"engines": ["Saildrive notes"]}),
        ],
    )
    assert engines is not None
    etitles = [s["t"] for s in engines["sections"]]
    check(
        etitles == [
            "Yanmar 4JH45",
            "Start",
            "Yanmar SailDrive",
            "Saildrive notes",
        ],
        f"engines multi assembly unexpected: {etitles}",
    )

    if failures:
        print("FAIL")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("OK - primary home + skeleton assembly checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
