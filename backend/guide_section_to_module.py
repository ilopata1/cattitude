"""Phase 1 transform: Stage 4 composer output -> live ``SystemModule`` payload.

The frozen ``compose_*_section`` composers return a prose ``draft_markdown``
plus a ``provenance_map`` (sentence -> block). The live product stores/serves
structured ``SystemModule`` objects validated by
``guide_generation._validate_system_module`` and rendered by the mobile client.

This module maps one to the other, per the locked Phase 1 / 1b decisions:
  * decision 1 / Phase 1b A — titled blocks, enriched to ``list`` / ``steps`` /
    ``warnings`` when bullet or numbered patterns are clear (hybrid heuristics).
  * decision 2 — provenance / fact_queries stay on the generation run; Phase 1b
    promotes ``guide_links`` into the published module for tappable xrefs.
  * decision 3 / Phase 1b B — in-prose tappable targets via ``html`` +
    ``data-guide-link`` (Know resolves ``system:<id>`` / ``fix:<cat>`` /
    ``do:learn``).
  * locs from ``SYSTEM_CATALOG``; ``learnChecks`` synthesized from which O3
    blocks the module actually contains; Related section links Fix It + Learn.
  * O1 — solar folds into the ``batteries`` module as a "Solar charging" section.
  * O2 — subtitle synthesized from the capability summary.
  * O3 — block heading labels below.

Pure functions only; no DB access. See ``guide-stage4-integration-plan.md``.
"""

from __future__ import annotations

import html
import re
from typing import Any

from guide_composition_rules import SECTION_SPINE, normalize_block
from guide_module_catalog import SYSTEM_CATALOG
from guide_reader_voice import format_fix_xref, format_learn_xref, place_labels
from stage4_substrate import places_for_device

# O3 — reader-facing headings per spine block. capability_summary is the module
# ``summary`` (not a section), so it is intentionally absent here.
BLOCK_HEADINGS: dict[str, str] = {
    "how_it_works": "How it works",
    "startup": "Turning it on",
    "monitoring": "Monitoring",
    "adjusting": "Operating",
    "troubleshooting": "If something's not right",
    "reference": "Care & upkeep",
}

_DEFAULT_ICON = "⚙️"
_SUBTITLE_MAX = 90

# Know → Fix It category filter for Stage 4 published systems.
_SYSTEM_FIX_CATEGORY: dict[str, str] = {
    "batteries": "electrical",
    "controls": "electrical",
    "electrical": "electrical",
    "nav": "nav",
}

# Composers store config-pending notes with a marker token in the provenance
# ``sentence`` but render them as "(Configuration pending) ..." in the draft.
# Mirror that rendering so those paragraphs match their true block.
_CONFIG_PLACEHOLDER_MARKER = "[[CONFIG_PENDING]]"

_BULLET_LINE_RE = re.compile(r"^[-•]\s+(.+)$")
_NUMBERED_LINE_RE = re.compile(r"^\d+[.)]\s+(.+)$")


def _rendered_sentence(entry: dict[str, Any]) -> str:
    text = str(entry.get("sentence") or "").strip()
    if entry.get("config_placeholder") or _CONFIG_PLACEHOLDER_MARKER in text:
        text = text.replace(_CONFIG_PLACEHOLDER_MARKER, "").strip()
        if text and not text.startswith("("):
            text = f"(Configuration pending) {text}"
    return text


class SectionTransformError(Exception):
    """Raised when a composed section cannot be mapped to a SystemModule."""


def _split_title_and_body(markdown: str) -> tuple[str, str]:
    lines = (markdown or "").split("\n")
    title = ""
    start = 0
    if lines and lines[0].lstrip().startswith("#"):
        title = lines[0].lstrip("#").strip()
        start = 1
    body = "\n".join(lines[start:]).strip()
    return title, body


def _paragraphs(body: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", body or "") if p.strip()]


def _block_index(provenance_map: list[dict[str, Any]]) -> list[tuple[str, str]]:
    index: list[tuple[str, str]] = []
    for entry in provenance_map or []:
        sentence = _rendered_sentence(entry)
        block = normalize_block(str(entry.get("block") or ""))
        if sentence:
            index.append((sentence, block))
    return index


def _block_for_paragraph(
    paragraph: str, block_index: list[tuple[str, str]]
) -> str | None:
    # A paragraph begins with a verbatim provenance sentence; prefer a full
    # startswith, then fall back to a leading-prefix match for robustness.
    for sentence, block in block_index:
        if paragraph.startswith(sentence):
            return block
    for sentence, block in block_index:
        if paragraph.startswith(sentence[:40]):
            return block
    return None


def _subtitle_from_summary(summary: str, vessel_name: str) -> str:
    if not summary:
        return "Overview"
    first = re.split(r"(?<=[.!?])\s", summary.strip())[0]
    if vessel_name:
        first = re.sub(rf"^On {re.escape(vessel_name)},\s*", "", first)
    first = first.strip().rstrip(".").strip()
    if first:
        first = first[0].upper() + first[1:]
    if len(first) > _SUBTITLE_MAX:
        first = first[:_SUBTITLE_MAX].rsplit(" ", 1)[0] + "…"
    return first or "Overview"


def _grouped_blocks(
    composed: dict[str, Any]
) -> tuple[str, dict[str, list[str]], list[str]]:
    """Return (title, {block: [paragraphs]}, ordered_extra_blocks)."""
    title, body = _split_title_and_body(str(composed.get("draft_markdown") or ""))
    block_index = _block_index(list(composed.get("provenance_map") or []))
    grouped: dict[str, list[str]] = {}
    seen_order: list[str] = []
    # Paragraphs begin with a verbatim provenance sentence. List items and
    # other continuation paragraphs have no sentence entry — they belong to the
    # block introduced by the paragraph above them (never a default bucket).
    last_block = "capability_summary"
    for para in _paragraphs(body):
        block = _block_for_paragraph(para, block_index) or last_block
        last_block = block
        if block not in grouped:
            grouped[block] = []
            seen_order.append(block)
        grouped[block].append(para)
    return title, grouped, seen_order


def _classify_paragraph(para: str) -> tuple[str, list[str] | None, str | None]:
    """Return (kind, items|None, prose|None).

    kind ∈ {prose, list, steps}. A mixed paragraph (intro + bullets) returns
    prose for the intro only when the remainder is a clean item list — callers
    should split via ``_split_intro_and_items`` first.
    """
    lines = [ln.strip() for ln in para.splitlines() if ln.strip()]
    if not lines:
        return "prose", None, ""

    bullet_items: list[str] = []
    numbered_items: list[str] = []
    for line in lines:
        b = _BULLET_LINE_RE.match(line)
        n = _NUMBERED_LINE_RE.match(line)
        if b:
            bullet_items.append(b.group(1).strip())
        elif n:
            numbered_items.append(n.group(1).strip())
        else:
            return "prose", None, para

    if bullet_items and not numbered_items and len(bullet_items) == len(lines):
        return "list", bullet_items, None
    if numbered_items and not bullet_items and len(numbered_items) == len(lines):
        return "steps", numbered_items, None
    return "prose", None, para


def _split_intro_and_items(para: str) -> list[str]:
    """Split a paragraph that has a prose intro followed by bullet/numbered lines."""
    lines = para.splitlines()
    item_start = None
    for i, raw in enumerate(lines):
        stripped = raw.strip()
        if not stripped:
            continue
        if _BULLET_LINE_RE.match(stripped) or _NUMBERED_LINE_RE.match(stripped):
            item_start = i
            break
    if item_start is None or item_start == 0:
        return [para]

    intro = "\n".join(lines[:item_start]).strip()
    rest = "\n".join(lines[item_start:]).strip()
    # Only split when the remainder classifies cleanly as list/steps.
    kind, _items, _ = _classify_paragraph(rest)
    if kind in ("list", "steps") and intro:
        return [intro, rest]
    return [para]


def _enrich_block_paragraphs(
    paragraphs: list[str], *, block: str, heading: str
) -> list[dict[str, Any]]:
    """Phase 1b A — expand one O3 block into prose / list / steps / warnings."""
    flat: list[str] = []
    for para in paragraphs:
        flat.extend(_split_intro_and_items(para))

    sections: list[dict[str, Any]] = []
    pending_items: list[str] = []
    pending_kind: str | None = None
    used_heading = False

    def flush() -> None:
        nonlocal pending_items, pending_kind, used_heading
        if not pending_items or not pending_kind:
            pending_items = []
            pending_kind = None
            return
        section_type = pending_kind
        if block == "troubleshooting" and pending_kind == "list":
            section_type = "warnings"
        if not used_heading:
            title = heading
            used_heading = True
        else:
            # Same O3 heading as the block; Know hides consecutive duplicate h3s.
            title = heading
        sections.append(
            {"t": title, "type": section_type, "items": list(pending_items)}
        )
        pending_items = []
        pending_kind = None

    for para in flat:
        kind, items, prose = _classify_paragraph(para)
        if kind in ("list", "steps") and items:
            if pending_kind and pending_kind != kind:
                flush()
            pending_kind = kind
            pending_items.extend(items)
            continue
        flush()
        text = prose if prose is not None else para
        if not text.strip():
            continue
        if sections and sections[-1]["type"] == "prose" and used_heading:
            sections[-1]["c"] = sections[-1]["c"] + "\n\n" + text
            continue
        title = heading
        used_heading = True
        sections.append({"t": title, "type": "prose", "c": text})

    flush()
    return sections


def _link_label(link: dict[str, Any]) -> str:
    return str(link.get("label") or link.get("phrase") or "").strip()


def _dedupe_guide_links(links: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Stable unique links by data_guide_link / target_id for the module."""
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for link in links or []:
        if not isinstance(link, dict):
            continue
        key = str(
            link.get("data_guide_link")
            or (
                f"{link.get('target_kind') or 'system'}:{link.get('target_id')}"
                if link.get("target_id")
                else ""
            )
        )
        if not key or key in seen:
            continue
        if not link.get("target_id") and not link.get("data_guide_link"):
            continue
        seen.add(key)
        out.append(
            {
                "target_kind": link.get("target_kind") or "system",
                "target_id": link.get("target_id"),
                "label": _link_label(link),
                "data_guide_link": link.get("data_guide_link") or key,
            }
        )
    return out


def _apply_guide_links_to_prose(
    text: str, links: list[dict[str, Any]]
) -> str | None:
    """Return HTML with ``data-guide-link`` anchors, or None if no phrase hit."""
    if not text or not links:
        return None
    # Longest label first so nested phrases don't partial-replace wrong.
    ordered = sorted(
        (L for L in links if _link_label(L)),
        key=lambda L: len(_link_label(L)),
        reverse=True,
    )
    # Work on plain text; escape then splice anchors at known plain offsets.
    hits: list[tuple[int, int, dict[str, Any]]] = []
    for link in ordered:
        label = _link_label(link)
        start = 0
        while True:
            idx = text.find(label, start)
            if idx < 0:
                break
            end = idx + len(label)
            # Skip if overlaps an earlier (longer) hit.
            if any(not (end <= a or idx >= b) for a, b, _ in hits):
                start = end
                continue
            hits.append((idx, end, link))
            start = end
    if not hits:
        return None
    hits.sort(key=lambda h: h[0])
    parts: list[str] = []
    cursor = 0
    for start, end, link in hits:
        parts.append(html.escape(text[cursor:start]))
        token = html.escape(
            str(link.get("data_guide_link") or f"system:{link.get('target_id')}")
        )
        parts.append(
            f'<span role="link" tabindex="0" class="guide-link" '
            f'data-guide-link="{token}">{html.escape(text[start:end])}</span>'
        )
        cursor = end
    parts.append(html.escape(text[cursor:]))
    # Preserve paragraph breaks for pre-line-equivalent HTML.
    body = "".join(parts).replace("\n\n", "</p><p>").replace("\n", "<br>\n")
    return f"<p>{body}</p>"


def _attach_html_links(
    sections: list[dict[str, Any]], links: list[dict[str, Any]]
) -> None:
    """Phase 1b B — add ``html`` on prose sections that contain xref labels."""
    if not links:
        return
    for section in sections:
        if section.get("type") != "prose":
            continue
        c = section.get("c")
        if not isinstance(c, str) or not c:
            continue
        rich = _apply_guide_links_to_prose(c, links)
        if rich:
            section["html"] = rich


def _synthesize_learn_checks(sections: list[dict[str, Any]]) -> list[str]:
    """Build Learn-the-Boat checks from which O3 blocks the module actually has."""
    titles = {(s.get("t") or "").strip() for s in sections}
    checks: list[str] = []
    if "How it works" in titles:
        checks.append("Can explain in one sentence what this system does on this boat")
    if "Turning it on" in titles:
        checks.append("Know how to turn this system on and shut it down safely")
    if "Monitoring" in titles:
        checks.append("Know where to read status, meters, or alerts for this system")
    if "Operating" in titles:
        checks.append("Can perform the main operating actions described in this chapter")
    if "If something's not right" in titles:
        checks.append("Know the first checks to run when something looks wrong")
    if "Care & upkeep" in titles:
        checks.append("Know the care or isolation points called out for this system")
    if "Solar charging" in titles:
        checks.append("Know how to check solar charge production on this boat")
    # Stable, short list for Learn UI.
    return checks[:6]


def _related_guide_links(section_id: str) -> list[dict[str, Any]]:
    """Fix It + Learn the Boat links for in-prose tappable Related section."""
    fix = format_fix_xref(_SYSTEM_FIX_CATEGORY.get(section_id))
    learn = format_learn_xref()
    return [
        {
            "target_kind": fix["target_kind"],
            "target_id": fix["target_id"],
            "label": fix["label"],
            "data_guide_link": fix["data_guide_link"],
        },
        {
            "target_kind": learn["target_kind"],
            "target_id": learn["target_id"],
            "label": learn["label"],
            "data_guide_link": learn["data_guide_link"],
        },
    ]


def _related_section(section_id: str, links: list[dict[str, Any]]) -> dict[str, Any]:
    """Prose pointing at Fix It and Learn — labels match ``links`` for HTML wrap."""
    fix = next((L for L in links if L.get("target_kind") == "fix"), None)
    learn = next((L for L in links if L.get("target_kind") == "learn"), None)
    fix_label = (fix or {}).get("label") or "Fix It tab"
    learn_label = (learn or {}).get("label") or "Learn the Boat checklist"
    text = (
        f"If something goes wrong with this system, open the {fix_label} "
        f"for quick troubleshooting cards.\n\n"
        f"When you are learning the boat, tick off this chapter on the "
        f"{learn_label}."
    )
    return {"t": "Related", "type": "prose", "c": text}


def _equipment_row_for_key(
    equipment_doc: dict[str, Any] | None, device_key: str
) -> dict[str, Any] | None:
    """Resolve an inventory row for a device or instance key."""
    key = str(device_key or "")
    if not key or not equipment_doc:
        return None
    rows = list(equipment_doc.get("equipment") or [])
    for row in rows:
        if str(row.get("device_key") or "") == key:
            return row
    base = key
    while True:
        stripped = re.sub(r"_\d+$", "", base)
        if stripped == base:
            break
        base = stripped
        for row in rows:
            if str(row.get("device_key") or "") == base:
                return row
            if str(row.get("catalog_key") or "") == base:
                return row
    for row in rows:
        if str(row.get("catalog_key") or "") == key:
            return row
    return None


def _device_display_name(
    equipment_doc: dict[str, Any] | None, device_key: str
) -> str:
    row = _equipment_row_for_key(equipment_doc, device_key)
    if row:
        mfr = str(row.get("manufacturer") or "").strip()
        model = str(row.get("model") or "").strip()
        if mfr and model:
            return f"{mfr} {model}"
        if model or mfr:
            return model or mfr
    return str(device_key or "").replace("_", " ").strip() or "Equipment"


def _equipment_locations_section(
    composed: dict[str, Any],
    equipment_doc: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Table of section devices that have registry location labels.

    Prefer devices cited in provenance (named/used in guest body). Fall back to
    ``full_keys`` when provenance has no ``graph.device:`` sources.
    """
    if not equipment_doc:
        return None
    cited: list[str] = []
    seen_keys: set[str] = set()
    for entry in composed.get("provenance_map") or []:
        for src in entry.get("sources") or []:
            text = str(src or "")
            if not text.startswith("graph.device:"):
                continue
            key = text.split(":", 1)[1].strip()
            if not key or key in seen_keys:
                continue
            seen_keys.add(key)
            cited.append(key)
    keys = cited or [str(k) for k in (composed.get("full_keys") or [])]
    rows: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for key in keys:
        labels = place_labels(places_for_device(equipment_doc, key))
        if not labels:
            continue
        name = _device_display_name(equipment_doc, key)
        location = " · ".join(labels)
        dedupe = (name.lower(), location.lower())
        if dedupe in seen:
            continue
        seen.add(dedupe)
        rows.append({"name": name, "location": location})
    if not rows:
        return None
    return {
        "t": "Equipment Locations",
        "type": "equipment_locations",
        "rows": rows,
    }


def solar_fold_sections(solar_composed: dict[str, Any]) -> list[dict[str, Any]]:
    """O1 — solar draft as one or more enriched sections (Phase 1b)."""
    _, body = _split_title_and_body(str(solar_composed.get("draft_markdown") or ""))
    body = body.strip()
    if not body:
        return []
    return _enrich_block_paragraphs(
        _paragraphs(body), block="reference", heading="Solar charging"
    )


def section_to_system_module(
    section_id: str,
    composed: dict[str, Any],
    *,
    extra_sections: list[dict[str, Any]] | None = None,
    equipment_doc: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Map a composed Stage 4 section to a validated-shape ``SystemModule``."""
    title, grouped, seen_order = _grouped_blocks(composed)
    vessel_name = str(composed.get("vessel_display_name") or "")

    summary = "\n\n".join(grouped.get("capability_summary", [])).strip()

    sections: list[dict[str, Any]] = []
    rendered_blocks: set[str] = {"capability_summary"}
    # Spine order first, then any non-spine blocks in first-seen order.
    for block in list(SECTION_SPINE) + [
        b for b in seen_order if b not in SECTION_SPINE
    ]:
        if block in rendered_blocks or block not in grouped:
            continue
        rendered_blocks.add(block)
        heading = BLOCK_HEADINGS.get(block, block.replace("_", " ").capitalize())
        sections.extend(
            _enrich_block_paragraphs(
                grouped[block], block=block, heading=heading
            )
        )

    if extra_sections:
        sections.extend(extra_sections)

    locations = _equipment_locations_section(composed, equipment_doc)
    if locations:
        sections.append(locations)

    related_links = _related_guide_links(section_id)
    sections.append(_related_section(section_id, related_links))

    guide_links = _dedupe_guide_links(
        list(composed.get("guide_links") or []) + related_links
    )
    _attach_html_links(sections, guide_links)

    meta = SYSTEM_CATALOG.get(section_id, {})
    locs = list(meta.get("locs") or [])
    learn_checks = _synthesize_learn_checks(sections)

    module: dict[str, Any] = {
        "id": section_id,
        "icon": meta.get("icon") or _DEFAULT_ICON,
        "title": title or meta.get("review_title") or section_id.title(),
        "subtitle": _subtitle_from_summary(summary, vessel_name),
        "summary": summary,
        "sections": sections,
    }
    if locs:
        module["locs"] = locs
    if learn_checks:
        module["learnChecks"] = learn_checks
    if guide_links:
        module["guideLinks"] = guide_links

    if not module["summary"]:
        raise SectionTransformError(
            f"section {section_id!r} produced no capability summary"
        )
    if not module["sections"]:
        raise SectionTransformError(
            f"section {section_id!r} produced no body sections"
        )
    return module


def extract_module_metadata(
    section_id: str, composed: dict[str, Any]
) -> dict[str, Any]:
    """Decision 2 — audit trail kept out of the client payload (except links).

    ``guide_links`` are also copied onto the published module (Phase 1b B) but
    remain here for the generation-run record.
    """
    return {
        "section_id": section_id,
        "version": composed.get("version"),
        "provenance_map": composed.get("provenance_map") or [],
        "guide_links": composed.get("guide_links") or [],
        "wisdom_slot": composed.get("wisdom_slot"),
        "fact_queries": composed.get("fact_queries") or [],
        "evaluation": composed.get("evaluation"),
    }
