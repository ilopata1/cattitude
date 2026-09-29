"""Publish warnings for brochure wording and unrecorded safety gear.

Warnings do not block publish and do not change the guest text.
"""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from guide_context_utils import merge_guide_context
from guide_learn_checks import _twin_machinery

# Word or phrase, case-insensitive. "experience" does not match "experienced".
_BANNED = (
    (re.compile(r"\bsleek\b", re.I), "sleek"),
    (re.compile(r"\bluxury\b", re.I), "luxury"),
    (re.compile(r"\bexperience\b", re.I), "experience"),
    (re.compile(r"\bversatile\b", re.I), "versatile"),
    (re.compile(r"\bnot provided\b", re.I), "not provided"),
    (re.compile(r"\bif applicable\b", re.I), "if applicable"),
    (re.compile(r"\bfamiliarize yourself\b", re.I), "familiarize yourself"),
)
_ENGINE_ROOM = re.compile(r"\bthe engine room\b", re.I)
_UNRECORDED_GEAR = (
    (re.compile(r"\bfire extinguishers?\b", re.I), "fire extinguisher"),
    (re.compile(r"\bepirb\b", re.I), "EPIRB"),
    (re.compile(r"\bflares?\b", re.I), "flare"),
    (re.compile(r"\blife jackets?\b", re.I), "life jacket"),
)


def _snippet(text: str) -> str:
    compact = " ".join(text.split())
    if len(compact) > 140:
        return compact[:137] + "…"
    return compact


def _walk_module(module: dict[str, Any]):
    for key in ("title", "subtitle", "summary"):
        value = module.get(key)
        if isinstance(value, str) and value.strip():
            yield value
    for section in module.get("sections") or []:
        if not isinstance(section, dict) or section.get("type") == "photo":
            continue
        title = section.get("t")
        if isinstance(title, str) and title.strip():
            yield title
        prose = section.get("c")
        if isinstance(prose, str) and prose.strip():
            yield prose
        for item in section.get("items") or []:
            if isinstance(item, str) and item.strip():
                yield item
            elif isinstance(item, dict):
                text = item.get("c") or item.get("text")
                if isinstance(text, str) and text.strip():
                    yield text
    for check in module.get("learnChecks") or []:
        if isinstance(check, str) and check.strip():
            yield check
        elif isinstance(check, dict):
            text = check.get("text") or check.get("c")
            if isinstance(text, str) and text.strip():
                yield text


def tone_warnings(payload: dict[str, Any], grounding: dict[str, Any] | None = None) -> list[str]:
    """Brochure phrases, a shared engine room on a twin boat, and unrecorded safety gear."""
    systems = payload.get("systems") or {}
    if not isinstance(systems, dict):
        return []
    twin = _twin_machinery(systems.get("engines"))
    recorded = False
    if isinstance(grounding, dict):
        recorded = bool(grounding.get("has_safety_gear") or grounding.get("has_guest_location"))
    warnings: list[str] = []
    for system_id, module in systems.items():
        if not isinstance(module, dict):
            continue
        for text in _walk_module(module):
            for pattern, label in _BANNED:
                if pattern.search(text):
                    warnings.append(
                        f"{system_id} contains “{label}”: {_snippet(text)}"
                    )
            if twin and _ENGINE_ROOM.search(text):
                warnings.append(
                    f"{system_id} says “the engine room” on a twin-engine boat: {_snippet(text)}"
                )
            if isinstance(grounding, dict) and not recorded:
                for pattern, label in _UNRECORDED_GEAR:
                    if pattern.search(text):
                        warnings.append(
                            f"{system_id} names {label}, which is not on this boat’s record: {_snippet(text)}"
                        )
    return warnings


def _json_object(value: Any) -> dict[str, Any]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return {}
    return value if isinstance(value, dict) else {}


def _guest_facts(conn: Connection, vessel_id: str) -> dict[str, Any]:
    row = conn.execute(
        text(
            """
            SELECT cob.guide_context, v.guide_context
            FROM vessels v
            LEFT JOIN charter_operating_bases cob
                ON cob.id = v.charter_operating_base_id
            WHERE v.id = :vessel_id
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchone()
    if row is None:
        return {}
    base = _json_object(row[0])
    vessel = _json_object(row[1])
    merged = merge_guide_context(base, vessel)
    facts = merged.get("guestFacts") if isinstance(merged, dict) else None
    return facts if isinstance(facts, dict) else {}


def _has_guest_location(facts: dict[str, Any]) -> bool:
    raft = facts.get("lifeRaft")
    if isinstance(raft, dict) and str(raft.get("location") or "").strip():
        return True
    bilge = facts.get("manualBilge")
    if isinstance(bilge, dict) and str(bilge.get("location") or "").strip():
        return True
    ladders = facts.get("swimLadders")
    if isinstance(ladders, list):
        for item in ladders:
            if isinstance(item, dict) and str(item.get("location") or "").strip():
                return True
    return False


def load_tone_grounding(conn: Connection, vessel_id: str) -> dict[str, Any]:
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT e.system_category
            FROM vessel_equipment ve
            JOIN equipment e ON e.id = ve.equipment_id
            WHERE ve.vessel_id = :vessel_id
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchall()
    categories = {str(row[0]) for row in rows if row and row[0]}
    facts = _guest_facts(conn, vessel_id)
    return {
        "has_safety_gear": "safety_and_emergency_equipment" in categories,
        "has_guest_location": _has_guest_location(facts),
    }
