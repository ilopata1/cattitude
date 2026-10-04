"""Deterministic template-assembly text loaded from backend/prompts/guide/assembly/."""

from __future__ import annotations

from prompts.loader import load_prompt_lines, load_prompt_text

MAYDAY_CHANNEL = load_prompt_text("guide/assembly/mayday_channel.txt")


def mayday_steps(callsign: str, dsc_location: str = "") -> list[str]:
    """Spoken MAYDAY steps. The distress-button line names the radio when known."""
    location = dsc_location.strip()
    steps: list[str] = []
    for line in load_prompt_lines("guide/assembly/mayday_steps.txt"):
        if line.startswith("If the radio has a red DISTRESS button"):
            names_radio = "{dsc_location}" in line
            if names_radio != bool(location):
                continue
        steps.append(line.format(callsign=callsign, dsc_location=location))
    return steps
