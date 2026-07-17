"""Collapse operator_actions that differ only by an option-value tail.

Example::

    set the sunset action to keep the lights off
    set the sunset action to switch on for a fixed time

→ one action ``set the sunset action`` with
``options: ["keep the lights off", "switch on for a fixed time", ...]``.
"""

from __future__ import annotations

import re
from typing import Any

_TO_OPTION_RE = re.compile(
    r"^(?P<stem>.+?)\s+to\s+(?P<option>.+)$",
    re.IGNORECASE,
)


def _norm_stem(stem: str) -> str:
    return " ".join(stem.lower().replace(" the ", " ").split())


def collapse_option_value_actions(
    actions: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    """Merge same-stem ``… to <option>`` actions into one row with ``options[]``."""
    rows = [dict(a) for a in (actions or []) if isinstance(a, dict)]
    if len(rows) < 2:
        return rows

    # Group index lists by (norm_stem, audience, context) when stem+option parse.
    groups: dict[tuple[str, str, str], list[int]] = {}
    parsed: dict[int, tuple[str, str]] = {}
    for i, a in enumerate(rows):
        text = str(a.get("action") or "").strip()
        m = _TO_OPTION_RE.match(text)
        if not m:
            continue
        stem = m.group("stem").strip()
        option = m.group("option").strip()
        if not stem or not option:
            continue
        # Avoid collapsing unrelated "set X to Y" that aren't option menus
        # when only one member would be in the group — handled below.
        key = (
            _norm_stem(stem),
            str(a.get("audience") or "").strip(),
            str(a.get("context") or "").strip(),
        )
        groups.setdefault(key, []).append(i)
        parsed[i] = (stem, option)

    skip: set[int] = set()
    out: list[dict[str, Any]] = []
    for i, a in enumerate(rows):
        if i in skip:
            continue
        if i not in parsed:
            out.append(a)
            continue
        stem, option = parsed[i]
        key = (
            _norm_stem(stem),
            str(a.get("audience") or "").strip(),
            str(a.get("context") or "").strip(),
        )
        members = groups.get(key) or [i]
        if len(members) < 2:
            out.append(a)
            continue
        # First member becomes the collapsed row.
        if i != members[0]:
            continue
        options: list[str] = []
        seen: set[str] = set()
        for j in members:
            skip.add(j)
            _stem_j, opt_j = parsed[j]
            low = opt_j.lower()
            if low in seen:
                continue
            seen.add(low)
            options.append(opt_j)
        collapsed = dict(rows[members[0]])
        collapsed["action"] = stem
        collapsed["options"] = options
        out.append(collapsed)
    return out
