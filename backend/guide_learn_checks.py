"""Replace boilerplate Learn checks in the guest payload.

Stage 4 still stores one generic sentence per heading. Publish builds a short
checklist from equipment-location rows and the turn-on, monitoring, and
operating sentences already in the module. Stored modules and the Stage 4
oracle are left as they are.
"""

from __future__ import annotations

import html
import re
from typing import Any

_BOILERPLATE = frozenset(
    {
        "can explain in one sentence what this system does on this boat",
        "know how to turn this system on and shut it down safely",
        "know where to read status, meters, or alerts for this system",
        "can perform the main operating actions described in this chapter",
        "know the first checks to run when something looks wrong",
        "know the care or isolation points called out for this system",
        "know how to check solar charge production on this boat",
    }
)

# Leading "understand " keeps Cattitude's "Understood:" checks.
_VAGUE_PREFIXES = (
    "familiarize yourself",
    "understand ",
    "know how",
    "know where",
    "know the",
    "can explain",
    "can perform",
    "be aware",
    "learn the",
    "recognize the importance",
    "identify the location of",
)
_HEDGES = ("if applicable", "if fitted", "if installed")

_ACTION_SECTIONS = (
    ("Turning it on", "startup"),
    ("Monitoring", "monitoring"),
    ("Operating", "operating"),
)
_DERIVED_CAP = 5
_TAG_RE = re.compile(r"<[^>]+>")
_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


def check_text(check: Any) -> str:
    if isinstance(check, str):
        return check.strip()
    if isinstance(check, dict):
        return str(check.get("text") or check.get("c") or "").strip()
    return ""


def slug_text(text: str) -> str:
    """Slug shared with the app. A string check's tick key is systemId/this slug."""
    slug = re.sub(r"[^a-z0-9]+", "-", text.casefold()).strip("-")
    return slug or "check"


def filter_generated_learn_checks(checks: list[Any]) -> list[Any]:
    """Drop vague or hedged checks before a generated module is stored.

    The engine-room rule needs the whole publication, so it runs at publish.
    """
    kept: list[Any] = []
    seen: set[str] = set()
    for check in checks:
        text = check_text(check)
        folded = _fold(text)
        if not text or folded in seen or is_boilerplate(text) or is_vague(text):
            continue
        seen.add(folded)
        kept.append(check)
    return kept


def rewrite_learn_checks(payload: dict[str, Any]) -> None:
    """Replace each system's learnChecks in ``payload`` in place."""
    systems = payload.get("systems")
    if not isinstance(systems, dict):
        return
    twin_machinery = _twin_machinery(systems.get("engines"))
    for system_id, module in systems.items():
        if not isinstance(module, dict):
            continue
        sid = str(system_id)
        derived = _derived_checks(sid, module, twin_machinery=twin_machinery)
        seen = {_fold(item["text"]) for item in derived}
        kept = _kept_checks(sid, module, twin_machinery=twin_machinery, seen=seen)
        checks = _unique_keys(derived + kept)
        if checks:
            module["learnChecks"] = checks
        else:
            module.pop("learnChecks", None)


def is_boilerplate(text: str) -> bool:
    return _fold(text) in _BOILERPLATE


def is_vague(text: str) -> bool:
    folded = _fold(text)
    if not folded:
        return False
    if any(folded.startswith(prefix) for prefix in _VAGUE_PREFIXES):
        return True
    return any(hedge in folded for hedge in _HEDGES)


def _fold(text: str) -> str:
    return " ".join(text.split()).casefold()


def _twin_machinery(engines: Any) -> bool:
    if not isinstance(engines, dict):
        return False
    locations: list[str] = []
    for section in engines.get("sections") or []:
        if not isinstance(section, dict):
            continue
        if section.get("type") != "equipment_locations" and section.get("t") != "Equipment Locations":
            continue
        for row in section.get("rows") or []:
            if isinstance(row, dict):
                locations.append(str(row.get("location") or ""))
    has_port = any(re.search(r"\bport\b", place, re.IGNORECASE) for place in locations)
    has_starboard = any(
        re.search(r"\bstarboard\b", place, re.IGNORECASE) for place in locations
    )
    return has_port and has_starboard


def _rejected(text: str, *, twin_machinery: bool) -> bool:
    if is_boilerplate(text) or is_vague(text):
        return True
    return twin_machinery and "the engine room" in _fold(text)


def _derived_checks(
    system_id: str, module: dict[str, Any], *, twin_machinery: bool
) -> list[dict[str, str]]:
    checks: list[dict[str, str]] = []
    for text, key in _location_facts(system_id, module) + _action_facts(system_id, module):
        if len(checks) >= _DERIVED_CAP:
            break
        if not text or _rejected(text, twin_machinery=twin_machinery):
            continue
        checks.append({"key": key, "text": text})
    return checks


def _location_facts(system_id: str, module: dict[str, Any]) -> list[tuple[str, str]]:
    facts: list[tuple[str, str]] = []
    current_name = ""
    for section in module.get("sections") or []:
        if not isinstance(section, dict):
            continue
        if section.get("type") != "equipment_locations" and section.get("t") != "Equipment Locations":
            continue
        for row in section.get("rows") or []:
            if not isinstance(row, dict):
                continue
            name = str(row.get("name") or "").strip()
            location = str(row.get("location") or "").strip()
            if name:
                current_name = name
            if not current_name or not location:
                continue
            text = f"{current_name} found at {location}"
            key = f"{system_id}/found/{slug_text(current_name)}/{slug_text(location)}"
            facts.append((text, key))
    return facts


def _action_facts(system_id: str, module: dict[str, Any]) -> list[tuple[str, str]]:
    facts: list[tuple[str, str]] = []
    sections = [section for section in (module.get("sections") or []) if isinstance(section, dict)]
    for title, action_key in _ACTION_SECTIONS:
        for section in sections:
            if section.get("t") != title:
                continue
            if section.get("audience") == "crew":
                continue
            sentence = _first_sentence(_plain_section(section))
            if sentence:
                facts.append((sentence, f"{system_id}/{action_key}"))
            break
    return facts


def _kept_checks(
    system_id: str,
    module: dict[str, Any],
    *,
    twin_machinery: bool,
    seen: set[str],
) -> list[dict[str, str]]:
    kept: list[dict[str, str]] = []
    for check in module.get("learnChecks") or []:
        text = check_text(check)
        folded = _fold(text)
        if not text or folded in seen or _rejected(text, twin_machinery=twin_machinery):
            continue
        key = ""
        if isinstance(check, dict):
            key = str(check.get("key") or "").strip()
        if not key:
            key = f"{system_id}/{slug_text(text)}"
        kept.append({"key": key, "text": text})
        seen.add(folded)
    return kept


def _unique_keys(checks: list[dict[str, str]]) -> list[dict[str, str]]:
    used: set[str] = set()
    unique: list[dict[str, str]] = []
    for check in checks:
        key = check["key"]
        if key in used:
            suffix = 2
            while f"{key}-{suffix}" in used:
                suffix += 1
            key = f"{key}-{suffix}"
        used.add(key)
        unique.append({"key": key, "text": check["text"]})
    return unique


def _plain_section(section: dict[str, Any]) -> str:
    prose = section.get("c")
    if isinstance(prose, str) and prose.strip():
        return prose.strip()
    raw = section.get("html")
    if not isinstance(raw, str) or not raw.strip():
        return ""
    return " ".join(html.unescape(_TAG_RE.sub(" ", raw)).split())


def _first_sentence(text: str) -> str:
    paragraph = " ".join(text.split("\n\n", 1)[0].split())
    if not paragraph:
        return ""
    return _SENTENCE_RE.split(paragraph, maxsplit=1)[0].strip()
