"""Verify occasion field pack after catch-up.

Usage (from backend/):
  python scripts/verify_field_pack_occasion.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from profile_field_packs import (
    LAST_GREEN,
    OUTREMER_PROFILES,
    load_json,
    scan_pack_debt,
)

# Honest leftovers: no last_green corpus / no grounded excerpt for occasion.
_EXPECTED_REMAINING = {
    ("vessel", "plain_battery_switch", "isolate battery with rotary switch"),
    ("vessel", "czone_touch_7", "calibrate touch screen"),
    # Fischer Panda 8000i: situational iControl2 menu/config actions the
    # operators manual documents without a grounded when/why occasion.
    ("vessel", "fischer_panda_8000i", "activate the autostart function"),
    ("vessel", "fischer_panda_8000i", "confirm selection in the set-up menu"),
    ("vessel", "fischer_panda_8000i", "navigate through the set-up menu"),
    ("vessel", "fischer_panda_8000i", "prime the fuel system"),
    ("vessel", "fischer_panda_8000i", "reset the service interval"),
    ("vessel", "fischer_panda_8000i", "shutdown the generator"),
    ("vessel", "fischer_panda_8000i", "switch on the controller"),
    ("last_green", "fischer_panda_8000i", "activate the autostart function"),
    ("last_green", "fischer_panda_8000i", "confirm selection in the set-up menu"),
    ("last_green", "fischer_panda_8000i", "navigate through the set-up menu"),
    ("last_green", "fischer_panda_8000i", "prime the fuel system"),
    ("last_green", "fischer_panda_8000i", "reset the service interval"),
    ("last_green", "fischer_panda_8000i", "shutdown the generator"),
    ("last_green", "fischer_panda_8000i", "switch on the controller"),
}


def _has_occasion(actions: list, substr: str) -> bool:
    for a in actions or []:
        if not isinstance(a, dict):
            continue
        if substr.lower() not in str(a.get("action") or "").lower():
            continue
        if str(a.get("occasion") or "").strip():
            return True
    return False


def main() -> int:
    failures: list[str] = []

    checks = [
        ("mastervolt_combi", "input current limit"),
        ("mastervolt_combi", "switch on the Mass Combi"),
        ("victron_mppt", "sunset action"),
        ("victron_mppt", "shutdown the device"),
        ("mastervolt_mli", "switch off the load"),
    ]
    for folder, substr in checks:
        lg = load_json(LAST_GREEN / folder / "profile.json")
        if not _has_occasion(lg.get("operator_actions") or [], substr):
            failures.append(f"last_green {folder} missing occasion for {substr!r}")

    vessel = load_json(OUTREMER_PROFILES)
    stub = vessel.get("mass_combi_pro") or {}
    if not _has_occasion(stub.get("operator_actions") or [], "input current limit"):
        failures.append("vessel mass_combi_pro AC input limit missing occasion")

    czone = vessel.get("czone_2_0") or {}
    if not _has_occasion(czone.get("operator_actions") or [], "activate Mode"):
        failures.append("vessel czone_2_0 Modes missing occasion")

    debt = scan_pack_debt("occasion")
    remaining = {
        (
            str(d.get("source") or ""),
            str(d.get("device_key") or ""),
            str(d.get("action") or ""),
        )
        for d in debt
    }
    unexpected = remaining - _EXPECTED_REMAINING
    if unexpected:
        failures.append(f"unexpected occasion debt: {sorted(unexpected)}")

    if failures:
        print("FAIL:")
        for f in failures:
            print(" -", f)
        return 1

    print("OK — occasion catch-up: Combi/MPPT/MLI last_green + CZone Modes/Climate")
    print(
        "vessel Combi occasion:",
        json.dumps(
            next(
                (
                    a.get("occasion")
                    for a in (stub.get("operator_actions") or [])
                    if isinstance(a, dict)
                    and "input current limit" in str(a.get("action") or "").lower()
                ),
                None,
            ),
            ensure_ascii=False,
        ),
    )
    print(f"remaining_debt_rows={len(debt)} (plain switch / Touch calibrate)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
