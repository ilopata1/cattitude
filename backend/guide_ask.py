"""Ask suggestion chips from a vessel's published system chapters.

Same rules as mobile/src/app/core/guide/ask-suggestions.ts. Titles come from
the guide. A chapter that does not exist on this boat is skipped.
"""

from __future__ import annotations

from typing import Any

_ORDER: tuple[str, ...] = (
    "engines",
    "electrical",
    "water",
    "sails",
    "nav",
    "batteries",
    "anchoring",
    "galley",
    "heads",
    "dinghy",
    "ac",
    "controls",
)

_FALLBACK: dict[str, str] = {
    "engines": "engine",
    "electrical": "electrical panel",
    "water": "water system",
    "sails": "sails",
    "nav": "navigation instruments",
    "batteries": "batteries",
    "anchoring": "windlass",
    "galley": "galley",
    "heads": "heads",
    "dinghy": "tender",
    "ac": "air conditioning",
    "controls": "switching panel",
}

_PATTERN: dict[str, str] = {
    "engines": "How do I start the {name}?",
    "electrical": "Where is the {name}?",
    "water": "How does the {name} work?",
    "sails": "How do I handle the {name}?",
    "nav": "How do I use the {name}?",
    "batteries": "How do I check the {name}?",
    "anchoring": "How do I use the {name}?",
    "galley": "How does the {name} work?",
    "heads": "How does the {name} work?",
    "dinghy": "How do I launch the {name}?",
    "ac": "How does the {name} work?",
    "controls": "Where is the {name}?",
}


def suggestion_name(title: str, fallback: str) -> str:
    """Use a short chapter title. Compound review titles stay on the generic name."""
    text = title.strip()
    words = text.split()
    if not text or len(words) > 3 or len(text) > 32 or any(mark in text for mark in "&/—–"):
        return fallback
    parts: list[str] = []
    for word in words:
        if len(word) > 1 and word.isupper():
            parts.append(word)
        else:
            parts.append(word.lower())
    return " ".join(parts)


def build_ask_suggestions(systems: dict[str, Any] | None, *, limit: int = 3) -> list[str]:
    if not isinstance(systems, dict):
        return []
    out: list[str] = []
    for system_id in _ORDER:
        system = systems.get(system_id)
        if not isinstance(system, dict):
            continue
        name = suggestion_name(str(system.get("title") or ""), _FALLBACK[system_id])
        question = _PATTERN[system_id].format(name=name)
        if question not in out:
            out.append(question)
        if len(out) >= limit:
            break
    return out
