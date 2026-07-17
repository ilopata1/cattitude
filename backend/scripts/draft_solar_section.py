"""Stage 4 Solar section composition pilot v4.

Requires vessel_display_name on the vessel fixture — never invents a boat name.

Usage (from backend/):
  python scripts/draft_solar_section.py
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from content_tiers import assign_content_tiers
from guide_section_solar import (
    VesselNameMissing,
    compose_solar_section,
    evaluate_solar_draft,
)
from system_graph import build_vessel_graph

OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"
LAST_GREEN = _BACKEND / "fixtures" / "pipeline" / "last_green"
OUT = _BACKEND / "fixtures" / "pipeline" / "scratch" / "solar_section_draft_v4.json"


def _load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _enrich_solar_profiles(
    profiles: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    out = {k: deepcopy(v) for k, v in profiles.items()}
    lg = LAST_GREEN / "victron_mppt" / "profile.json"
    if lg.is_file() and "victron_mppt" in out:
        live = _load(lg)
        live["source"] = "live_extraction"
        live["device"] = dict(
            out["victron_mppt"].get("device") or live.get("device") or {}
        )
        live["device"]["model"] = "SmartSolar MPPT 75/15"
        out["victron_mppt"] = live
    p150 = out.get("victron_mppt_150_60") or {}
    if p150 and not any(
        isinstance(s, dict)
        and "victronconnect" in str(s.get("label_verbatim") or "").lower()
        for s in (p150.get("control_surfaces") or [])
    ):
        donor = out.get("victron_mppt") or {}
        surfaces = [
            dict(s)
            for s in (donor.get("control_surfaces") or [])
            if isinstance(s, dict)
            and str(s.get("surface") or "").startswith("mobile_app")
        ]
        actions = [
            dict(a)
            for a in (donor.get("operator_actions") or [])
            if isinstance(a, dict)
            and a.get("context") == "daily"
            and (
                "victronconnect" in str(a.get("action") or "").lower()
                or "monitor" in str(a.get("action") or "").lower()
            )
        ][:2]
        if surfaces:
            p150 = dict(p150)
            p150["control_surfaces"] = surfaces
            for i, s in enumerate(p150["control_surfaces"]):
                s["path"] = f"control_surfaces[{i}]"
            if actions:
                p150["operator_actions"] = actions
            p150.setdefault("networks", donor.get("networks") or p150.get("networks"))
            out["victron_mppt_150_60"] = p150
    return out


def main() -> int:
    equipment_doc = _load(OUTREMER / "equipment.json")
    if not str(equipment_doc.get("vessel_display_name") or "").strip():
        print(
            "BLOCKED — Outremer fixture has no vessel_display_name "
            f"(key={equipment_doc.get('vessel')!r}).\n"
            "Supply the boat's name to add as vessel_display_name; "
            "composition will not invent one.\n"
            "Regression rules still verified via:\n"
            "  python scripts/verify_solar_section_v4.py"
        )
        return 2

    profiles = _enrich_solar_profiles(_load(OUTREMER / "profiles.json"))
    graph = build_vessel_graph(
        list(equipment_doc["equipment"]),
        profiles,
        relations=list(equipment_doc.get("relations") or []),
        equipment_doc=equipment_doc,
        vessel_artifact_facts=equipment_doc.get("vessel_artifact_facts"),
    )
    tiers = assign_content_tiers(graph)
    try:
        composed = compose_solar_section(
            graph=graph,
            profiles=profiles,
            equipment_doc=equipment_doc,
            tiers=tiers,
        )
    except VesselNameMissing as exc:
        print(f"BLOCKED — {exc}")
        return 2

    evaluation = evaluate_solar_draft(composed)
    payload = {
        "section": "solar",
        "version": "v4",
        "vessel": equipment_doc.get("vessel"),
        "vessel_display_name": composed.get("vessel_display_name"),
        "draft_markdown": composed["draft_markdown"],
        "provenance_map": composed["provenance_map"],
        "evaluation": evaluation,
        "block_order": composed.get("block_order"),
        "flag_facts_in_provenance": composed.get("flag_facts_in_provenance"),
        "context_shaping_consumed": composed.get("context_shaping_consumed"),
        "obsoleted_v3_criteria": evaluation.get("obsoleted_criteria"),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    md_path = OUT.with_suffix(".md")
    md_path.write_text(composed["draft_markdown"] + "\n", encoding="utf-8")

    print(composed["draft_markdown"])
    print("\n--- provenance map ---")
    for row in composed["provenance_map"]:
        kind = row.get("kind") or "sourced"
        block = row.get("block") or ""
        print(f"[{row['id']}] ({block}/{kind}) {row['sentence'][:110]}")
        for cite in row.get("sources") or []:
            print(f"    ← {cite}")
        for cite in row.get("provenance_metadata") or []:
            print(f"    ⋯ meta {cite}")
    print("\n--- evaluation ---")
    print(json.dumps(evaluation, indent=2))
    print(f"\nWrote {OUT}")
    return 0 if evaluation.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())
