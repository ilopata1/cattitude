"""Brochure and grounding warnings on a guest payload."""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_tone import tone_warnings  # noqa: E402


def _module(system_id: str, **fields):
    payload = {"id": system_id, "sections": []}
    payload.update(fields)
    return payload


def main() -> None:
    failures: list[str] = []

    def check(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    supernova = {
        "systems": {
            "overview": _module(
                "overview",
                subtitle="Your Sailing Catamaran Experience",
                summary=(
                    "Welcome to Supernova, a sleek Outremer 55 sailing catamaran. "
                    "This overview will help you familiarize yourself with the layout."
                ),
                sections=[
                    {
                        "t": "About Supernova",
                        "type": "prose",
                        "c": "This vessel combines luxury with functionality.",
                    },
                    {
                        "t": "Layout",
                        "type": "list",
                        "items": [
                            "Cabins: Designed for comfort (specific cabin counts not provided)."
                        ],
                    },
                    {
                        "t": "Find These on Day 1",
                        "type": "steps",
                        "items": [
                            "Familiarize yourself with the generator and battery bank in the engine room."
                        ],
                    },
                ],
            ),
            "safety": _module(
                "safety",
                summary="Familiarize yourself with the locations and usage of life jackets.",
                sections=[
                    {
                        "t": "EPIRB",
                        "type": "prose",
                        "c": "Familiarize yourself with its location and operation.",
                    }
                ],
            ),
            "dinghy": _module(
                "dinghy",
                summary=(
                    "The Highfield Classic 360 is a versatile inflatable tender "
                    "suitable for various watersports activities."
                ),
            ),
            "engines": _module(
                "engines",
                sections=[
                    {
                        "t": "Equipment Locations",
                        "type": "equipment_locations",
                        "rows": [
                            {"name": "Port engine", "location": "Port hull"},
                            {"name": "Starboard engine", "location": "Starboard hull"},
                        ],
                    }
                ],
            ),
        }
    }
    hits = tone_warnings(supernova, {"has_safety_gear": False, "has_guest_location": False})
    joined = "\n".join(hits)
    for phrase in (
        "sleek",
        "luxury",
        "experience",
        "versatile",
        "not provided",
        "familiarize yourself",
        "the engine room",
        "life jacket",
    ):
        check(phrase.lower() in joined.lower() or phrase in joined, f"missing hit {phrase}")
    check("if applicable" not in joined, "if applicable was not in this fixture")

    plain = {
        "systems": {
            "engines": _module(
                "engines",
                summary="Start the port engine, then the starboard engine.",
                sections=[
                    {
                        "t": "Equipment Locations",
                        "type": "equipment_locations",
                        "rows": [
                            {"name": "Port engine", "location": "Port hull"},
                            {"name": "Starboard engine", "location": "Starboard hull"},
                        ],
                    }
                ],
            )
        }
    }
    check(tone_warnings(plain, {"has_safety_gear": True, "has_guest_location": False}) == [], "plain twin boat")
    recorded = tone_warnings(
        supernova, {"has_safety_gear": False, "has_guest_location": True}
    )
    check(
        not any("names life jacket" in hit for hit in recorded),
        "a recorded place keeps the gear warning quiet",
    )
    check(any("sleek" in hit for hit in recorded), "brochure words still warn")
    check(tone_warnings({"systems": {}}) == [], "sister-test shape has no hits")

    if failures:
        print(f"FAILED: {len(failures)}")
        for message in failures:
            print(f"  {message}")
        sys.exit(1)
    print("OK: tone warnings")


if __name__ == "__main__":
    main()
