"""Verify evidence_unattached founding fixture + post-retrofit solar chain.

Usage (from backend/):
  python scripts/verify_evidence_unattached.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from vessel_evidence import (
    annotate_facts_with_evidence,
    contributing_facts_ok_for_inference,
    validate_evidence_attachments,
)

FOUNDING = _BACKEND / "tests" / "fixtures" / "solar_shading_evidence_unattached.json"
OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer" / "equipment.json"


def main() -> int:
    failures: list[str] = []

    # (a) Founding dangling shading fact must fire evidence_unattached
    dangling = json.loads(FOUNDING.read_text(encoding="utf-8"))
    flags = validate_evidence_attachments(dangling)
    if not any(
        f.get("flag") == "evidence_unattached"
        and f.get("fact_id") == "solar_shading_dangling"
        for f in flags
    ):
        failures.append(f"founding fixture must raise evidence_unattached; got {flags}")
    else:
        print("OK — founding dangling shading → evidence_unattached")

    # (b) Retrofit Outremer: zero evidence_unattached on solar facts
    eq = json.loads(OUTREMER.read_text(encoding="utf-8"))
    store = _BACKEND / "fixtures" / "pipeline" / "outremer" / "artifacts"
    flags2 = validate_evidence_attachments(eq, store_root=store)
    solar_unattached = [
        f
        for f in flags2
        if f.get("flag") == "evidence_unattached"
        and str(f.get("fact_id") or "").startswith("solar_")
    ]
    if solar_unattached:
        failures.append(f"retrofit solar facts still unattached: {solar_unattached}")
    else:
        print("OK — retrofit solar facts attached")

    annotated = annotate_facts_with_evidence(eq, store_root=store)
    chain_ids = [
        "solar_coachroof_array_observation",
        "solar_coachroof_yield_inference",
        "solar_array_wattage_inventory",
        "solar_davit_array_observation",
    ]
    ok, bad = contributing_facts_ok_for_inference(chain_ids, annotated)
    if not ok:
        failures.append(f"inference chain blocked by unattached: {bad}")
    else:
        print("OK — photo → observation → entered_inference chain attachable")

    # Require photos on disk
    for name in ("photo_davit_array.jpg", "photo_coachroof_boom.jpg"):
        if not (store / name).is_file():
            failures.append(f"missing artifact file {name}")
    else:
        print("OK — deck photo artifacts on disk")

    if failures:
        print("FAIL:")
        for f in failures:
            print(" -", f)
        return 1
    print("OK - evidence_unattached validator")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
