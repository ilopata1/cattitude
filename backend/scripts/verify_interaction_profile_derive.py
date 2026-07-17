"""Stage 1.6 derived-actions unit checks.

Usage (from backend/):
  python scripts/verify_interaction_profile_derive.py
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_derive import (
    DERIVED_ERROR_ACTION,
    apply_derived_actions,
)
from interaction_profile_validate import (
    check_derived_grounding,
    validate_interaction_profile,
    validation_flag_names,
)

GOLDEN = _BACKEND / "tests" / "fixtures" / "smartsolar_corrected_extraction.json"


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    golden = json.loads(GOLDEN.read_text(encoding="utf-8"))
    # Strip derived action to simulate extract-before-1.6.
    base = copy.deepcopy(golden)
    base["operator_actions"] = [
        a
        for a in (base.get("operator_actions") or [])
        if not (
            isinstance(a, dict)
            and (
                a.get("source") == "derived"
                or DERIVED_ERROR_ACTION in str(a.get("action") or "").lower()
            )
        )
    ]
    for a in base["operator_actions"]:
        if isinstance(a, dict):
            a.pop("source", None)
            a.pop("derived_from", None)

    derived = apply_derived_actions(base)
    actions = derived.get("operator_actions") or []
    consult = [
        a
        for a in actions
        if isinstance(a, dict)
        and str(a.get("action") or "") == DERIVED_ERROR_ACTION
        and a.get("context") == "emergency"
        and a.get("source") == "derived"
    ]
    check(len(consult) == 1, "SmartSolar profile must gain derived consult-errors action")
    check(
        str(consult[0].get("derived_from") or "").startswith("evidence["),
        "derived_from must point at an evidence path",
    )
    check(
        all(
            isinstance(a, dict) and a.get("source") in {"extracted", "derived"}
            for a in actions
        ),
        "every action must carry source extracted|derived",
    )
    check(
        not check_derived_grounding(derived),
        "consult-errors derived_from must resolve",
    )

    # No fire when has_emergency_procedure is false.
    no_emerg = copy.deepcopy(base)
    no_emerg["safety_role"]["has_emergency_procedure"] = False
    no_fire = apply_derived_actions(no_emerg)
    check(
        not any(
            isinstance(a, dict) and a.get("source") == "derived"
            for a in (no_fire.get("operator_actions") or [])
        ),
        "must not derive when has_emergency_procedure is false",
    )

    # No duplicate when model already emitted a similar action.
    already = copy.deepcopy(base)
    already["operator_actions"].append(
        {
            "action": "check error codes and alarms",
            "audience": "operator",
            "context": "emergency",
        }
    )
    no_dup = apply_derived_actions(already)
    derived_count = sum(
        1
        for a in (no_dup.get("operator_actions") or [])
        if isinstance(a, dict) and a.get("source") == "derived"
    )
    check(derived_count == 0, "must not duplicate when similar emergency action exists")

    # derived_ungrounded: missing path
    bad = copy.deepcopy(derived)
    bad["operator_actions"].append(
        {
            "action": "made up",
            "audience": "operator",
            "context": "daily",
            "source": "derived",
        }
    )
    flags = validation_flag_names(
        validate_interaction_profile(bad, excerpts=[])
    )
    # Note: validate also runs optional-surface fills; focus on ungrounded flag.
    check(
        "derived_ungrounded" in flags,
        "validator must flag derived_ungrounded for missing derived_from",
    )

    # Bad path
    bad2 = copy.deepcopy(derived)
    bad2["operator_actions"].append(
        {
            "action": "made up",
            "audience": "operator",
            "context": "daily",
            "source": "derived",
            "derived_from": "evidence[999]",
        }
    )
    check(
        any(
            f.get("flag") == "derived_ungrounded"
            for f in check_derived_grounding(bad2)
        ),
        "derived_ungrounded when derived_from does not resolve",
    )

    if failures:
        print("FAIL")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("OK - Stage 1.6 derived actions checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
