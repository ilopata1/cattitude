"""Drop checklist items and fix cards the published guide cannot support.

Runs after pipeline-status withhold, so a withheld chapter is already gone.
Profile gates (charter, breaker, engine count) are applied when the library
module is built. This pass only removes entries tagged requiresSystem, and
warns when a generator card has no chapter that teaches the start procedure.
"""

from __future__ import annotations

import re
from typing import Any

from guide_module_catalog import SYSTEM_CATALOG

_GENERATOR_RE = re.compile(r"generator", re.I)


def _system_label(system_id: str) -> str:
    meta = SYSTEM_CATALOG.get(system_id) or {}
    return str(meta.get("review_title") or system_id)


def _chapter_teaches_generator(systems: dict[str, Any]) -> bool:
    for system in systems.values():
        if not isinstance(system, dict):
            continue
        for section in system.get("sections") or []:
            if not isinstance(section, dict):
                continue
            if section.get("type") == "equipment_locations":
                continue
            if _GENERATOR_RE.search(str(section.get("t") or "")):
                return True
    return False


def apply_publish_consistency(payload: dict[str, Any]) -> list[str]:
    """Mutate payload. Return admin warnings. Does not block publish."""
    systems = payload.get("systems") or {}
    if not isinstance(systems, dict):
        systems = {}
    published = set(systems.keys())
    warnings: list[str] = []

    checklists = payload.get("checklists") or {}
    if isinstance(checklists, dict):
        for checklist in checklists.values():
            if not isinstance(checklist, dict):
                continue
            groups: list[dict[str, Any]] = []
            for group in checklist.get("groups") or []:
                if not isinstance(group, dict):
                    continue
                kept: list[Any] = []
                for item in group.get("items") or []:
                    if not isinstance(item, dict):
                        kept.append(item)
                        continue
                    required = item.pop("requiresSystem", None)
                    if required and required not in published:
                        label = item.get("c") or item.get("key") or "item"
                        warnings.append(
                            f"Dropped checklist item “{label}” — "
                            f"{_system_label(str(required))} is not in this guide."
                        )
                        continue
                    kept.append(item)
                if kept:
                    updated = dict(group)
                    updated["items"] = kept
                    groups.append(updated)
            checklist["groups"] = groups

    fixes = payload.get("fixes") or []
    kept_fixes: list[Any] = []
    generator_titles: list[str] = []
    if isinstance(fixes, list):
        for card in fixes:
            if not isinstance(card, dict):
                kept_fixes.append(card)
                continue
            required = card.pop("requiresSystem", None)
            if required and required not in published:
                title = card.get("title") or card.get("key") or "card"
                warnings.append(
                    f"Dropped fix card “{title}” — "
                    f"{_system_label(str(required))} is not in this guide."
                )
                continue
            kept_fixes.append(card)
            title = str(card.get("title") or "")
            if _GENERATOR_RE.search(title):
                generator_titles.append(title)
        payload["fixes"] = kept_fixes

    if generator_titles and not _chapter_teaches_generator(systems):
        names = "; ".join(generator_titles)
        warnings.append(
            f"{names} stays on the fix list, but no published chapter "
            "teaches how to start the generator."
        )
    return warnings
