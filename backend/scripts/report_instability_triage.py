"""Report material vs cosmetic extraction_unstable triage.

Usage (from backend/):
  python scripts/report_instability_triage.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_instability import classify_extraction_votes

SCRATCH = _BACKEND / "fixtures" / "pipeline" / "scratch"
DEVICES = (
    ("mastervolt_combi", "Combi"),
    ("mastervolt_mli", "MLI"),
    ("victron_mppt", "SmartSolar"),
)


def main() -> int:
    totals = {"material": 0, "cosmetic": 0}
    for stem, label in DEVICES:
        path = SCRATCH / f"{stem}.json"
        profile = json.loads(path.read_text(encoding="utf-8"))
        inp = json.loads(
            (SCRATCH / f"{stem}_input.json").read_text(encoding="utf-8")
        )
        n = (inp.get("stability_voting") or {}).get("n_completed") or 3
        classified = classify_extraction_votes(
            list(profile.get("extraction_votes") or []), n_runs=int(n)
        )
        # Also count flags that aren't backed by extraction_votes (detail-only).
        flag_material = [
            f
            for f in (profile.get("validation_flags") or [])
            if f.get("flag") == "extraction_unstable"
        ]
        print(f"== {label} ({stem}) ==")
        print(
            f"  extraction_unstable flags (raw): {len(flag_material)}; "
            f"votes material={classified['material_count']} "
            f"cosmetic={classified['cosmetic_count']}"
        )
        print("  MATERIAL:")
        for v in classified["material"]:
            margin = (v.get("vote_margin") or {}).get("margin")
            print(
                f"    [{margin}] {v.get('field_path')}.{v.get('attribute')} "
                f"— {str(v.get('chosen'))[:70]}"
            )
        if not classified["material"]:
            print("    (none)")
        print("  COSMETIC:")
        for v in classified["cosmetic"]:
            margin = (v.get("vote_margin") or {}).get("margin")
            print(
                f"    [{margin}] {v.get('field_path')}.{v.get('attribute')} "
                f"— {str(v.get('chosen'))[:70]}"
            )
        if not classified["cosmetic"]:
            print("    (none)")
        print()
        totals["material"] += classified["material_count"]
        totals["cosmetic"] += classified["cosmetic_count"]
    print(
        f"TOTAL vote rows: material={totals['material']} "
        f"cosmetic={totals['cosmetic']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
