"""Fold consecutive same-title sections and report the duplicates that remain.

Stage 4 emits one heading per prose/list split. Know hides the repeated
heading; the guest payload should contain one section. Stored modules and
the Stage 4 oracle are left as they are. Legacy chapters are reported, not
rewritten, except for that consecutive fold.
"""

from __future__ import annotations

import difflib
import html
import re
from typing import Any

from guide_learn_checks import check_text

_SKIP_TYPES = frozenset({"photo", "equipment_locations"})
_OVERSIZED_SECTIONS = 12
_NEAR_RATIO = 0.62
_NEAR_MIN_LEN = 18
_PREFIX_KEEP = 16
_PREFIX_STEM = 24
_SUFFIX_STEM = 20

_GENERIC_WORDS = frozenset(
    {
        "identify",
        "locate",
        "check",
        "confirm",
        "found",
        "know",
        "your",
        "with",
        "from",
        "when",
        "they",
        "them",
        "have",
        "been",
        "this",
        "that",
    }
)
_ANTONYMS = (
    ("port", "starboard"),
    ("start", "stop"),
    ("launch", "recover"),
    ("hoist", "lower"),
    ("coloured", "black"),
)

_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")


def normalise_title(title: str) -> str:
    return " ".join(str(title or "").split()).casefold()


def fold_consecutive_sections(payload: dict[str, Any]) -> None:
    """Merge consecutive same-title sections in ``payload`` in place."""
    systems = payload.get("systems")
    if not isinstance(systems, dict):
        return
    for module in systems.values():
        if not isinstance(module, dict):
            continue
        sections = module.get("sections")
        if not isinstance(sections, list):
            continue
        module["sections"] = _fold_sections(sections)


def duplicate_warnings(payload: dict[str, Any]) -> list[str]:
    """Warnings for duplicates that remain after the consecutive fold."""
    systems = payload.get("systems")
    if not isinstance(systems, dict):
        return []
    messages: list[str] = []
    for system_id, module in systems.items():
        if not isinstance(module, dict):
            continue
        label = str(module.get("title") or system_id).strip() or str(system_id)
        sections = [
            section
            for section in (module.get("sections") or [])
            if isinstance(section, dict)
        ]
        messages.extend(_title_warnings(label, sections))
        messages.extend(
            _text_warnings(
                label,
                "learn check",
                [check_text(check) for check in (module.get("learnChecks") or []) if check_text(check)],
            )
        )
        if len(sections) > _OVERSIZED_SECTIONS:
            messages.append(f"{label}: {len(sections)} sections.")
    return messages


def _fold_sections(sections: list[Any]) -> list[Any]:
    folded: list[Any] = []
    index = 0
    while index < len(sections):
        section = sections[index]
        if not _foldable(section):
            folded.append(section)
            index += 1
            continue
        title = normalise_title(str(section.get("t") or ""))
        end = index + 1
        while (
            title
            and end < len(sections)
            and _foldable(sections[end])
            and normalise_title(str(sections[end].get("t") or "")) == title
        ):
            end += 1
        group = sections[index:end]
        folded.append(_merge_group(group) if len(group) > 1 else section)
        index = end
    return folded


def _foldable(section: Any) -> bool:
    return isinstance(section, dict) and section.get("type") not in _SKIP_TYPES


def _merge_group(group: list[dict[str, Any]]) -> dict[str, Any]:
    merged = {
        key: value
        for key, value in group[0].items()
        if key not in {"c", "items", "html", "type", "rows"}
    }
    merged["t"] = group[0].get("t")
    merged["type"] = "prose"
    merged["html"] = "".join(_fragment(section) for section in group)
    return merged


def _fragment(section: dict[str, Any]) -> str:
    parts: list[str] = []
    body = section.get("html")
    if isinstance(body, str) and body.strip():
        parts.append(body.strip())
    else:
        text = section.get("c")
        if isinstance(text, str) and text.strip():
            for paragraph in _PARAGRAPH_SPLIT.split(text.strip()):
                cleaned = paragraph.strip()
                if cleaned:
                    parts.append(f"<p>{html.escape(cleaned)}</p>")
    items = _item_texts(section)
    if items and not (isinstance(body, str) and "<li" in body):
        tag = "ol" if section.get("type") == "steps" else "ul"
        lis = "".join(f"<li>{html.escape(item)}</li>" for item in items)
        parts.append(f"<{tag}>{lis}</{tag}>")
    return "".join(parts)


def _item_texts(section: dict[str, Any]) -> list[str]:
    items = section.get("items")
    if not isinstance(items, list):
        return []
    texts: list[str] = []
    for item in items:
        if isinstance(item, str) and item.strip():
            texts.append(item.strip())
        elif isinstance(item, dict):
            for key in ("c", "text", "content", "s", "label", "title", "body"):
                value = item.get(key)
                if isinstance(value, str) and value.strip():
                    texts.append(value.strip())
                    break
    return texts


def _title_warnings(label: str, sections: list[dict[str, Any]]) -> list[str]:
    grouped: dict[str, list[str]] = {}
    for section in sections:
        raw = str(section.get("t") or "").strip()
        key = normalise_title(raw)
        if not key:
            continue
        grouped.setdefault(key, []).append(raw)
    messages: list[str] = []
    for titles in grouped.values():
        if len(titles) > 1:
            messages.append(
                f"{label}: section “{titles[0]}” appears {len(titles)} times."
            )
    messages.extend(_text_warnings(label, "section", [titles[0] for titles in grouped.values()]))
    return messages


def _text_warnings(label: str, kind: str, texts: list[str]) -> list[str]:
    keyed: list[tuple[str, str]] = []
    seen: set[str] = set()
    counts: dict[str, int] = {}
    display: dict[str, str] = {}
    for raw in texts:
        key = normalise_title(raw)
        if not key:
            continue
        counts[key] = counts.get(key, 0) + 1
        display.setdefault(key, raw.strip())
        if key not in seen:
            seen.add(key)
            keyed.append((key, display[key]))
    messages: list[str] = []
    if kind == "learn check":
        for key, count in counts.items():
            if count > 1:
                messages.append(
                    f"{label}: learn check “{display[key]}” appears {count} times."
                )
    reported: set[tuple[str, str]] = set()
    for index, (left, left_text) in enumerate(keyed):
        for right, right_text in keyed[index + 1 :]:
            pair = tuple(sorted((left, right)))
            if pair in reported or not _near(left, right):
                continue
            reported.add(pair)
            messages.append(
                f"{label}: {kind} “{left_text}” and “{right_text}” are near-duplicates."
            )
    return messages


def _near(left: str, right: str) -> bool:
    if left == right or min(len(left), len(right)) < _NEAR_MIN_LEN:
        return False
    if (
        _has_antonym(left, right)
        or _series_heading(left, right)
        or _subsection(left, right)
        or _photo_sibling(left, right)
    ):
        return False
    prefix = _common_affix(left, right, from_end=False)
    if prefix >= _PREFIX_STEM or _common_affix(left, right, from_end=True) >= _SUFFIX_STEM:
        return False
    if prefix >= _PREFIX_KEEP:
        return True
    first = left.split(" ", 1)[0]
    if (
        len(first) >= 9
        and first.isalpha()
        and right.startswith(first + " ")
        and difflib.SequenceMatcher(None, left, right).ratio() >= 0.66
    ):
        return True
    shared = (_content_words(left) & _content_words(right)) - _GENERIC_WORDS
    return (
        len(shared) >= 2
        and _shares_phrase(left, right, shared)
        and difflib.SequenceMatcher(None, left, right).ratio() >= _NEAR_RATIO
    )


def _common_affix(left: str, right: str, *, from_end: bool) -> int:
    if from_end:
        left, right = left[::-1], right[::-1]
    count = 0
    for char_a, char_b in zip(left, right):
        if char_a != char_b:
            break
        count += 1
    return count


def _shares_phrase(left: str, right: str, words: set[str]) -> bool:
    for word in words:
        for other in words:
            if word == other:
                continue
            phrase = f"{word} {other}"
            if phrase in left and phrase in right:
                return True
    return False


def _content_words(text: str) -> set[str]:
    return {word for word in re.findall(r"[a-z0-9]+", text) if len(word) >= 4}


def _has_antonym(left: str, right: str) -> bool:
    for first, second in _ANTONYMS:
        if (first in left and second in right) or (second in left and first in right):
            return True
    return False


def _heading(text: str) -> str:
    for separator in (" — ", " - "):
        if separator in text:
            return text.split(separator, 1)[0]
    return ""


def _series_heading(left: str, right: str) -> bool:
    left_head = _heading(left)
    right_head = _heading(right)
    if not left_head or not right_head:
        return False
    return re.sub(r"\d+", "#", left_head) == re.sub(r"\d+", "#", right_head)


def _subsection(left: str, right: str) -> bool:
    for text, other in ((left, right), (right, left)):
        head = _heading(text)
        if head and other.startswith(head) and other != text:
            return True
    return False


def _photo_sibling(left: str, right: str) -> bool:
    if not (left.endswith(" photo") or right.endswith(" photo")):
        return False
    return _common_affix(left, right, from_end=False) >= 12
