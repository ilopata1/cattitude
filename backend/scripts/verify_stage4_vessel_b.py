"""Phase 4 vessel B smoke test — compose thinned fixture, validate modules.

Coherence bar only (not byte-match to Outremer). Checks that removed plant
does not appear in guest prose and that modules validate.

Usage (from backend/):
  python scripts/build_outremer_thinned_fixture.py   # if fixture missing
  python scripts/verify_stage4_vessel_b.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_generation import GuideGenerationError, _validate_module_payload
from stage4_sections import PUBLISHED_SECTIONS, build_modules_from_context, load_vessel_context

THINNED = _BACKEND / "fixtures" / "pipeline" / "outremer_thinned"

# Gear removed from thinned plant — must not appear in guest modules.
FORBIDDEN_IF_REMOVED = (
    "Halo 20",
    "Watchkeeper",
    "Sea.AI",
    "coachroof array",
    "starboard inverter-charger",
)

# Known Phase 4 debt — cleared once Batteries/Solar omit absent arrays.
KNOWN_HARDCODE_DEBT: tuple[str, ...] = ()


def main() -> int:
    failures: list[str] = []
    if not (THINNED / "equipment.json").is_file():
        failures.append(
            f"missing {THINNED / 'equipment.json'} — run build_outremer_thinned_fixture.py"
        )
        print("FAIL:")
        for line in failures:
            print(f"  - {line}")
        return 1

    ctx = load_vessel_context(THINNED)
    modules, metadata = build_modules_from_context(ctx)

    for sid in PUBLISHED_SECTIONS:
        module = modules[sid]
        try:
            _validate_module_payload("system", sid, module)
        except GuideGenerationError as exc:
            failures.append(f"{sid}: validate {exc}")
            continue
        blob = json.dumps(module, ensure_ascii=False).lower()
        for bad in FORBIDDEN_IF_REMOVED:
            if bad.lower() in blob:
                failures.append(f"{sid}: removed gear mentioned {bad!r}")
        for debt in KNOWN_HARDCODE_DEBT:
            if debt.lower() in blob:
                print(f"  [debt] {sid}: still hardcodes {debt!r} (W2 Batteries/Solar)")
        fq = len(metadata[sid].get("fact_queries") or [])
        print(f"  [ok] {sid:10} — {len(module['sections'])} sections · {fq} fact queries")

    name = (ctx.get("equipment_doc") or {}).get("vessel_display_name")
    if name != "Sister Test":
        failures.append(f"vessel_display_name expected 'Sister Test', got {name!r}")

    if failures:
        print("FAIL:")
        for line in failures:
            print(f"  - {line}")
        return 1

    print("OK — vessel B (outremer_thinned) Stage 4 smoke test")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
