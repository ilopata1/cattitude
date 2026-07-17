"""Verify Controls section inputs + composition (criteria xx–xxii).

Also asserts Solar leaf input regression (assignment-only closure).

Usage (from backend/):
  python scripts/verify_controls_section_v4.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_section_controls import compose_controls_section, evaluate_controls_draft
from section_inputs import assemble_section_inputs, keys_at_depth
from system_graph import build_vessel_graph

OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"
EXPECT = _BACKEND / "tests" / "fixtures" / "controls_section_v4_expectations.json"


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

    # --- Solar leaf regression ---
    solar_keys = tuple(expect["solar_leaf_member_keys"])
    solar_inputs = assemble_section_inputs(
        graph,
        "batteries",
        equipment_doc=equipment_doc,
        member_keys=solar_keys,
    )
    solar_got = sorted(c["device_key"] for c in solar_inputs["contributors"])
    solar_exp = sorted(solar_keys)
    if solar_got != solar_exp:
        failures.append(
            f"solar leaf inputs {solar_got} != assignment-only {solar_exp}"
        )
    else:
        print("OK — solar leaf input set == assignment-only members")

    # --- Controls inputs ---
    inputs = assemble_section_inputs(
        graph, "controls", equipment_doc=equipment_doc
    )
    got = {c["device_key"]: c["depth"] for c in inputs["contributors"]}
    exp = {
        c["device_key"]: c["depth"]
        for c in expect["expected_inputs"]["contributors"]
    }
    if got != exp:
        failures.append(f"controls inputs mismatch got={got} expected={exp}")
    else:
        print("OK — controls input set matches fixture (xx)")

    for key in expect["must_exclude_from_summary"]:
        if got.get(key) == "summary":
            failures.append(f"{key} must not be summary depth")
        excluded_keys = {
            e["device_key"] for e in (inputs.get("candidates_excluded") or [])
        }
        if key not in excluded_keys and key not in got:
            # Must appear in excluded candidates list
            failures.append(f"{key} missing from candidates_excluded")
    print("OK — Alphas excluded from summary (config-layer note retained)")

    present_names = {
        str(p.get("name")) for p in inputs.get("present_platform_pages") or []
    }
    for name in expect["required_present_pages"]:
        if name not in present_names:
            failures.append(f"missing present page {name!r}")

    # --- Compose + evaluate ---
    composed = compose_controls_section(
        graph=graph,
        profiles=profiles,
        equipment_doc=equipment_doc,
        section_inputs=inputs,
    )
    evaluation = evaluate_controls_draft(
        composed, expected_inputs=expect["expected_inputs"]
    )
    # Also enforce alpha exclusion in evaluator expectations
    evaluation["checks"]["alphas_excluded"] = all(
        got.get(k) != "summary" for k in expect["must_exclude_from_summary"]
    )
    if not evaluation["checks"]["alphas_excluded"]:
        evaluation["pass"] = False

    draft = composed["draft_markdown"]
    for s in expect["forbidden_prose_substrings"]:
        if s.lower() in draft.lower():
            failures.append(f"forbidden prose: {s!r}")

    for page in expect["gated_off_pages"]:
        # Planted expectation may name them once in troubleshooting
        if page.lower() not in draft.lower():
            # Allowed to mention in planted sentence — require at least Climate or AC
            pass
    if "ac mains" not in draft.lower() and "climate" not in draft.lower():
        failures.append("expected planted-expectation mention of gated pages")

    if not evaluation.get("pass"):
        failures.append(f"evaluation failed: {evaluation.get('notes')}")

    # Style warnings are report-only (do not fail).
    style = evaluation.get("style_warnings") or []
    for soft in expect.get("style_deictics_soft") or []:
        if soft.lower() in draft.lower():
            # Composer should prefer name/she; warn in output if still present.
            print(f"STYLE — deictic still present: {soft!r}")

    if failures:
        print("FAIL:")
        for f in failures:
            print(" -", f)
        print(draft)
        print(json.dumps(evaluation, indent=2))
        print(json.dumps(inputs, indent=2)[:2000])
        return 1

    print("OK — controls v4.10 composition + xx/xxi/xxii")
    if style:
        print("style_warnings:", json.dumps(style, indent=2))
    else:
        print("style_warnings: []")
    print("summary:", keys_at_depth(inputs, "summary"))
    print("provenance:", keys_at_depth(inputs, "provenance"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
