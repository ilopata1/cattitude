"""Phase 1 golden check: Stage 4 composers -> SystemModules -> live validator.

Composes the frozen sections for the Outremer / Supernova fixture, transforms
each into a ``SystemModule`` (solar folded into batteries), and runs the live
``_validate_module_payload`` used by the guide-generation pipeline. Fails if any
section does not transform into a valid module.

Usage (from backend/):
  python scripts/verify_stage4_modules.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_generation import GuideGenerationError, _validate_module_payload
from stage4_sections import PUBLISHED_SECTIONS, build_vessel_modules

VESSEL_DIR = _BACKEND / "fixtures" / "pipeline" / "outremer"
OUT_DIR = _BACKEND / "fixtures" / "pipeline" / "scratch"
OUT_JSON = OUT_DIR / "stage4_modules.json"


def main() -> int:
    modules, metadata = build_vessel_modules(VESSEL_DIR)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(modules, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    failures: list[str] = []
    for sid in PUBLISHED_SECTIONS:
        module = modules[sid]
        try:
            _validate_module_payload("system", sid, module)
        except GuideGenerationError as exc:
            failures.append(f"{sid}: {exc}")
            status = "FAIL"
        else:
            status = "ok"
        section_titles = ", ".join(s["t"] for s in module["sections"])
        fq = len(metadata[sid].get("fact_queries") or [])
        print(f"  [{status:4}] {sid:10} — {len(module['sections'])} sections "
              f"({section_titles}) · {fq} fact queries")

    print(f"\nWrote {OUT_JSON}")
    if failures:
        print("\nFAILURES:")
        for line in failures:
            print(f"  - {line}")
        return 1
    print(f"\nAll {len(PUBLISHED_SECTIONS)} sections transform to valid SystemModules.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
