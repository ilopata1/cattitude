"""Phase 1 transform: Stage 4 composer output -> live ``SystemModule`` payload.

The frozen ``compose_*_section`` composers return a prose ``draft_markdown``
plus a ``provenance_map`` (sentence -> block). The live product stores/serves
structured ``SystemModule`` objects validated by
``guide_generation._validate_system_module`` and rendered by the mobile client.

This module maps one to the other, per the locked Phase 1 decisions:
  * decision 1 — titled paragraphs now (each block -> one ``prose`` section).
  * decision 2 — provenance / links / fact_queries are NOT part of the module
    payload; ``extract_module_metadata`` returns them for the generation run.
  * O1 — solar folds into the ``batteries`` module as a "Solar charging" section.
  * O2 — subtitle synthesized from the capability summary.
  * O3 — block heading labels below.

Pure functions only; no DB access. See ``guide-stage4-integration-plan.md``.
"""

from __future__ import annotations

import re
from typing import Any

from guide_composition_rules import SECTION_SPINE, normalize_block
from guide_module_catalog import SYSTEM_CATALOG

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

# Composers store config-pending notes with a marker token in the provenance
# ``sentence`` but render them as "(Configuration pending) ..." in the draft.
# Mirror that rendering so those paragraphs match their true block.
_CONFIG_PLACEHOLDER_MARKER = "[[CONFIG_PENDING]]"


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
) -> tuple[list[str], dict[str, list[str]], str]:
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
    return title, grouped, seen_order  # type: ignore[return-value]


def solar_fold_section(solar_composed: dict[str, Any]) -> dict[str, Any] | None:
    """O1 — the whole solar draft as one "Solar charging" prose section."""
    _, body = _split_title_and_body(str(solar_composed.get("draft_markdown") or ""))
    body = body.strip()
    if not body:
        return None
    return {"t": "Solar charging", "type": "prose", "c": body}


def section_to_system_module(
    section_id: str,
    composed: dict[str, Any],
    *,
    extra_sections: list[dict[str, Any]] | None = None,
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
        sections.append(
            {"t": heading, "type": "prose", "c": "\n\n".join(grouped[block])}
        )

    if extra_sections:
        sections.extend(extra_sections)

    meta = SYSTEM_CATALOG.get(section_id, {})
    module = {
        "id": section_id,
        "icon": meta.get("icon") or _DEFAULT_ICON,
        "title": title or meta.get("review_title") or section_id.title(),
        "subtitle": _subtitle_from_summary(summary, vessel_name),
        "summary": summary,
        "sections": sections,
    }

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
    """Decision 2 — audit trail kept out of the client payload.

    Returned for storage on the generation run / owner-questions store, not in
    the published module.
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
