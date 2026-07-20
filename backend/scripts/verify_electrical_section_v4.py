"""Verify Electrical section inputs + composition (criteria lvi–lxi).

Usage (from backend/):
  python scripts/verify_electrical_section_v4.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_section_electrical import (
    compose_electrical_section,
    evaluate_electrical_draft,
)
from section_inputs import assemble_section_inputs
from system_graph import build_vessel_graph

OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"
EXPECT = _BACKEND / "tests" / "fixtures" / "electrical_section_v4_expectations.json"


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    failures: list[str] = []
    expect = _load(EXPECT)
    equipment_doc = _load(OUTREMER / "equipment.json")
    profiles = _load(OUTREMER / "profiles.json")
    graph = build_vessel_graph(
        list(equipment_doc["equipment"]),
        profiles,
        relations=list(equipment_doc.get("relations") or []),
        equipment_doc=equipment_doc,
        vessel_artifact_facts=equipment_doc.get("vessel_artifact_facts"),
    )

    inputs = assemble_section_inputs(
        graph, "electrical", equipment_doc=equipment_doc
    )
    got = {c["device_key"]: c["depth"] for c in inputs["contributors"]}
    exp = {
        c["device_key"]: c["depth"]
        for c in expect["expected_inputs"]["contributors"]
    }
    if got != exp:
        failures.append(f"electrical inputs mismatch got={got} expected={exp}")
    else:
        print("OK — electrical input set matches fixture (lvi)")

    composed = compose_electrical_section(
        graph=graph,
        profiles=profiles,
        equipment_doc=equipment_doc,
        section_inputs=inputs,
    )
    evaluation = evaluate_electrical_draft(
        composed, expected_inputs=expect.get("expected_inputs")
    )
    if not evaluation.get("pass"):
        failures.append(
            f"evaluation failed: {json.dumps(evaluation.get('checks'), indent=2)}"
        )
    else:
        print("OK — electrical v4.36 composition + lvi–lxvi/lxviii–lxix")

    draft = str(composed.get("draft_markdown") or "").lower()
    for s in expect.get("forbidden_prose_substrings") or []:
        if s.lower() in draft:
            failures.append(f"forbidden prose: {s!r}")

    link_targets = {
        str(link.get("target_id"))
        for link in (composed.get("guide_links") or [])
        if link.get("target_kind") == "system"
    }
    for tid in expect.get("expected_guide_link_targets") or []:
        if tid not in link_targets:
            failures.append(f"missing guide_link target {tid}")

    print("guide_links:", json.dumps(composed.get("guide_links"), indent=2))
    print("style_warnings:", evaluation.get("style_warnings"))
    print("wisdom_slot:", json.dumps(composed.get("wisdom_slot"), indent=2))
    print("full:", composed.get("full_keys"))

    if failures:
        for f in failures:
            print("FAIL —", f, file=sys.stderr)
        return 1
    print("OK — electrical section v4.36")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
