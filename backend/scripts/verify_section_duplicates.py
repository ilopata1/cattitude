"""Checks for consecutive section folding and duplicate warnings.

``--scan`` reads the database and is not part of pipeline-verify.
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_section_duplicates import duplicate_warnings, fold_consecutive_sections


def _payload() -> dict:
    return {
        "systems": {
            "electrical": {
                "title": "Electrical Panel",
                "sections": [
                    {"t": "How it works", "type": "prose", "c": "Distribution is protected."},
                    {
                        "t": "Operating",
                        "type": "prose",
                        "c": "The ACR Manual Control Override Knob takes manual control. Use it when:",
                    },
                    {
                        "t": "Operating",
                        "type": "list",
                        "items": [
                            "you need to combine battery banks manually",
                            "remote operation must be blocked",
                            "the ACR must be secured for servicing",
                        ],
                    },
                    {
                        "t": "Operating",
                        "type": "prose",
                        "c": "Use the local rotary isolation switch when that battery connection must be disconnected.",
                    },
                    {"t": "Care & upkeep", "type": "prose", "c": "The busbar distributes power."},
                ],
            },
            "overview": {
                "title": "Overview",
                "sections": [
                    {"t": "Layout", "type": "list", "items": ["Cockpit", "Saloon"]},
                    {"t": "Trampoline", "type": "list", "items": ["Do not bounce on it."]},
                    {"t": "Layout", "type": "photo", "html": "<img alt='layout'>"},
                ],
            },
            "controls": {
                "title": "Controls",
                "sections": [
                    {
                        "t": "Operating",
                        "type": "prose",
                        "audience": "crew",
                        "c": "Open the breaker before you service the panel.",
                    },
                    {
                        "t": "Operating",
                        "type": "prose",
                        "c": "Ask the skipper before you change a favourite.",
                    },
                    {
                        "t": "Operating",
                        "type": "prose",
                        "audience": "crew",
                        "c": "Switch the inverter off at the panel.",
                    },
                    {
                        "t": "Operating",
                        "type": "list",
                        "audience": "crew",
                        "items": ["Wait until the light goes out."],
                    },
                ],
            },
            "anchoring": {
                "title": "Anchoring",
                "sections": [
                    {"t": "Quick QNC CHC Chain Counter", "type": "photo", "html": "<img>"},
                    {"t": "Reading the Display", "type": "steps", "items": ["Read the metres."]},
                    {
                        "t": "Resetting the Counter to 0.0",
                        "type": "steps",
                        "items": ["Hold the centre button."],
                    },
                    {"t": "Notes", "type": "notes", "items": ["Sand holds well."]},
                    {
                        "t": "Quick QNC CHC Chain Counter",
                        "type": "prose",
                        "c": "A chain counter is mounted at the bow.",
                    },
                    {
                        "t": "Resetting to 0.0 ft",
                        "type": "steps",
                        "items": ["Zero the display."],
                    },
                ]
                + [
                    {"t": f"Extra {index}", "type": "prose", "c": "More."}
                    for index in range(10)
                ],
                "learnChecks": [
                    "Evacuation valves located in all five heads",
                    "Evacuation valves found (in each shower hatch)",
                ],
            },
        }
    }


def _check() -> list[str]:
    failures: list[str] = []
    payload = _payload()
    fold_consecutive_sections(payload)
    operating = [
        section
        for section in payload["systems"]["electrical"]["sections"]
        if section.get("t") == "Operating"
    ]
    if len(operating) != 1:
        failures.append(f"Operating was not folded: {len(operating)}")
    else:
        body = operating[0].get("html") or ""
        if "Use it when:" not in body or "combine battery banks" not in body:
            failures.append(f"Operating lost the intro or the list: {body}")
        if body.find("Use it when:") > body.find("combine battery banks"):
            failures.append("Operating list moved ahead of the intro")
        if body.find("combine battery banks") > body.find("rotary isolation switch"):
            failures.append("Operating list moved after the rotary-switch sentence")
        if operating[0].get("items"):
            failures.append("folded Operating still has items beside the html")
    controls = payload["systems"]["controls"]["sections"]
    if len(controls) != 3:
        failures.append(f"crew and guest Operating were folded together: {len(controls)}")
    elif controls[0].get("audience") != "crew" or "audience" in controls[1]:
        failures.append(f"Operating audience changed across the fold boundary: {controls[:2]}")
    elif controls[2].get("audience") != "crew" or "Wait until the light goes out" not in (
        controls[2].get("html") or ""
    ):
        failures.append(f"folded crew Operating lost its audience or body: {controls[2]}")
    if any(section.get("t") == "photo" for section in []):
        pass
    layout = [section.get("type") for section in payload["systems"]["overview"]["sections"] if section.get("t") == "Layout"]
    if layout != ["list", "photo"]:
        failures.append(f"Layout photo was folded into the list: {layout}")
    chain = [
        section.get("type")
        for section in payload["systems"]["anchoring"]["sections"]
        if section.get("t") == "Quick QNC CHC Chain Counter"
    ]
    if chain != ["photo", "prose"]:
        failures.append(f"chain counter sections were rewritten: {chain}")

    warnings = duplicate_warnings(payload)
    text = "\n".join(warnings)
    if any(
        message.startswith("Electrical Panel:") and "Operating" in message for message in warnings
    ):
        failures.append(f"folded Operating still warned: {warnings}")
    if "Layout" not in text:
        failures.append(f"Layout duplicate was not reported: {warnings}")
    if "Chain Counter" not in text and "chain counter" not in text.lower():
        failures.append(f"chain counter duplicate was not reported: {warnings}")
    if "Resetting" not in text:
        failures.append(f"resetting near-duplicate was not reported: {warnings}")
    if "Evacuation valves" not in text:
        failures.append(f"evacuation checks were not reported: {warnings}")
    if "Reading the Display" in text:
        failures.append("unique Reading the Display was reported")
    if not any(message.startswith("Anchoring: 16 sections") for message in warnings):
        failures.append(f"oversized anchoring was not reported: {warnings}")
    return failures


def _scan() -> int:
    from guide_publish import assemble_publication
    from guide_service import fetch_vessel, get_engine

    engine = get_engine()
    with engine.connect() as conn:
        for slug in ("supernova", "sister-test", "cattitude"):
            vessel = fetch_vessel(slug)
            assembled = assemble_publication(conn, vessel["id"], slug)
            systems = assembled["payload"]["systems"]
            operating = [
                section.get("t")
                for section in (systems.get("electrical") or {}).get("sections") or []
                if str(section.get("t") or "").casefold() == "operating"
            ]
            print(f"=== {slug} duplicates={len(assembled['duplicates'])} operating={operating} ===")
            for message in assembled["duplicates"]:
                print(f"  {message}")
    return 0


def main() -> int:
    if "--scan" in sys.argv:
        return _scan()
    failures = _check()
    if failures:
        print(f"FAILED: {len(failures)}")
        for failure in failures:
            print(f"  {failure}")
        return 1
    print("OK: consecutive same-title sections fold, and other duplicates are reported")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
