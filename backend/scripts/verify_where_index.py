"""Where-is index uses equipment location rows and the vessel's zone list."""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_navigation import (  # noqa: E402
    build_location_layout,
    build_where_index,
    enrich_navigation,
)

DASH = "\u2013"


def _ids(vessel_type: str) -> list[str]:
    return [zone["id"] for zone in build_location_layout(vessel_type)]


def _row(name: str, location: str) -> dict:
    return {
        "engines": {
            "title": "Engines",
            "sections": [
                {
                    "type": "equipment_locations",
                    "rows": [{"name": name, "location": location}],
                }
            ],
        }
    }


def main() -> int:
    failures: list[str] = []

    def expect(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    def zone_of(systems: dict) -> tuple[str | None, list[str]]:
        index, warnings = build_where_index(systems, "sailing_catamaran")
        item = index["items"][0]
        return item["zone"], warnings

    zone, warnings = zone_of(_row("Chart table", "Saloon / Living Area"))
    expect(zone == "saloon_living_area" and not warnings, f"saloon {zone} {warnings}")

    zone, warnings = zone_of(
        _row("Battery", "Saloon / Living Area (Under sofa near chart table)")
    )
    expect(zone == "saloon_living_area" and not warnings, f"saloon detail {zone} {warnings}")

    zone, warnings = zone_of(
        _row(
            "Generator",
            f"Port {DASH} Engine / Machinery Space {DASH} Generator Compartment (Wing locker)",
        )
    )
    expect(
        zone == "engine_machinery_space" and not warnings,
        f"generator {zone} {warnings}",
    )

    zone, warnings = zone_of(_row("Alternator", "Port (was: port hull)"))
    expect(zone is None and warnings, f"port hull leftover {zone} {warnings}")

    zone, warnings = zone_of(_row("Helm", "Flybridge / Upper Deck"))
    expect(zone is None and warnings, f"flybridge on a sailing cat {zone} {warnings}")

    continued, continued_warnings = build_where_index(
        {
            "engines": {
                "title": "Engines",
                "sections": [
                    {
                        "type": "equipment_locations",
                        "rows": [
                            {
                                "name": "Fischer Panda",
                                "location": (
                                    f"Port {DASH} Engine / Machinery Space {DASH} "
                                    "Generator Compartment"
                                ),
                            },
                            {"name": "", "location": "Saloon / Living Area"},
                        ],
                    }
                ],
            }
        },
        "sailing_catamaran",
    )
    names = [item["name"] for item in continued["items"]]
    zones = [item["zone"] for item in continued["items"]]
    expect(
        names == ["Fischer Panda", "Fischer Panda"]
        and zones == ["engine_machinery_space", "saloon_living_area"]
        and not continued_warnings,
        f"blank name continues {names} {zones} {continued_warnings}",
    )

    cat = _ids("sailing_catamaran")
    expect("flybridge_upper_deck" not in cat and "rigging_sail_handling" in cat, f"cat {cat}")
    tri = _ids("sailing_trimaran")
    expect("rigging_sail_handling" in tri and "flybridge_upper_deck" not in tri, f"trimaran {tri}")
    power = _ids("power_catamaran")
    expect(
        "flybridge_upper_deck" in power and "rigging_sail_handling" not in power,
        f"power cat {power}",
    )
    sport = _ids("sport_fishing")
    expect(
        "flybridge_upper_deck" in sport
        and "rigging_sail_handling" not in sport
        and "port-hull" not in sport,
        f"sport fishing {sport}",
    )

    empty = {
        "branding": {"vesselType": "sailing_catamaran"},
        "systems": {"overview": {"locs": ["cockpit", "helm", "saloon"], "sections": []}},
        "checklists": {},
        "ui": {},
    }
    enrich_navigation(empty, vessel_type="sailing_catamaran")
    expect(empty["ui"]["whereIndex"]["items"] == [], "no rows means an empty index")
    expect(empty["locations"] == {}, "no rows means no zone membership")
    expect("_location_warnings" in empty, "warnings key is set for publish to lift off")

    if failures:
        print("FAILED:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("OK: where index")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
