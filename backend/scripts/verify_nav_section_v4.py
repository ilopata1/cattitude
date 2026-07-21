"""Verify Navigation section inputs + composition (founding v4.37).

Usage (from backend/):
  python scripts/verify_nav_section_v4.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_composition_rules import assess_global_composition
from guide_section_nav import compose_nav_section, evaluate_nav_draft
from section_inputs import assemble_section_inputs, keys_at_depth
from system_graph import build_vessel_graph

OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"
EXPECT = _BACKEND / "tests" / "fixtures" / "nav_section_v4_expectations.json"


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

    inputs = assemble_section_inputs(graph, "nav", equipment_doc=equipment_doc)
    got = {c["device_key"]: c["depth"] for c in inputs["contributors"]}
    exp = {
        c["device_key"]: c["depth"]
        for c in expect["expected_inputs"]["contributors"]
    }
    if got != exp:
        failures.append(f"nav inputs mismatch got={got} expected={exp}")
    else:
        print("OK — nav input set matches fixture")

    for key in expect.get("must_exclude_from_body_depth") or []:
        if got.get(key) in {"full", "summary"}:
            failures.append(f"{key} must not be full/summary depth")

    for name in expect.get("required_present_pages") or []:
        present_names = {
            str(p.get("name")) for p in inputs.get("present_platform_pages") or []
        }
        if name not in present_names:
            failures.append(f"missing present page {name!r}")

    composed = compose_nav_section(
        graph=graph,
        profiles=profiles,
        equipment_doc=equipment_doc,
        section_inputs=inputs,
    )
    evaluation = evaluate_nav_draft(
        composed, expected_inputs=expect["expected_inputs"]
    )

    draft = composed["draft_markdown"]
    for s in expect["forbidden_prose_substrings"]:
        if s.lower() in draft.lower():
            failures.append(f"forbidden prose: {s!r}")

    if not evaluation.get("pass"):
        failures.append(f"evaluation failed: {evaluation.get('notes')}")

    global_comp = assess_global_composition(composed, require_filled_wisdom=False)
    if not global_comp.get("pass"):
        failures.append(f"global composition failed: {global_comp.get('findings')}")

    link_targets = {
        str(link.get("target_id"))
        for link in (composed.get("guide_links") or [])
        if link.get("target_kind") == "system"
    }
    for tid in expect.get("expected_guide_link_targets") or []:
        if tid not in link_targets:
            failures.append(f"missing guide_link target_id={tid!r}")

    if "section of this guide" not in draft.lower():
        failures.append("expected reader-facing section xref phrase")
    if "lives in" in draft.lower() or "home procedures" in draft.lower():
        failures.append("authorial xref phrasing leaked into draft")

    style = evaluation.get("style_warnings") or []
    authorial = [w for w in style if w.get("code") == "authorial_xref_voice"]
    if authorial:
        failures.append(f"authorial xref voice still present: {authorial}")

    for qid in expect.get("expected_fact_query_ids") or []:
        got_ids = {
            str(q.get("id"))
            for q in (composed.get("fact_queries") or [])
            if isinstance(q, dict)
        }
        if qid not in got_ids:
            failures.append(f"missing fact_query id={qid!r}")

    if "day-to-day" in draft.lower():
        failures.append("routine timing label 'day-to-day' still present")
    if "when czone is commissioned" in draft.lower():
        failures.append("CZone commissioned hedge still present")

    if failures:
        print("FAIL:")
        for f in failures:
            print(" -", f)
        print(draft)
        print(json.dumps(evaluation, indent=2))
        return 1

    print("OK — nav v4.37 composition + founding criteria")
    print("style_warnings:", json.dumps(style, indent=2))
    print("guide_links:", json.dumps(composed.get("guide_links") or [], indent=2))
    print("wisdom_slot:", json.dumps(composed.get("wisdom_slot") or {}, indent=2))
    print("full:", keys_at_depth(inputs, "full"))
    print("provenance:", keys_at_depth(inputs, "provenance"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
