"""Offline checks for guest pipeline-status withholding.

The live three-vessel scan (`--scan`) needs the database and is not part of
pipeline-verify.
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_guest_withhold import find_pipeline_status, withhold_pipeline_status

_HEADS_SUMMARY = (
    "On Supernova, 3 blackwater tank discharge valves are fitted and provide "
    "each tank's overboard discharge path — open a valve only when emptying "
    "the tanks at sea. Electric-head flush and waste rules for this section "
    "are still pending — heads model not yet confirmed."
)

_CONTROLS_PENDING = (
    "(Configuration pending) Exact Modes, Favourites shortcuts, and alarm "
    "details are not yet recorded for this installation; they will appear "
    "here once the CZone configuration or an owner screen walkthrough is "
    "available."
)


def _systems() -> dict:
    return {
        "anchoring": {
            "id": "anchoring",
            "title": "Anchoring",
            "subtitle": "Equipment not yet configured",
            "summary": (
                "Detailed information for this system is not available yet. "
                "Link the relevant equipment on the vessel configuration page, "
                "then regenerate this section."
            ),
            "sections": [
                {
                    "t": "Not yet available",
                    "type": "prose",
                    "c": (
                        "No equipment has been linked for this guide section "
                        "(expected categories: ground tackle and mooring). "
                        "This placeholder will be replaced when equipment is "
                        "configured and the section is regenerated."
                    ),
                }
            ],
        },
        "sails": {
            "id": "sails",
            "title": "Sails & rigging",
            "subtitle": "Equipment not yet configured",
            "summary": (
                "Detailed information for this system is not available yet. "
                "Link the relevant equipment on the vessel configuration page, "
                "then regenerate this section."
            ),
            "sections": [
                {
                    "t": "Not yet available",
                    "type": "prose",
                    "c": "This placeholder will be replaced when equipment is configured and the section is regenerated.",
                },
                {
                    "t": "Names of the lines",
                    "type": "prose",
                    "c": "What the halyards, sheets, and other lines are called is in the Seamanship section of this guide.",
                },
                {
                    "t": "Sails on this boat",
                    "type": "prose",
                    "c": "Sails on this boat: Main, Self-tacking jib, Code 0, Gennaker, A2, and S4.",
                },
            ],
        },
        "galley": {
            "id": "galley",
            "title": "Galley",
            "subtitle": "Equipment-specific content pending review",
            "summary": (
                "This vessel has a Klarstein Jet Set 2500 Tumble Dryer configured "
                "for the galley, but an approved equipment guide fragment is not "
                "yet available. An admin must draft content from the equipment "
                "manual and approve it before detailed procedures appear here."
            ),
            "sections": [
                {
                    "t": "Content pending",
                    "type": "prose",
                    "c": "An admin must draft content from the equipment manual and approve it.",
                }
            ],
        },
        "galley-rubbish": {
            "id": "galley",
            "title": "Galley",
            "subtitle": "Equipment-specific content pending review",
            "summary": (
                "An approved equipment guide fragment is not yet available. "
                "An admin must draft content from the equipment manual and approve it."
            ),
            "sections": [
                {
                    "t": "Content pending",
                    "type": "prose",
                    "c": (
                        "Equipment is linked (Klarstein Jet Set 2500 Tumble Dryer), but "
                        "model-specific guide content has not been approved yet. "
                        "Use Admin → Equipment registry → Draft from manual, review the fragment, "
                        "and approve it. Then regenerate this vessel's guide."
                    ),
                },
                {
                    "t": "Rubbish",
                    "type": "list",
                    "items": [
                        "Crush bottles and cans.",
                        "Never throw general rubbish into the sea.",
                    ],
                },
            ],
        },
        "heads": {
            "id": "heads",
            "title": "Heads & waste",
            "subtitle": "Blackwater valves and overboard discharge",
            "summary": _HEADS_SUMMARY,
            "sections": [
                {"t": "Discharge", "type": "prose", "c": "Open a valve only when emptying the tanks at sea."}
            ],
        },
        "controls": {
            "id": "controls",
            "title": "Controls and Monitoring",
            "summary": "Switching runs through the touchscreen.",
            "sections": [
                {
                    "t": "Modes",
                    "type": "prose",
                    "c": "Modes let you control several circuits with one action.\n\n" + _CONTROLS_PENDING,
                    "html": (
                        "<p>Modes let you control several circuits with one action.</p>"
                        f"<p>{_CONTROLS_PENDING}</p>"
                    ),
                }
            ],
        },
        "safety": {
            "id": "safety",
            "title": "Safety gear",
            "summary": "Life jackets are in the cockpit locker.",
            "sections": [
                {
                    "t": "Emergency contacts",
                    "type": "list",
                    "items": [
                        {"c": "Call the charter base on VHF."},
                        {
                            "c": (
                                "Emergency Contacts — details not yet available. "
                                "Configure equipment and regenerate this section."
                            )
                        },
                    ],
                }
            ],
        },
        "cattitude-sails": {
            "id": "sails",
            "title": "Sails & rigging",
            "subtitle": "Mainsail, furling jib, reefing, and travellers",
            "summary": "Cattitude has a sloop rig with a square-top mainsail and roller-furling genoa.",
            "sections": [
                {
                    "t": "Hoisting the Mainsail",
                    "type": "list",
                    "items": [
                        {"c": "Ease mainsheet and centre the traveller."},
                        {"c": "If the sail does not drop freely at the top, do not force the halyard down."},
                    ],
                }
            ],
        },
    }


def _check_anchoring_guest_layer(failures: list[str]) -> None:
    """A placeholder anchoring chapter stays once the guest layer has a body."""
    from content.assembler import apply_guest_layers

    snapshot = {
        "vessel": {"name": "Test", "slug": "test", "vessel_type": "sailing_catamaran"},
        "equipment": [
            {
                "manufacturer": "Generic",
                "model": "Windlass",
                "system_category": "ground_tackle_and_mooring",
            }
        ],
        "guide_context": {"guestFacts": {"hasTrampoline": True}},
    }
    placeholder = {
        "id": "anchoring",
        "title": "Anchoring",
        "subtitle": "Equipment not yet configured",
        "summary": (
            "Detailed information for this system is not available yet. "
            "Link the relevant equipment on the vessel configuration page, "
            "then regenerate this section."
        ),
        "sections": [
            {
                "t": "Not yet available",
                "type": "prose",
                "c": (
                    "No equipment has been linked for this guide section. "
                    "This placeholder will be replaced when equipment is "
                    "configured and the section is regenerated."
                ),
            }
        ],
    }
    layered = apply_guest_layers("anchoring", placeholder, snapshot)
    payload = {"systems": {"anchoring": layered}}
    messages = withhold_pipeline_status(payload)
    chapter = payload["systems"].get("anchoring")
    if not isinstance(chapter, dict):
        failures.append("anchoring guest layer was withheld with the placeholder")
        return
    titles = [section.get("t") for section in chapter.get("sections") or []]
    if titles != ["Anchoring, for guests"]:
        failures.append(f"anchoring guest chapter sections: {titles}")
    if chapter.get("summary") or chapter.get("subtitle"):
        failures.append(
            "anchoring guest chapter kept the placeholder summary or subtitle"
        )
    if not any("chapter stays" in message for message in messages):
        failures.append(f"anchoring guest chapter missing stay message: {messages}")
    if find_pipeline_status(chapter):
        failures.append(f"anchoring guest chapter still has status prose: {chapter}")


def _check() -> list[str]:
    failures: list[str] = []
    payload = {"systems": _systems()}
    messages = withhold_pipeline_status(payload)
    systems = payload["systems"]

    if "anchoring" in systems:
        failures.append("anchoring placeholder chapter was kept")
    if "galley" in systems:
        failures.append("galley pending-review chapter was kept")
    galley_rubbish = systems.get("galley-rubbish")
    if not galley_rubbish:
        failures.append("galley chapter with rubbish guidance was dropped")
    else:
        titles = [section.get("t") for section in galley_rubbish["sections"]]
        if titles != ["Rubbish"]:
            failures.append(f"galley-rubbish sections: {titles}")
        if galley_rubbish.get("subtitle") or galley_rubbish.get("summary"):
            failures.append("galley-rubbish kept pending subtitle or summary")
    if not any("Anchoring withheld" in message for message in messages):
        failures.append(f"missing anchoring withhold message: {messages}")
    if not any("Galley withheld" in message for message in messages):
        failures.append(f"missing galley withhold message: {messages}")

    sails = systems.get("sails")
    if not sails:
        failures.append("sails chapter dropped with the placeholder")
    else:
        if sails.get("subtitle") or sails.get("summary"):
            failures.append(f"sails kept placeholder subtitle/summary: {sails.get('subtitle')!r} {sails.get('summary')!r}")
        titles = [section.get("t") for section in sails["sections"]]
        if titles != ["Names of the lines", "Sails on this boat"]:
            failures.append(f"sails sections: {titles}")
        if not any("Sails & rigging" in message and "chapter stays" in message for message in messages):
            failures.append(f"missing sails trim message: {messages}")

    heads = systems["heads"]["summary"]
    if "heads model not yet confirmed" in heads:
        failures.append("heads pending sentence kept")
    if "overboard discharge path" not in heads:
        failures.append("heads valve sentence dropped")

    controls = systems["controls"]["sections"][0]
    if "Configuration pending" in controls["c"] or "Configuration pending" in controls["html"]:
        failures.append("controls pending paragraph kept")
    _check_anchoring_guest_layer(failures)

    if "several circuits" not in controls["c"] or "several circuits" not in controls["html"]:
        failures.append("controls real paragraph dropped")

    safety_items = systems["safety"]["sections"][0]["items"]
    if len(safety_items) != 1 or "VHF" not in safety_items[0]["c"]:
        failures.append(f"safety items: {safety_items}")

    cattitude = systems["cattitude-sails"]
    if cattitude["subtitle"] != "Mainsail, furling jib, reefing, and travellers":
        failures.append("cattitude sails subtitle changed")
    if len(cattitude["sections"][0]["items"]) != 2:
        failures.append("cattitude sails items changed")

    if find_pipeline_status(payload):
        failures.append(f"status phrases remain: {find_pipeline_status(payload)}")

    token_payload = {
        "systems": {
            "nav": {
                "title": "Navigation",
                "summary": "The chartplotter is at the helm.",
                "sections": [
                    {
                        "t": "Charts",
                        "type": "prose",
                        "c": "[[CONFIG_PENDING]] Exact chart layouts are not yet recorded.",
                    }
                ],
            }
        }
    }
    withhold_pipeline_status(token_payload)
    nav = token_payload["systems"]["nav"]["sections"]
    if nav:
        failures.append(f"config token section kept: {nav}")
    if "chartplotter" not in token_payload["systems"]["nav"]["summary"]:
        failures.append("nav summary dropped")

    return failures


def _scan() -> int:
    from guide_publish import assemble_publication
    from guide_service import fetch_vessel, get_engine

    engine = get_engine()
    failed = False
    with engine.connect() as conn:
        for slug in ("supernova", "sister-test", "cattitude"):
            vessel = fetch_vessel(slug)
            assembled = assemble_publication(conn, vessel["id"], slug)
            hits = find_pipeline_status(assembled["payload"])
            print(f"=== {slug} withheld={len(assembled['withheld'])} remaining={len(hits)} ===")
            for message in assembled["withheld"]:
                print(f"  {message}")
            for path, phrase in hits:
                failed = True
                print(f"  REMAINING [{phrase}] {path}")
    return 1 if failed else 0


def main() -> int:
    if "--scan" in sys.argv:
        return _scan()
    failures = _check()
    if failures:
        print(f"FAILED: {len(failures)}")
        for failure in failures:
            print(f"  {failure}")
        return 1
    print("OK: guest withhold strips status prose and keeps grounded chapters")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
