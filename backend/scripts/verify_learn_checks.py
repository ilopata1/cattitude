"""Offline checks for publish-time Learn check rewriting."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from guide_learn_checks import filter_generated_learn_checks, rewrite_learn_checks


def _payload() -> dict:
    operating_html = (
        "<p>The ACR Manual Control Override Knob takes manual control of bank "
        "combine and isolate. Use it when:</p><ul><li>you need to combine "
        "battery banks manually</li></ul>"
    )
    return {
        "systems": {
            "engines": {
                "id": "engines",
                "sections": [
                    {
                        "t": "Equipment Locations",
                        "type": "equipment_locations",
                        "rows": [
                            {
                                "name": "Nanni N4.65",
                                "location": "Port – Engine / Machinery Space – Engine Bay",
                            },
                            {
                                "name": "",
                                "location": "Starboard – Engine / Machinery Space – Engine Bay",
                            },
                        ],
                    },
                    {
                        "t": "Turning it on",
                        "type": "prose",
                        "c": (
                            "Start each engine from the Nanni instrument panel with the "
                            "control lever in neutral, then confirm raw water flows from "
                            "the exhaust outlet once the engine is running."
                        ),
                    },
                ],
                "learnChecks": [
                    "Can explain in one sentence what this system does on this boat",
                    "Know how to turn this system on and shut it down safely",
                ],
            },
            "electrical": {
                "id": "electrical",
                "sections": [
                    {"t": "Operating", "type": "prose", "html": operating_html},
                ],
                "learnChecks": [
                    "Can perform the main operating actions described in this chapter",
                    "Switched off something that was not in use",
                ],
            },
            "overview": {
                "id": "overview",
                "sections": [],
                "learnChecks": [
                    "Familiarize yourself with the saloon area for relaxation and dining.",
                    "Check the engine room for the lithium house battery bank and generator.",
                    "Locate the cockpit and helm for navigation.",
                    "Understood: AC requires shore power or generator — cannot run on battery",
                ],
            },
            "galley": {
                "id": "galley",
                "sections": [],
                "learnChecks": [
                    "Identify the location of the Klarstein Jet Set 2500 Tumble Dryer.",
                    "Familiarize yourself with the use of propane, if applicable.",
                    {"key": "galley/rubbish", "text": "Found where rubbish and recycling go"},
                ],
            },
            "sails": {"id": "sails", "sections": [], "learnChecks": []},
            "water": {
                "id": "water",
                "sections": [
                    {
                        "t": "Turning it on",
                        "type": "prose",
                        "audience": "crew",
                        "c": "Start the watermaker from the panel in the engine compartment.",
                    },
                    {
                        "t": "Monitoring",
                        "type": "prose",
                        "c": "Watch the tank gauges while the watermaker is producing.",
                    },
                ],
                "learnChecks": [
                    "Know how to turn this system on and shut it down safely",
                ],
            },
        }
    }


def _check() -> list[str]:
    failures: list[str] = []
    payload = _payload()
    rewrite_learn_checks(payload)
    systems = payload["systems"]

    engines = systems["engines"]["learnChecks"]
    if any("one sentence" in item["text"] or item["text"].startswith("Know how") for item in engines):
        failures.append(f"boilerplate survived on engines: {engines}")
    if len(engines) != 3:
        failures.append(f"engines should have two places and the start sentence: {engines}")
    else:
        if engines[0]["text"] != (
            "Nanni N4.65 found at Port – Engine / Machinery Space – Engine Bay"
        ):
            failures.append(f"port location text: {engines[0]}")
        if "Starboard" not in engines[1]["text"] or not engines[1]["text"].startswith("Nanni N4.65 found at"):
            failures.append(f"blank name did not keep the equipment: {engines[1]}")
        if engines[2]["key"] != "engines/startup":
            failures.append(f"startup key: {engines[2]}")
        if not engines[2]["text"].startswith("Start each engine"):
            failures.append(f"startup text: {engines[2]}")
        location_key = engines[0]["key"]

    electrical = systems["electrical"]["learnChecks"]
    operating = [item for item in electrical if item["key"] == "electrical/operating"]
    if len(operating) != 1 or "ACR Manual Control Override Knob" not in operating[0]["text"]:
        failures.append(f"folded Operating html was not used: {electrical}")
    if operating and "combine battery banks" in operating[0]["text"]:
        failures.append("operating check included the list after the first sentence")
    if not any(item["text"] == "Switched off something that was not in use" for item in electrical):
        failures.append(f"guest check was dropped: {electrical}")

    overview = [item["text"] for item in systems["overview"]["learnChecks"]]
    if any(text.startswith("Familiarize") or "engine room" in text.casefold() for text in overview):
        failures.append(f"overview kept a vague or engine-room check: {overview}")
    if "Locate the cockpit and helm for navigation." not in overview:
        failures.append(f"overview dropped a concrete check: {overview}")
    if not any(text.startswith("Understood:") for text in overview):
        failures.append(f"Understood check was rejected: {overview}")

    galley = systems["galley"]["learnChecks"]
    if len(galley) != 1 or galley[0]["key"] != "galley/rubbish":
        failures.append(f"galley should keep only the keyed rubbish check: {galley}")

    if "learnChecks" in systems["sails"]:
        failures.append("empty learnChecks should be removed")

    water = systems["water"].get("learnChecks") or []
    if any(item.get("key") == "water/startup" for item in water):
        failures.append(f"crew Turning it on produced a startup learn check: {water}")
    if any("watermaker from the panel" in item.get("text", "") for item in water):
        failures.append(f"crew startup sentence was used as a learn check: {water}")
    monitoring = [item for item in water if item.get("key") == "water/monitoring"]
    if len(monitoring) != 1 or not monitoring[0]["text"].startswith("Watch the tank gauges"):
        failures.append(f"guest Monitoring check missing: {water}")

    payload["systems"]["engines"]["sections"][1]["c"] = "Start each engine from the panel."
    rewrite_learn_checks(payload)
    again = payload["systems"]["engines"]["learnChecks"]
    if again[0]["key"] != location_key:
        failures.append("location key changed when the start sentence changed")
    if again[2]["key"] != "engines/startup" or again[2]["text"] != "Start each engine from the panel.":
        failures.append(f"startup check did not follow the new sentence: {again[2]}")

    solo = {
        "systems": {
            "overview": {
                "sections": [],
                "learnChecks": [
                    "Check the engine room for the lithium house battery bank and generator.",
                ],
            }
        }
    }
    rewrite_learn_checks(solo)
    kept_room = solo["systems"]["overview"].get("learnChecks") or []
    if not kept_room or "engine room" not in kept_room[0]["text"]:
        failures.append("engine-room check was dropped without twin machinery locations")

    generated = filter_generated_learn_checks(
        [
            "Familiarize yourself with the use of propane, if applicable.",
            "Identify the location of the Klarstein Jet Set 2500 Tumble Dryer.",
            "Locate the cockpit and helm for navigation.",
        ]
    )
    if generated != ["Locate the cockpit and helm for navigation."]:
        failures.append(f"generation filter: {generated}")

    return failures


def main() -> int:
    failures = _check()
    if failures:
        print(f"FAILED: {len(failures)}")
        for failure in failures:
            print(f"  {failure}")
        return 1
    print("OK: learn checks are specific, keyed, and boilerplate is dropped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
