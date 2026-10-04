"""Remove pipeline-status prose from a guest publication payload.

Composers and stored drafts keep these signals. ``assemble_publication``
calls this after the bootstrap is built and before navigation, so guests
never receive them and a dropped system leaves system order, locations,
and Learn.
"""

from __future__ import annotations

import copy
import re
from typing import Any

# Whole sentences, subtitles, and section titles. Matched case-insensitively.
# Kept specific so ordinary guest prose (Cattitude's sails chapter, for
# example) is left alone.
_PHRASES: tuple[str, ...] = (
    "equipment not yet configured",
    "equipment-specific content pending review",
    "see vessel configuration for equipment-specific details",
    "not available yet",
    "vessel configuration page",
    "this placeholder will be replaced",
    "approved equipment guide fragment is not yet available",
    "an admin must draft",
    "has not been approved yet",
    "draft from manual",
    "regenerate this vessel's guide",
    "(configuration pending)",
    "[[config_pending]]",
    "still pending — heads model not yet confirmed",
    "still pending - heads model not yet confirmed",
    "not yet confirmed in the vessel plant",
    "details not yet available",
    "detailed information is not yet available",
    "configure equipment and regenerate this section",
    "regenerate this section",
    "no equipment has been linked",
)

_PLACEHOLDER_SECTION_TITLES = frozenset({"content pending", "not yet available"})

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")
_HTML_P = re.compile(r"<p>(.*?)</p>", re.IGNORECASE | re.DOTALL)
_HTML_BR = re.compile(r"<br\s*/?>", re.IGNORECASE)
_HTML_TAG = re.compile(r"<[^>]+>")


def withhold_pipeline_status(payload: dict[str, Any]) -> list[str]:
    """Strip status prose from ``payload`` in place. Return admin messages."""
    systems = payload.get("systems")
    if not isinstance(systems, dict):
        return []

    cleaned: dict[str, Any] = {}
    messages: list[str] = []
    for system_id, module in systems.items():
        if not isinstance(module, dict):
            cleaned[str(system_id)] = module
            continue
        original = copy.deepcopy(module)
        label = str(original.get("title") or system_id).strip() or str(system_id)
        notes = _clean_system(module)
        reasons = _reasons_in(original)
        why = _join_notes(reasons) or "pipeline status"
        if _system_has_guest_body(module):
            cleaned[str(system_id)] = module
            if notes:
                messages.append(
                    f"{label}: removed {_join_notes(notes)} ({why}). The chapter stays."
                )
            continue
        messages.append(f"{label} withheld from guests: {why}.")
    payload["systems"] = cleaned
    return messages


def find_pipeline_status(value: Any, path: str = "$") -> list[tuple[str, str]]:
    """Return (path, phrase) for any remaining guest string that matches."""
    hits: list[tuple[str, str]] = []
    if isinstance(value, str):
        phrase = _matching_phrase(value)
        if phrase:
            hits.append((path, phrase))
    elif isinstance(value, dict):
        for key, child in value.items():
            hits.extend(find_pipeline_status(child, f"{path}.{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            hits.extend(find_pipeline_status(child, f"{path}[{index}]"))
    return hits


def _clean_system(module: dict[str, Any]) -> list[str]:
    notes: list[str] = []
    if _assign_clean(module, "subtitle"):
        notes.append("subtitle")
    if _assign_clean(module, "summary"):
        notes.append("summary")

    checks = module.get("learnChecks")
    if isinstance(checks, list):
        kept_checks = []
        removed_check = False
        for check in checks:
            if isinstance(check, str) and _clean_prose(check) != check.strip():
                removed_check = True
                cleaned = _clean_prose(check)
                if cleaned:
                    kept_checks.append(cleaned)
                continue
            kept_checks.append(check)
        if removed_check:
            notes.append("a learn check")
        if kept_checks:
            module["learnChecks"] = kept_checks
        else:
            module.pop("learnChecks", None)

    sections = module.get("sections")
    if isinstance(sections, list):
        kept_sections: list[Any] = []
        for section in sections:
            if not isinstance(section, dict):
                kept_sections.append(section)
                continue
            title = str(section.get("t") or "section").strip() or "section"
            removed = _clean_section(section)
            placeholder_title = title.lower() in _PLACEHOLDER_SECTION_TITLES
            if not _section_has_body(section) or (placeholder_title and removed):
                notes.append(f"section “{title}”")
                continue
            if removed:
                notes.append(f"part of section “{title}”")
            kept_sections.append(section)
        module["sections"] = kept_sections
    return notes


def _assign_clean(module: dict[str, Any], key: str) -> bool:
    raw = module.get(key)
    if not isinstance(raw, str) or not raw.strip():
        return False
    cleaned = _clean_prose(raw)
    if cleaned == raw.strip():
        return False
    if cleaned:
        module[key] = cleaned
    else:
        module.pop(key, None)
    return True


def _clean_section(section: dict[str, Any]) -> bool:
    """Return True when any guest text was removed. Drop emptied fields."""
    removed = False

    if isinstance(section.get("c"), str):
        cleaned = _clean_prose(section["c"])
        if cleaned != section["c"].strip():
            removed = True
        if cleaned:
            section["c"] = cleaned
        else:
            section.pop("c", None)

    if isinstance(section.get("html"), str) and section.get("type") != "photo":
        cleaned_html = _clean_html(section["html"])
        if cleaned_html != section["html"].strip():
            removed = True
        if cleaned_html:
            section["html"] = cleaned_html
        else:
            section.pop("html", None)

    items = section.get("items")
    if isinstance(items, list):
        kept: list[Any] = []
        for item in items:
            cleaned_item, item_removed = _clean_item(item)
            if item_removed:
                removed = True
            if cleaned_item is not None:
                kept.append(cleaned_item)
        if len(kept) != len(items):
            removed = True
        if kept:
            section["items"] = kept
        else:
            section.pop("items", None)

    return removed


def _clean_item(item: Any) -> tuple[Any | None, bool]:
    if isinstance(item, str):
        cleaned = _clean_prose(item)
        if not cleaned:
            return None, True
        return (cleaned, cleaned != item.strip())
    if isinstance(item, dict):
        text = item.get("c")
        if not isinstance(text, str):
            return item, False
        cleaned = _clean_prose(text)
        if not cleaned:
            return None, True
        if cleaned == text.strip():
            return item, False
        updated = dict(item)
        updated["c"] = cleaned
        return updated, True
    return item, False


def _clean_prose(text: str) -> str:
    paragraphs = _PARAGRAPH_SPLIT.split(text.strip())
    kept = [_clean_paragraph(paragraph) for paragraph in paragraphs]
    return "\n\n".join(paragraph for paragraph in kept if paragraph)


def _clean_paragraph(paragraph: str) -> str:
    sentences = [part.strip() for part in _SENTENCE_SPLIT.split(paragraph.strip()) if part.strip()]
    kept = [sentence for sentence in sentences if not _is_withheld(sentence)]
    return " ".join(kept)


def _clean_html(html: str) -> str:
    if "<p" not in html.lower():
        visible = _HTML_TAG.sub("", html)
        cleaned = _clean_prose(visible)
        return cleaned if cleaned != _normalize_ws(visible) else html.strip()

    def _replace(match: re.Match[str]) -> str:
        inner = match.group(1)
        chunks = _HTML_BR.split(inner)
        kept_chunks: list[str] = []
        for chunk in chunks:
            visible = _normalize_ws(_HTML_TAG.sub("", chunk))
            cleaned = _clean_paragraph(visible)
            if not cleaned:
                continue
            if cleaned == visible:
                kept_chunks.append(chunk.strip())
            else:
                kept_chunks.append(cleaned)
        if not kept_chunks:
            return ""
        return "<p>" + "<br>\n".join(kept_chunks) + "</p>"

    return _HTML_P.sub(_replace, html).strip()


def _is_withheld(text: str) -> bool:
    return _matching_phrase(text) is not None


def _matching_phrase(text: str) -> str | None:
    lowered = text.lower()
    for phrase in _PHRASES:
        if phrase in lowered:
            return phrase
    return None


def guest_visible_section_count(module: dict[str, Any]) -> int:
    """Sections with a body that are not tagged crew.

    A crew-only chapter still publishes. This count only feeds the publish
    warning that guests will see an empty chapter.
    """
    if not isinstance(module, dict):
        return 0
    count = 0
    for section in module.get("sections") or []:
        if not isinstance(section, dict):
            continue
        if section.get("audience") == "crew":
            continue
        if _section_has_body(section):
            count += 1
    return count


def _section_has_body(section: dict[str, Any]) -> bool:
    if isinstance(section.get("c"), str) and section["c"].strip():
        return True
    if isinstance(section.get("html"), str) and section["html"].strip():
        return True
    items = section.get("items")
    if isinstance(items, list) and items:
        return True
    rows = section.get("rows")
    if isinstance(rows, list) and rows:
        return True
    return False


def _system_has_guest_body(module: dict[str, Any]) -> bool:
    summary = module.get("summary")
    if isinstance(summary, str) and summary.strip():
        return True
    sections = module.get("sections")
    if isinstance(sections, list) and any(
        isinstance(section, dict) and _section_has_body(section) for section in sections
    ):
        return True
    return False


def _reasons_in(value: Any) -> list[str]:
    found: list[str] = []
    for _path, phrase in find_pipeline_status(value):
        label = _reason_label(phrase)
        if label not in found:
            found.append(label)
    return found


def _reason_label(phrase: str) -> str:
    if "configuration pending" in phrase or "config_pending" in phrase:
        return "configuration still pending"
    if "heads model" in phrase or "vessel plant" in phrase:
        return "heads model not yet confirmed"
    if (
        "pending review" in phrase
        or "admin must draft" in phrase
        or "equipment guide fragment" in phrase
        or "has not been approved" in phrase
        or "draft from manual" in phrase
        or "regenerate this vessel" in phrase
    ):
        return "equipment content pending review"
    if (
        "not yet configured" in phrase
        or "not available yet" in phrase
        or "placeholder will be replaced" in phrase
        or "vessel configuration" in phrase
        or "no equipment has been linked" in phrase
    ):
        return "equipment not yet configured"
    return "section not yet written"


def _join_notes(notes: list[str]) -> str:
    unique: list[str] = []
    for note in notes:
        if note not in unique:
            unique.append(note)
    if not unique:
        return ""
    if len(unique) == 1:
        return unique[0]
    if len(unique) == 2:
        return f"{unique[0]} and {unique[1]}"
    return ", ".join(unique[:-1]) + f", and {unique[-1]}"


def _normalize_ws(text: str) -> str:
    return " ".join(text.split())
