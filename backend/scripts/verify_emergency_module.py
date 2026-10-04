"""Region-pack rescue contacts merge into the emergency module without duplicates."""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from content.slots import sar_contact_line  # noqa: E402
from guide_template_assembly import build_emergency_module  # noqa: E402

FAILURES: list[str] = []

_DSC_PLAIN = (
    "If the radio has a red DISTRESS button, lift its cover and hold the button "
    "for five seconds, then speak"
)
_DSC_NAMED = (
    "If the radio has a red DISTRESS button on the fixed VHF at the nav station, "
    "lift its cover and hold the button for five seconds, then speak"
)


def check(condition: bool, message: str) -> None:
    if not condition:
        FAILURES.append(message)


def test_sar_merge() -> None:
    france = build_emergency_module(
        {
            "vessel": {"name": "Test"},
            "guide_context": {"countryCode": "FR"},
        }
    )
    labels = [contact["label"] for contact in france["contacts"]]
    check("CROSS (coastguard)" in labels, f"FR missing CROSS: {labels}")
    check(
        any(contact.get("tel") == "112" for contact in france["contacts"]),
        f"FR missing 112: {france['contacts']}",
    )
    check(labels.count("CROSS (coastguard)") == 1, "FR duplicated CROSS")
    check(
        all("audience" not in contact for contact in france["contacts"]),
        "pack contacts published an audience",
    )

    mixed = build_emergency_module(
        {
            "vessel": {"name": "Test"},
            "guide_context": {
                "countryCode": "fr",
                "emergencyContacts": [
                    {
                        "label": "cross (coastguard)",
                        "value": "VHF 16",
                        "action": "vhf",
                    },
                    {
                        "label": "Insurer",
                        "value": "555",
                        "tel": "555",
                        "action": "call",
                        "audience": "crew",
                    },
                ],
            },
        }
    )
    mixed_labels = [contact["label"] for contact in mixed["contacts"]]
    cross_count = sum(
        1 for label in mixed_labels if label.casefold() == "cross (coastguard)"
    )
    check(cross_count == 1, f"CROSS was duplicated: {mixed_labels}")
    check(mixed_labels[0] == "cross (coastguard)", "admin contacts should stay first")
    check("European emergency" in mixed_labels, "FR still adds 112 when CROSS is already listed")
    insurer = next(contact for contact in mixed["contacts"] if contact["label"] == "Insurer")
    check(insurer.get("audience") == "crew", "crew admin contact lost its audience")
    european = next(
        contact for contact in mixed["contacts"] if contact["label"] == "European emergency"
    )
    check("audience" not in european, "appended pack contact was tagged")

    unknown = build_emergency_module(
        {
            "vessel": {"name": "Test"},
            "guide_context": {
                "countryCode": "ZZ",
                "emergencyContacts": [{"label": "Yard", "value": "72", "action": "vhf"}],
            },
        }
    )
    check(
        [contact["label"] for contact in unknown["contacts"]] == ["Yard"],
        "unknown country appended a pack contact",
    )

    check(
        sar_contact_line({"guide_context": {"countryCode": "FR"}})
        == "Call CROSS (coastguard) on VHF 16 or 196.",
        "FR rescue line",
    )
    check(
        sar_contact_line({"guide_context": {}}) == "Call for help on VHF channel 16.",
        "missing country falls back to VHF 16",
    )


def test_mayday_names_the_radio() -> None:
    plain = build_emergency_module(
        {"vessel": {"name": "Cleo"}, "guide_context": {}}
    )
    steps = plain["mayday"]["steps"]
    check(steps[0].startswith("Tune VHF to Channel 16"), f"first step: {steps[0]!r}")
    check(steps[1] == _DSC_PLAIN, f"plain DSC step: {steps[1]!r}")
    check(sum("DISTRESS" in step for step in steps) == 1, "both DSC lines were kept")
    check(any("Cleo" in step for step in steps), "callsign was not filled in")

    named = build_emergency_module(
        {
            "vessel": {"name": "Cleo"},
            "guide_context": {
                "guestFacts": {"vhfDsc": {"location": "the fixed VHF at the nav station"}},
            },
        }
    )
    named_steps = named["mayday"]["steps"]
    check(named_steps[1] == _DSC_NAMED, f"named DSC step: {named_steps[1]!r}")
    check(sum("DISTRESS" in step for step in named_steps) == 1, "named card kept both DSC lines")


def main() -> None:
    test_sar_merge()
    test_mayday_names_the_radio()
    if FAILURES:
        print(f"FAILED: {len(FAILURES)}")
        for message in FAILURES:
            print(f"  {message}")
        sys.exit(1)
    print("OK: emergency module")


if __name__ == "__main__":
    main()
