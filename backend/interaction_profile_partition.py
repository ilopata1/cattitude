"""Stage 1 map — partition routed excerpts into extraction groups."""

from __future__ import annotations

import math
import re
from typing import Any

BATCH_SIZE = 7  # fallback batch size (within 6–8)
MAX_CHAPTER_GROUPS = 8
MAX_BATCH_GROUPS = 4
SINGLE_GROUP_EXCERPT_CAP = 36

# Stronger trailer for a second map pass when a group returned zero fields.
UNUTILIZED_RETRY_LINE = (
    "IMPORTANT: Do not return an all-empty profile if THIS text describes "
    "controls, displays, accessories, fuses/protection, AC/DC supply needs, "
    "network/remote panels, DIP switches, or configuration steps. Extract "
    "every field THIS text supports."
)

# Combi flap: Power Sharing / AC-input / mains-limit text present but action omitted.
AC_LIMIT_RETRY_LINE = (
    "IMPORTANT: THIS text describes Power Sharing, AC-input current/mains "
    "limit, or similar shore/AC input limiting. Record a situational "
    "operator_action for setting that limit, worded from THIS text only "
    "(do not paste examples)."
)

REMOTE_PANEL_RETRY_LINE = (
    "IMPORTANT: THIS text mentions an optional remote panel / MasterView / "
    "remote control / monitoring panel that operates THIS device. Record a "
    "control_surfaces entry (remote_panel_accessory, optional_accessory true) "
    "and a matching requires_devices entry, worded from THIS text only."
)

BMS_PROTECT_RETRY_LINE = (
    "IMPORTANT: THIS text describes automatic safety-relay / BMS protective "
    "disconnect (opens when built-in thresholds / battery safety events are "
    "met). Record that under protects[] — NOT as an operator_action. If THIS "
    "text also describes Close relay / reset after a trip once limits are OK, "
    "record that recovery as an emergency operator_action."
)

DIP_COMMISSION_RETRY_LINE = (
    "IMPORTANT: THIS text describes DIP-switch or MasterAdjust / MasterBus "
    "commissioning configuration for THIS device. Record at least one "
    "commissioning operator_action with audience installer_or_technician "
    "(worded from THIS text only)."
)

_AC_LIMIT_BODY_RE = re.compile(
    r"power sharing level can be adjusted|"
    r"power sharing mode|"
    r"mains limit|"
    r"ac input current",
    re.I,
)
_AC_LIMIT_ACTION_RE = re.compile(
    r"power sharing|mains limit|mains fuse|ac input current|shore.*current|"
    r"input current limit",
    re.I,
)
_REMOTE_PANEL_BODY_RE = re.compile(
    r"masterview|optional remote control|remote panel|remote control.? like|"
    r"monitoring device",
    re.I,
)
_REMOTE_PANEL_SURFACE_RE = re.compile(
    r"remote_panel|masterview|remote control|remote panel",
    re.I,
)
_BMS_PROTECT_BODY_RE = re.compile(
    r"safety relay will automatically open|"
    r"built-in thresholds are met|"
    r"battery safety event|"
    r"automatically open \(remote off\)",
    re.I,
)
_BMS_PROTECT_FIELD_RE = re.compile(
    r"safety relay|threshold|protective|bms|battery safety|disconnect",
    re.I,
)
_BMS_RECOVERY_BODY_RE = re.compile(
    r"close relay|close the (?:battery )?safety relay|relay has been triggered",
    re.I,
)
_BMS_RECOVERY_ACTION_RE = re.compile(
    r"close relay|close .{0,24}relay|reset .{0,24}relay",
    re.I,
)
_DIP_BODY_RE = re.compile(
    r"\bdip[- ]?switch|masteradjust|configure via masterbus|"
    r"set the dip|dip switches",
    re.I,
)
_DIP_ACTION_RE = re.compile(
    r"\bdip|masteradjust|configure via masterbus|set .{0,20}dip",
    re.I,
)


def group_text_has_ac_limit_adjust(excerpts: list[dict[str, Any]]) -> bool:
    blob = " ".join(str(e.get("text") or "") for e in excerpts if isinstance(e, dict))
    return bool(_AC_LIMIT_BODY_RE.search(blob))


def profile_has_ac_limit_action(profile: dict[str, Any]) -> bool:
    for item in profile.get("operator_actions") or []:
        if not isinstance(item, dict):
            continue
        if _AC_LIMIT_ACTION_RE.search(str(item.get("action") or "")):
            return True
    return False


def group_text_has_remote_panel(excerpts: list[dict[str, Any]]) -> bool:
    blob = " ".join(str(e.get("text") or "") for e in excerpts if isinstance(e, dict))
    return bool(_REMOTE_PANEL_BODY_RE.search(blob))


def profile_has_remote_panel(profile: dict[str, Any]) -> bool:
    for item in profile.get("control_surfaces") or []:
        if not isinstance(item, dict):
            continue
        blob = " ".join(
            [
                str(item.get("surface") or ""),
                str(item.get("label_verbatim") or ""),
            ]
        )
        if _REMOTE_PANEL_SURFACE_RE.search(blob):
            return True
    for item in profile.get("requires_devices") or []:
        if not isinstance(item, dict):
            continue
        if _REMOTE_PANEL_SURFACE_RE.search(str(item.get("description_verbatim") or "")):
            return True
    return False


def group_text_has_bms_protect(excerpts: list[dict[str, Any]]) -> bool:
    blob = " ".join(str(e.get("text") or "") for e in excerpts if isinstance(e, dict))
    return bool(_BMS_PROTECT_BODY_RE.search(blob))


def profile_has_bms_protect(profile: dict[str, Any]) -> bool:
    for item in profile.get("protects") or []:
        if not isinstance(item, dict):
            continue
        if _BMS_PROTECT_FIELD_RE.search(str(item.get("description_verbatim") or "")):
            return True
    return False


def group_text_has_bms_recovery(excerpts: list[dict[str, Any]]) -> bool:
    blob = " ".join(str(e.get("text") or "") for e in excerpts if isinstance(e, dict))
    return bool(_BMS_RECOVERY_BODY_RE.search(blob))


def profile_has_bms_recovery(profile: dict[str, Any]) -> bool:
    for item in profile.get("operator_actions") or []:
        if not isinstance(item, dict):
            continue
        if _BMS_RECOVERY_ACTION_RE.search(str(item.get("action") or "")):
            return True
    return False


def group_text_has_dip_commission(excerpts: list[dict[str, Any]]) -> bool:
    blob = " ".join(str(e.get("text") or "") for e in excerpts if isinstance(e, dict))
    return bool(_DIP_BODY_RE.search(blob))


def profile_has_dip_commission(profile: dict[str, Any]) -> bool:
    for item in profile.get("operator_actions") or []:
        if not isinstance(item, dict):
            continue
        action = str(item.get("action") or "")
        if not _DIP_ACTION_RE.search(action):
            continue
        audience = str(item.get("audience") or "")
        context = str(item.get("context") or "")
        if audience == "installer_or_technician" or context == "commissioning":
            return True
    return False

# Numbered sections belonging to a chapter, e.g. "4.5 Daily use, …".
_SECTION = re.compile(r"^(\d{1,2})(?:\.\d+)+\.?\s+\S")
_INTRO_HINTS = re.compile(
    r"\b(general information|introduction|overview|product description|"
    r"how it works|principles?)\b",
    re.I,
)
# First token after the chapter number for genuine TOC titles
# ("4 OPERATION", "1 GENERAL INFORMATION", "3 HOW IT WORKS",
#  "7. INSTALLATION", "13. MASTERBUS").
_CHAPTER_LEAD_WORDS = frozenset(
    {
        "GENERAL",
        "OPERATION",
        "INSTALLATION",
        "CONFIGURATION",
        "TECHNICAL",
        "HOW",
        "SAFETY",
        "TROUBLE",
        "TROUBLESHOOTING",
        "COMMISSIONING",
        "DECOMMISSIONING",
        "WARRANTY",
        "LIABILITY",
        "SPECIFICATIONS",
        "SPECIFICATION",
        "MAINTENANCE",
        "INTRODUCTION",
        "OVERVIEW",
        "PRODUCT",
        "APPENDIX",
        "INDEX",
        "MASTERBUS",
        "CZONE",
        "STORAGE",
        "REPLACEMENTS",
        "CYCLE",
    }
)
# Optional period after the number (Mastervolt MLI: "7. INSTALLATION").
_TOP_CHAPTER = re.compile(
    r"^(\d{1,2})\.?\s+([A-Za-z][A-Za-z0-9/-]*)\b.*$"
)
# Section inventory titles used to reclaim unassigned body excerpts
# ("3.4.4 Power sharing mode" → chapter 3 when body mentions those words).
_SECTION_INVENTORY = re.compile(
    r"^(\d{1,2})(?:\.\d+)+\.?\s+([A-Za-z].+)$"
)

QUERY_FIELD_EXPECTATIONS: dict[str, frozenset[str]] = {
    "operation": frozenset({"control_surfaces", "operator_actions", "evidence"}),
    "installation": frozenset(
        {"operator_actions", "requires_devices", "supply_requirements", "evidence"}
    ),
    "troubleshooting": frozenset({"operator_actions", "safety_role", "evidence"}),
    "network": frozenset(
        {"networks", "data_roles", "control_surfaces", "requires_devices", "evidence"}
    ),
    "maintenance": frozenset({"operator_actions", "evidence"}),
    "optional": frozenset({"control_surfaces", "requires_devices", "evidence"}),
    "masterview": frozenset({"control_surfaces", "requires_devices", "evidence"}),
    "remote panel": frozenset({"control_surfaces", "requires_devices", "evidence"}),
    "remote control": frozenset({"control_surfaces", "requires_devices", "evidence"}),
    "display panel": frozenset({"control_surfaces", "requires_devices", "evidence"}),
    "monitoring panel": frozenset({"control_surfaces", "requires_devices", "evidence"}),
    "shore": frozenset({"operator_actions", "evidence"}),
    "main switch": frozenset({"control_surfaces", "operator_actions", "evidence"}),
    "dc fuse": frozenset({"supply_requirements", "protected_by", "evidence"}),
    "bms": frozenset(
        {"safety_role", "protects", "operator_actions", "evidence"}
    ),
    "safety relay": frozenset(
        {"protects", "control_surfaces", "operator_actions", "evidence"}
    ),
    "class t": frozenset({"supply_requirements", "protected_by", "evidence"}),
    "t-fuse": frozenset({"supply_requirements", "protected_by", "evidence"}),
    "soc": frozenset({"operator_actions", "data_roles", "evidence"}),
    "state of charge": frozenset({"operator_actions", "data_roles", "evidence"}),
    "climate": frozenset({"ui_pages", "operator_actions", "requires_devices", "evidence"}),
    "hvac": frozenset({"ui_pages", "operator_actions", "requires_devices", "evidence"}),
    "aircon": frozenset({"ui_pages", "operator_actions", "requires_devices", "evidence"}),
    "air conditioner": frozenset(
        {"ui_pages", "operator_actions", "requires_devices", "evidence"}
    ),
    "temperature control": frozenset(
        {"ui_pages", "operator_actions", "evidence"}
    ),
}


def inventory_top_chapters(headings: list[str]) -> dict[str, str]:
    """Map chapter id → title for genuine top-level TOC headings only."""
    out: dict[str, str] = {}
    for heading in headings:
        text = (heading or "").strip()
        match = _TOP_CHAPTER.match(text)
        if not match:
            continue
        lead = match.group(2).upper().strip(",.;:")
        if lead not in _CHAPTER_LEAD_WORDS:
            continue
        # Top-level chapter titles are short; reject long body sentences.
        if len(text) > 60 or "," in text:
            continue
        cid = match.group(1)
        if cid not in out or len(text) < len(out[cid]):
            out[cid] = text
    return out


def _chapter_from_heading(heading: str, allowed: set[str]) -> str | None:
    text = (heading or "").strip()
    if not text or not allowed:
        return None
    top = _TOP_CHAPTER.match(text)
    if top:
        lead = top.group(2).upper().strip(",.;:")
        if top.group(1) in allowed and lead in _CHAPTER_LEAD_WORDS:
            return top.group(1)
    section = _SECTION.match(text)
    if section and section.group(1) in allowed:
        return section.group(1)
    if _INTRO_HINTS.search(text) and "1" in allowed:
        return "1"
    return None


def _title_content_words(title: str) -> list[str]:
    """Significant words from a section title (skip tiny connectives / brand crumbs)."""
    stop = {
        "the",
        "and",
        "for",
        "with",
        "from",
        "into",
        "mode",
        "of",
        "on",
        "to",
        "mass",
        "combi",
        "pro",
        "ultra",
        "mastervolt",
        "victron",
    }
    words: list[str] = []
    for raw in re.findall(r"[a-z0-9]+", (title or "").lower()):
        if len(raw) < 4 or raw in stop:
            continue
        words.append(raw)
    return words


def _assign_via_section_topic(
    excerpt: dict[str, Any],
    *,
    allowed: set[str],
    inventory_headings: list[str],
) -> str | None:
    """Assign body excerpts that lack a chapter heading but echo a TOC section.

    Combi flap root cause: ''The Power Sharing level can be adjusted…'' had no
    chapter heading substring, so it fell into leftover batches while
    ''3.4.4 Power sharing mode'' lived under chapter_3. Reclaim when **all**
    significant title words from an inventory section appear in the body
    (avoids product-name titles like ''Changes to the Mass Combi Pro'' winning
    on brand tokens alone).
    """
    text_l = str(excerpt.get("text") or "").lower()
    if len(text_l) < 40:
        return None
    best: tuple[int, str] | None = None
    for heading in inventory_headings:
        match = _SECTION_INVENTORY.match(heading.strip())
        if not match:
            continue
        chapter = match.group(1)
        if chapter not in allowed:
            continue
        title = match.group(2).strip()
        title_l = title.lower()
        if len(title_l) >= 8 and title_l in text_l:
            score = 1000 + len(title_l)
            if best is None or score > best[0]:
                best = (score, chapter)
            continue
        words = _title_content_words(title)
        if len(words) < 2:
            continue
        if not all(w in text_l for w in words):
            continue
        score = 100 * len(words) + len("".join(words))
        if best is None or score > best[0]:
            best = (score, chapter)
    return best[1] if best else None


def _assign_via_top_title(
    excerpt: dict[str, Any],
    *,
    allowed: set[str],
    top: dict[str, str],
) -> str | None:
    """Assign when body quotes a top-level TOC title (e.g. ``7. INSTALLATION``)."""
    text_l = str(excerpt.get("text") or "").lower()
    if len(text_l) < 20:
        return None
    best: tuple[int, str] | None = None
    for cid, title in top.items():
        if cid not in allowed:
            continue
        title_l = title.lower().strip()
        if len(title_l) >= 5 and title_l in text_l:
            score = 1000 + len(title_l)
            if best is None or score > best[0]:
                best = (score, cid)
            continue
        lead = title_l.split(None, 1)[-1] if " " in title_l else title_l
        lead = re.sub(r"^\d+\.?\s*", "", lead).strip()
        if len(lead) < 5:
            continue
        if re.search(rf"\b{re.escape(cid)}\.?\s+{re.escape(lead)}\b", text_l):
            score = 900 + len(lead)
            if best is None or score > best[0]:
                best = (score, cid)
    return best[1] if best else None


def _assign_chapter(
    excerpt: dict[str, Any],
    *,
    allowed: set[str],
    inventory_headings: list[str],
    top: dict[str, str] | None = None,
) -> str | None:
    guess = str(excerpt.get("source_heading_guess") or "").strip()
    text = str(excerpt.get("text") or "")
    candidates: list[str] = []
    if guess:
        candidates.append(guess)
    text_l = text.lower()
    for heading in inventory_headings:
        h = heading.strip()
        if len(h) < 5:
            continue
        if _chapter_from_heading(h, allowed) is None:
            continue
        if h.lower() in text_l:
            candidates.append(h)
    for heading in candidates:
        chapter = _chapter_from_heading(heading, allowed)
        if chapter:
            return chapter
    if top:
        via_top = _assign_via_top_title(excerpt, allowed=allowed, top=top)
        if via_top:
            return via_top
    return _assign_via_section_topic(
        excerpt, allowed=allowed, inventory_headings=inventory_headings
    )


def _coalesce_chapter_groups(
    groups: list[dict[str, Any]],
    *,
    max_groups: int = MAX_CHAPTER_GROUPS,
) -> list[dict[str, Any]]:
    """Merge adjacent non-intro chapter groups until under ``max_groups``."""
    if len(groups) <= max_groups:
        return groups
    out = [dict(g) for g in groups]
    while len(out) > max_groups:
        best_i: int | None = None
        best_size = 10**9
        for i in range(len(out) - 1):
            if out[i].get("is_introduction") or out[i + 1].get("is_introduction"):
                continue
            size = len(out[i].get("excerpts") or []) + len(
                out[i + 1].get("excerpts") or []
            )
            if size < best_size:
                best_size = size
                best_i = i
        if best_i is None:
            intro = [g for g in out if g.get("is_introduction")]
            rest: list[dict[str, Any]] = []
            for g in out:
                if g.get("is_introduction"):
                    continue
                rest.extend(list(g.get("excerpts") or []))
            return intro + _batch_groups(
                rest, batch_size=BATCH_SIZE, id_prefix="batch", intro_first=False
            )
        left, right = out[best_i], out[best_i + 1]
        merged_excerpts = list(left.get("excerpts") or []) + list(
            right.get("excerpts") or []
        )
        predicted = sorted(
            set(left.get("predicted_fields") or [])
            | set(right.get("predicted_fields") or [])
        )
        chapters = [
            c
            for c in (
                left.get("chapter"),
                right.get("chapter"),
            )
            if c
        ]
        merged = {
            "group_id": f"{left.get('group_id')}+{right.get('group_id')}",
            "chapter": left.get("chapter") or right.get("chapter"),
            "chapters": chapters,
            "chapter_title": left.get("chapter_title") or right.get("chapter_title"),
            "is_introduction": False,
            "partition": "chapter_merge",
            "excerpts": merged_excerpts,
            "predicted_fields": predicted,
        }
        out = out[:best_i] + [merged] + out[best_i + 2 :]
    return out


def _predicted_fields_for_excerpts(excerpts: list[dict[str, Any]]) -> set[str]:
    predicted: set[str] = set()
    for excerpt in excerpts:
        query = str(excerpt.get("query") or "").lower()
        for key, fields in QUERY_FIELD_EXPECTATIONS.items():
            if key in query:
                predicted |= set(fields)
    if not predicted:
        predicted = {"operator_actions", "control_surfaces", "evidence"}
    return predicted


def _batch_groups(
    excerpts: list[dict[str, Any]],
    *,
    batch_size: int,
    id_prefix: str = "batch",
    intro_first: bool = True,
) -> list[dict[str, Any]]:
    groups: list[dict[str, Any]] = []
    for i in range(0, len(excerpts), batch_size):
        batch = excerpts[i : i + batch_size]
        groups.append(
            {
                "group_id": f"{id_prefix}_{i // batch_size}",
                "chapter": None,
                "is_introduction": bool(intro_first and i == 0),
                "partition": "batch",
                "excerpts": batch,
                "predicted_fields": sorted(_predicted_fields_for_excerpts(batch)),
            }
        )
    return groups


def partition_excerpts(
    excerpts: list[dict[str, Any]],
    *,
    inventory_headings: list[str] | None = None,
    batch_size: int = BATCH_SIZE,
) -> list[dict[str, Any]]:
    """Partition excerpts into named groups for map extraction.

    Prefer top-level manual chapters from the heading inventory; fall back to
    batches of ``batch_size`` (6–8) when chapter assignment fails or when the
    inventory does not expose a clear TOC.
    """
    headings = list(inventory_headings or [])
    top = inventory_top_chapters(headings)
    allowed = set(top)

    if not allowed:
        # No genuine TOC: one group when the payload is still small enough for
        # a single call; otherwise at most MAX_BATCH_GROUPS larger batches
        # (SmartSolar: ~80 excerpts → ~4 groups, not a dozen of 7).
        items = [e for e in excerpts if isinstance(e, dict)]
        if len(items) <= SINGLE_GROUP_EXCERPT_CAP:
            return [
                {
                    "group_id": "batch_0",
                    "chapter": None,
                    "is_introduction": True,
                    "partition": "batch",
                    "excerpts": items,
                    "predicted_fields": sorted(_predicted_fields_for_excerpts(items)),
                }
            ]
        size = max(batch_size, int(math.ceil(len(items) / MAX_BATCH_GROUPS)))
        return _batch_groups(items, batch_size=size)

    by_chapter: dict[str, list[dict[str, Any]]] = {}
    unassigned: list[dict[str, Any]] = []

    for excerpt in excerpts:
        if not isinstance(excerpt, dict):
            continue
        chapter = _assign_chapter(
            excerpt,
            allowed=allowed,
            inventory_headings=headings,
            top=top,
        )
        if chapter is None:
            unassigned.append(excerpt)
            continue
        by_chapter.setdefault(chapter, []).append(excerpt)

    items_all = [e for e in excerpts if isinstance(e, dict)]
    assigned_n = sum(len(v) for v in by_chapter.values())
    # TOC inventory present but largely unused (MLI: dotted titles in inventory,
    # body excerpts rarely quote them) → prefer coarse batches over a tiny
    # chapter_1 + leftover-batch shatter. Only applies to large payloads.
    if (
        len(items_all) >= 20
        and assigned_n < int(0.35 * len(items_all))
    ):
        size = max(batch_size, int(math.ceil(len(items_all) / MAX_BATCH_GROUPS)))
        return _batch_groups(items_all, batch_size=size)

    groups: list[dict[str, Any]] = []
    for chapter in sorted(by_chapter.keys(), key=lambda c: int(c) if c.isdigit() else 99):
        items = by_chapter[chapter]
        title = top.get(chapter, "")
        groups.append(
            {
                "group_id": f"chapter_{chapter}",
                "chapter": chapter,
                "chapter_title": title,
                # Only chapter 1 supplies device.category_freeform at reduce time.
                "is_introduction": chapter == "1",
                "partition": "chapter",
                "excerpts": items,
                "predicted_fields": sorted(_predicted_fields_for_excerpts(items)),
            }
        )

    if unassigned:
        if not groups:
            return _batch_groups(unassigned, batch_size=batch_size)
        # Fold leftovers into batches so TOC crumbs don't spawn fake chapters.
        groups.extend(
            _batch_groups(
                unassigned,
                batch_size=batch_size,
                id_prefix="batch",
                intro_first=False,
            )
        )

    # Too many groups → merge adjacent *chapter* groups (skip leftover batches).
    if len(groups) > MAX_CHAPTER_GROUPS:
        chapter_groups = [
            g
            for g in groups
            if g.get("partition") in {"chapter", "chapter_merge"}
        ]
        batch_groups = [g for g in groups if g.get("partition") == "batch"]
        chapter_groups = _coalesce_chapter_groups(
            chapter_groups, max_groups=max(1, MAX_CHAPTER_GROUPS - len(batch_groups))
        )
        groups = chapter_groups + batch_groups
        if len(groups) > MAX_CHAPTER_GROUPS:
            # Still over: merge leftover batches among themselves.
            intro = [g for g in groups if g.get("is_introduction")]
            rest: list[dict[str, Any]] = []
            for g in groups:
                if g.get("is_introduction"):
                    continue
                rest.extend(list(g.get("excerpts") or []))
            size = max(batch_size, int(math.ceil(len(rest) / max(1, MAX_CHAPTER_GROUPS - 1))))
            groups = intro + _batch_groups(
                rest, batch_size=size, id_prefix="batch", intro_first=False
            )

    if not any(g.get("is_introduction") for g in groups) and groups:
        groups[0]["is_introduction"] = True

    return groups


MAP_PARTIAL_MANUAL_LINE = (
    "These excerpts are one part of a larger manual; profile only what THIS "
    "text supports; empty fields are correct if this text doesn't cover them."
)
