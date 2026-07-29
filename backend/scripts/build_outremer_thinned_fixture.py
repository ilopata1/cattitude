"""Build outremer_thinned — synthetic Phase 4 vessel B (same-family, fewer plant).

Removes radar, Watchkeeper, coachroof MPPT, and one Combi instance from the
Outremer fixture. Profiles library is shared (unused models are harmless).

Usage (from backend/):
  python scripts/build_outremer_thinned_fixture.py
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"
THINNED = _BACKEND / "fixtures" / "pipeline" / "outremer_thinned"

DROP_DEVICE_KEYS = frozenset(
    {
        "bg_halo_20_plus",
        "sea_ai_watchkeeper",
        "victron_mppt",  # coachroof array controller
    }
)

DROP_VESSEL_FACT_IDS = frozenset(
    {
        "watchkeeper_ui_on_zeus",
        "solar_coachroof_array_observation",
        "solar_coachroof_yield_inference",
    }
)


def main() -> int:
    equipment_doc = json.loads((OUTREMER / "equipment.json").read_text(encoding="utf-8"))
    doc = copy.deepcopy(equipment_doc)
    doc["vessel"] = "outremer_thinned"
    doc["vessel_display_name"] = "Sister Test"
    doc["notes"] = (
        "Phase 4 synthetic vessel B — thinned Outremer plant for composer "
        "generalization smoke tests (one Combi, davit MPPT only, no radar/Watchkeeper)."
    )

    kept: list[dict] = []
    for row in doc.get("equipment") or []:
        key = str(row.get("device_key") or "")
        if key in DROP_DEVICE_KEYS:
            continue
        if key == "mass_combi_pro":
            row = copy.deepcopy(row)
            row["quantity"] = 1
            inst = list(row.get("instances") or [])
            row["instances"] = inst[:1]
            if inst:
                row["instances"][0] = copy.deepcopy(inst[0])
                row["instances"][0]["instance_key"] = "mass_combi_pro_1"
            rels = row.get("relations") or []
            row["relations"] = [
                r
                for r in rels
                if not (
                    isinstance(r, dict)
                    and r.get("kind") == "parallel_synchronized"
                    and len(r.get("members") or []) > 1
                )
            ]
        kept.append(row)
    doc["equipment"] = kept

    facts = []
    for f in doc.get("vessel_facts") or []:
        if str(f.get("id") or "") in DROP_VESSEL_FACT_IDS:
            continue
        fact = copy.deepcopy(f)
        if str(fact.get("id") or "") == "solar_array_wattage_inventory":
            wattage = dict(fact.get("wattage_kw") or {})
            wattage.pop("coachroof", None)
            fact["wattage_kw"] = wattage
            applies = [
                a
                for a in (fact.get("applies_to") or [])
                if a not in DROP_DEVICE_KEYS and a != "victron_mppt"
            ]
            fact["applies_to"] = applies
            text = str(fact.get("text") or "")
            if "coachroof" in text.lower():
                fact["text"] = (
                    "Array survey estimate: davit ~1.0–1.2 kW primary "
                    "(coachroof array omitted on thinned vessel B)."
                )
        facts.append(fact)
    doc["vessel_facts"] = facts

    THINNED.mkdir(parents=True, exist_ok=True)
    (THINNED / "equipment.json").write_text(
        json.dumps(doc, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    profiles_src = OUTREMER / "profiles.json"
    profiles_dst = THINNED / "profiles.json"
    if not profiles_dst.exists():
        profiles_dst.write_text(profiles_src.read_text(encoding="utf-8"), encoding="utf-8")

    print(f"OK — wrote {THINNED / 'equipment.json'} ({len(kept)} equipment rows)")
    print(f"     profiles: {profiles_dst.name} ({'linked copy' if profiles_dst.exists() else 'missing'})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
