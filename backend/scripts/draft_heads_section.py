"""Draft Heads & waste Stage 4 section for Outremer / Supernova (frozen tip v4.45).

Persists ``heads_section_inputs.json`` beside the draft for input-set review.

Review markdown includes the Equipment Locations table (same chip other
sections emit via ``section_to_system_module``) above narrative prose —
locations must not appear inline in capability text.

Usage (from backend/):
  python scripts/draft_heads_section.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_section_solar import VesselNameMissing
from guide_section_heads import compose_heads_section, evaluate_heads_draft
from guide_section_to_module import _equipment_locations_section
from section_inputs import assemble_section_inputs
from system_graph import build_vessel_graph

OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"
OUT_DIR = _BACKEND / "fixtures" / "pipeline" / "scratch"
OUT_JSON = OUT_DIR / "heads_section_draft_v4.json"
OUT_MD = OUT_DIR / "heads_section_draft_v4.md"
OUT_INPUTS = OUT_DIR / "heads_section_inputs.json"


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _locations_markdown(locations: dict | None) -> str:
    if not locations or not locations.get("rows"):
        return ""
    lines = [
        "## Equipment Locations",
        "",
        "| Equipment | Location |",
        "| --- | --- |",
    ]
    for row in locations["rows"]:
        name = str(row.get("name") or "").replace("|", "\\|")
        loc = str(row.get("location") or "").replace("|", "\\|")
        lines.append(f"| {name} | {loc} |")
    lines.append("")
    return "\n".join(lines)


def _review_markdown(composed: dict, equipment_doc: dict) -> str:
    """Title + Equipment Locations table + narrative body (prose-only body)."""
    raw = str(composed.get("draft_markdown") or "").strip()
    title = "# Heads & waste"
    body = raw
    if raw.startswith("#"):
        first, _, rest = raw.partition("\n")
        title = first.strip() or title
        body = rest.lstrip("\n")
    locations = _equipment_locations_section(composed, equipment_doc)
    table = _locations_markdown(locations)
    parts = [title, ""]
    if table:
        parts.append(table.rstrip())
        parts.append("")
    parts.append(body.rstrip())
    parts.append("")
    return "\n".join(parts)


def main() -> int:
    equipment_doc = _load(OUTREMER / "equipment.json")
    profiles = _load(OUTREMER / "profiles.json")
    graph = build_vessel_graph(
        list(equipment_doc["equipment"]),
        profiles,
        relations=list(equipment_doc.get("relations") or []),
        equipment_doc=equipment_doc,
        vessel_artifact_facts=equipment_doc.get("vessel_artifact_facts"),
    )
    inputs = assemble_section_inputs(graph, "heads", equipment_doc=equipment_doc)
    try:
        composed = compose_heads_section(
            graph=graph,
            profiles=profiles,
            equipment_doc=equipment_doc,
            section_inputs=inputs,
        )
    except VesselNameMissing as exc:
        print(f"BLOCKED — {exc}")
        return 2

    expect_path = (
        _BACKEND / "tests" / "fixtures" / "heads_section_v4_expectations.json"
    )
    expected = _load(expect_path) if expect_path.is_file() else {}
    evaluation = evaluate_heads_draft(
        composed, expected_inputs=expected.get("expected_inputs")
    )
    locations = _equipment_locations_section(composed, equipment_doc)
    review_md = _review_markdown(composed, equipment_doc)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_INPUTS.write_text(
        json.dumps(inputs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    payload = {
        "section": "heads",
        "version": composed.get("version") or "v4.0-founding",
        "freeze_status": composed.get("freeze_status"),
        "vessel": equipment_doc.get("vessel"),
        "vessel_display_name": composed.get("vessel_display_name"),
        "draft_markdown": composed["draft_markdown"],
        "review_markdown": review_md,
        "equipment_locations": locations,
        "provenance_map": composed["provenance_map"],
        "section_inputs": inputs,
        "evaluation": evaluation,
        "block_order": composed.get("block_order"),
        "guide_links": composed.get("guide_links"),
        "wisdom_slot": composed.get("wisdom_slot"),
        "context_shaping_consumed": composed.get("context_shaping_consumed"),
        "fact_queries": composed.get("fact_queries"),
        "excluded_candidates": composed.get("excluded_candidates"),
        "valve_places_present": composed.get("valve_places_present"),
    }
    OUT_JSON.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    OUT_MD.write_text(review_md, encoding="utf-8")

    print(review_md)
    print("\n--- inputs ---")
    for c in inputs["contributors"]:
        print(f"  {c['depth']:11} {c['device_key']} ({c['reason']})")
    print("\n--- fact_queries ---")
    for q in composed.get("fact_queries") or []:
        print(f"  {q.get('id')}: {q.get('query')}")
    print("\n--- evaluation ---")
    print(json.dumps(evaluation, indent=2))
    print(f"\nWrote {OUT_JSON}, {OUT_MD}, {OUT_INPUTS}")
    return 0 if evaluation.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())
