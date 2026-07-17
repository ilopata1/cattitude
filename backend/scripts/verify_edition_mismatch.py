"""Verify edition_mismatch founding fixture (mislabeled CZone V1.0).

Usage (from backend/):
  python scripts/verify_edition_mismatch.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
_REPO = _BACKEND.parent
sys.path.insert(0, str(_BACKEND))

from manual_edition_guard import check_edition_mismatch

# Archived mislabeled copy (V1.0 bytes under v1.1 name) if still present.
CANDIDATES = [
    _REPO / "manuals" / "27efd3f750163ec2_CZone_2.0_Quick_Start_Guide_v1.1.pdf",
    _BACKEND / "tests" / "fixtures" / "czone_2_0_mislabeled_v1_0.pdf",
]


def main() -> int:
    failures: list[str] = []
    path = next((p for p in CANDIDATES if p.is_file()), None)
    if path is None:
        # Synthesize check from known V1.0 bytes still in manuals if renamed.
        print("SKIP — founding mislabeled PDF not on disk (already replaced)")
        # Still unit-test the guard logic with the current V1.1 file vs wrong label.
        v11 = _REPO / "manuals" / "CZone_2.0_Quick_Start_Guide_v1.1.pdf"
        if not v11.is_file():
            print("FAIL — no CZone Quick Start PDF available")
            return 1
        bad = check_edition_mismatch(
            pdf_path=v11,
            filename="CZone_2.0_Quick_Start_Guide_v1.1.pdf",
            admin_edition_label="V1.0",
        )
        if not bad.get("mismatch"):
            failures.append("expected mismatch when admin label V1.0 vs document V1.1")
        else:
            print("OK — synthetic admin-label mismatch detected:", bad.get("detail"))
        # Matching case
        good = check_edition_mismatch(
            pdf_path=v11,
            filename="CZone_2.0_Quick_Start_Guide_v1.1.pdf",
            admin_edition_label="V1.1",
        )
        if good.get("mismatch"):
            failures.append(f"false positive on matching V1.1: {good}")
        else:
            print("OK — matching V1.1 filename/admin passes")
    else:
        result = check_edition_mismatch(
            pdf_path=path,
            filename=path.name,
            admin_edition_label="V1.1",
        )
        print("founding file:", path.name)
        print("declared:", (result.get("declared") or {}).get("declared_version"))
        print("result:", result.get("flag"), result.get("detail"))
        if not result.get("mismatch"):
            failures.append(
                "founding mislabeled V1.0 under v1.1 name must raise edition_mismatch"
            )
        if result.get("flag") != "edition_mismatch":
            failures.append(f"flag should be edition_mismatch; got {result.get('flag')}")
        else:
            print("OK — founding edition_mismatch detected")

    if failures:
        print("FAIL:")
        for f in failures:
            print(" -", f)
        return 1
    print("OK - edition_mismatch guard")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
