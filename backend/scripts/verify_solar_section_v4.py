"""Verify Solar v4 composition rules against expectations fixture.

Uses a synthetic vessel_display_name (never invents for Outremer). Asserts
absence/context_shaping policy, task ordering, and vocabulary lint.

Usage (from backend/):
  python scripts/verify_solar_section_v4.py
"""

from __future__ import annotations

import json
import re
import sys
from copy import deepcopy
from pathlib import Path

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
EXPECT = _BACKEND / "tests" / "fixtures" / "solar_section_v4_expectations.json"
LAST_GREEN = _BACKEND / "fixtures" / "pipeline" / "last_green"


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _enrich(profiles: dict) -> dict:
    out = {k: deepcopy(v) for k, v in profiles.items()}
    lg = LAST_GREEN / "victron_mppt" / "profile.json"
    if lg.is_file() and "victron_mppt" in out:
        live = _load(lg)
        live["device"] = dict(out["victron_mppt"].get("device") or live.get("device") or {})
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
        if surfaces:
            p150 = dict(p150)
            p150["control_surfaces"] = surfaces
            out["victron_mppt_150_60"] = p150
    return out


def main() -> int:
    failures: list[str] = []
    expect = _load(EXPECT)

    raw = _load(OUTREMER / "equipment.json")
    recorded = str(raw.get("vessel_display_name") or "").strip()
    if recorded != "Supernova":
        failures.append(
            f"Outremer vessel_display_name expected 'Supernova', got {recorded!r}"
        )
    else:
        print("OK — vessel_display_name=Supernova recorded")

    # Missing name must still hard-fail (strip for the negative path)
    unnamed = deepcopy(raw)
    unnamed.pop("vessel_display_name", None)
    unnamed.pop("vessel_name", None)
    unnamed.pop("display_name", None)
    try:
        profiles = _enrich(_load(OUTREMER / "profiles.json"))
        graph = build_vessel_graph(
            list(unnamed["equipment"]),
            profiles,
            relations=list(unnamed.get("relations") or []),
            equipment_doc=unnamed,
            vessel_artifact_facts=unnamed.get("vessel_artifact_facts"),
        )
        compose_solar_section(
            graph=graph,
            profiles=profiles,
            equipment_doc=unnamed,
        )
        failures.append("expected VesselNameMissing when display name absent")
    except VesselNameMissing:
        print("OK — missing vessel_display_name raises VesselNameMissing")

    # Named compose + evaluate (live fixture name)
    named = deepcopy(raw)
    if not named.get("vessel_display_name"):
        named["vessel_display_name"] = expect["synthetic_vessel_display_name"]
    profiles = _enrich(_load(OUTREMER / "profiles.json"))
    graph = build_vessel_graph(
        list(named["equipment"]),
        profiles,
        relations=list(named.get("relations") or []),
        equipment_doc=named,
        vessel_artifact_facts=named.get("vessel_artifact_facts"),
    )
    tiers = assign_content_tiers(graph)
    composed = compose_solar_section(
        graph=graph,
        profiles=profiles,
        equipment_doc=named,
        tiers=tiers,
    )
    evaluation = evaluate_solar_draft(composed)
    draft = composed["draft_markdown"]

    if "Supernova" not in draft and named.get("vessel_display_name") == "Supernova":
        failures.append("draft does not name Supernova")

    for s in expect["forbidden_prose_substrings"]:
        if s.lower() in draft.lower():
            failures.append(f"forbidden prose present: {s!r}")

    for b in expect["forbidden_block_names"]:
        if b in (composed.get("block_order") or []):
            failures.append(f"obsolete block present: {b}")

    prefix = expect["required_block_order_prefix"]
    order = composed.get("block_order") or []
    if order[: len(prefix)] != prefix:
        failures.append(f"block order prefix {order[: len(prefix)]} != {prefix}")

    prov_keys = composed.get("flag_facts_in_provenance") or {}
    for key in expect["required_provenance_fact_keys_on_monitoring"]:
        if key not in prov_keys:
            failures.append(f"missing provenance key {key}")

    # Prose economy (xvii–xix)
    for sentence in draft.split("\n\n"):
        if sentence.startswith("#"):
            continue
        n = len(re.findall(r"\([^)]*\)", sentence))
        if n > expect.get("max_parentheticals_per_sentence", 1):
            failures.append(f"too many parentheticals ({n}): {sentence[:90]}")

    economy = evaluation.get("prose_economy") or {}
    if economy.get("source_citations"):
        failures.append(f"source citations in prose: {economy['source_citations']}")
    if economy.get("restatement"):
        failures.append(f"restatement markers: {economy['restatement']}")
    if not evaluation.get("checks", {}).get("confidence_via_phrasing", True):
        failures.append("criterion xvii failed")
    if not evaluation.get("checks", {}).get("one_parenthetical_max", True):
        failures.append("criterion xviii failed")
    if not evaluation.get("checks", {}).get("no_clause_restatement", True):
        failures.append("criterion xix failed")

    if not evaluation.get("pass"):
        failures.append(f"evaluation failed: {evaluation.get('notes')}")

    for row in composed.get("provenance_map") or []:
        if row.get("kind") == "flag_prose" and (
            "gx" in row["sentence"].lower() or "mppt control" in row["sentence"].lower()
        ):
            failures.append(f"absence rendered as sentence: {row['sentence'][:80]}")

    if failures:
        print("FAIL:")
        for f in failures:
            print(" -", f)
        print(draft)
        print(json.dumps(evaluation, indent=2))
        return 1

    print("OK — solar v4 composition expectations")
    print("block_order:", order)
    print("evaluation pass:", evaluation.get("pass"))
    print("obsoleted:", evaluation.get("obsoleted_criteria"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
