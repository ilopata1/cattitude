"""Draft Water systems Stage 4 section for Outremer / Supernova.

Usage (from backend/):
  python scripts/draft_water_section.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_section_solar import VesselNameMissing
from guide_section_water import compose_water_section, evaluate_water_draft
from section_inputs import assemble_section_inputs
from system_graph import build_vessel_graph

OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"
OUT_DIR = _BACKEND / "fixtures" / "pipeline" / "scratch"
OUT_JSON = OUT_DIR / "water_section_draft_v4.json"
OUT_MD = OUT_DIR / "water_section_draft_v4.md"
OUT_INPUTS = OUT_DIR / "water_section_inputs.json"


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


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
    inputs = assemble_section_inputs(graph, "water", equipment_doc=equipment_doc)
    try:
        composed = compose_water_section(
            graph=graph,
            profiles=profiles,
            equipment_doc=equipment_doc,
            section_inputs=inputs,
        )
    except VesselNameMissing as exc:
        print(f"BLOCKED — {exc}")
        return 2

    expect_path = (
        _BACKEND / "tests" / "fixtures" / "water_section_v4_expectations.json"
    )
    expected = _load(expect_path) if expect_path.is_file() else {}
    evaluation = evaluate_water_draft(
        composed, expected_inputs=expected.get("expected_inputs")
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_INPUTS.write_text(
        json.dumps(inputs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    payload = {
        "section": "water",
        "version": composed.get("version") or "v4.1",
        "vessel": equipment_doc.get("vessel"),
        "vessel_display_name": composed.get("vessel_display_name"),
        "draft_markdown": composed["draft_markdown"],
        "provenance_map": composed["provenance_map"],
        "section_inputs": inputs,
        "evaluation": evaluation,
        "block_order": composed.get("block_order"),
        "guide_links": composed.get("guide_links"),
        "wisdom_slot": composed.get("wisdom_slot"),
        "context_shaping_consumed": composed.get("context_shaping_consumed"),
        "fact_queries": composed.get("fact_queries"),
        "excluded_candidates": composed.get("excluded_candidates"),
    }
    OUT_JSON.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    OUT_MD.write_text(composed["draft_markdown"] + "\n", encoding="utf-8")

    print(composed["draft_markdown"])
    print("\n--- inputs ---")
    for c in inputs["contributors"]:
        print(f"  {c['depth']:11} {c['device_key']} ({c['reason']})")
    print("\n--- evaluation ---")
    print(json.dumps(evaluation, indent=2))
    print(f"\nWrote {OUT_JSON}, {OUT_MD}, {OUT_INPUTS}")
    return 0 if evaluation.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())
