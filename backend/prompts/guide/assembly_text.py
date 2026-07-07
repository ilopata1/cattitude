"""Deterministic template-assembly text loaded from backend/prompts/guide/assembly/."""

from __future__ import annotations

from prompts.loader import load_prompt_lines, load_prompt_text

MAYDAY_CHANNEL = load_prompt_text("guide/assembly/mayday_channel.txt")


def mayday_steps(callsign: str) -> list[str]:
    return [
        line.format(callsign=callsign)
        for line in load_prompt_lines("guide/assembly/mayday_steps.txt")
    ]
