"""Compare live MLI Ultra scratch to tests/fixtures/mli_golden.json.

Annotates each satisfied assertion extracted | derived. Failures that rely only
on ungrounded derived items are counted as FAIL.

Usage (from backend/):
  python scripts/compare_mli_scratch.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_schema import resolve_field_path
from interaction_profile_validate import validation_flag_names

GOLDEN = _BACKEND / "tests" / "fixtures" / "mli_golden.json"
DEFAULT_LIVE = _BACKEND / "fixtures" / "pipeline" / "scratch" / "mastervolt_mli.json"


def _norm(text: str) -> str:
    return " ".join(str(text or "").lower().replace(" the ", " ").split())


def _item_grounded(profile: dict, item: dict) -> bool:
    source = str(item.get("source") or "extracted").strip() or "extracted"
    if source != "derived":
        return True
    derived_from = str(item.get("derived_from") or "").strip()
    if not derived_from:
        return False
    ok, _val, _err = resolve_field_path(profile, derived_from)
    return ok


def _provenance(item: dict | None) -> str:
    if not isinstance(item, dict):
        return "extracted"
    src = str(item.get("source") or "extracted").strip() or "extracted"
    return src if src in {"extracted", "derived"} else "extracted"


def compare(live: dict, golden: dict) -> tuple[list[str], list[str]]:
    _ = golden
    failures: list[str] = []
    satisfied: list[str] = []

    def accept(label: str, item: dict | None = None, *, via: str = "") -> None:
        detail = f" ({via})" if via else ""
        if item is not None and not _item_grounded(live, item):
            failures.append(
                f"{label}: matched ONLY via ungrounded derived item{detail}"
            )
            return
        satisfied.append(f"OK [{_provenance(item)}] {label}{detail}")

    networks = live.get("networks") if isinstance(live.get("networks"), dict) else {}
    speaks = networks.get("speaks") or []
    masterbus = next(
        (
            s
            for s in speaks
            if isinstance(s, dict)
            and "masterbus" in str(s.get("name_verbatim") or "").lower()
        ),
        None,
    )
    if masterbus is None:
        failures.append("networks.speaks missing MasterBus")
    else:
        accept("networks.speaks includes MasterBus", masterbus)

    roles = live.get("data_roles") or {}
    if roles.get("exposes_data_to_network") is not True:
        failures.append(
            f"data_roles.exposes_data_to_network must be true "
            f"(live={roles.get('exposes_data_to_network')!r})"
        )
    else:
        accept("data_roles.exposes_data_to_network=true")

    safety = live.get("safety_role") or {}
    if safety.get("is_protective_device") is not True:
        failures.append(
            f"safety_role.is_protective_device must be true "
            f"(live={safety.get('is_protective_device')!r})"
        )
    else:
        accept("safety_role.is_protective_device=true")

    if safety.get("has_emergency_procedure") is not True:
        failures.append(
            f"safety_role.has_emergency_procedure must be true "
            f"(live={safety.get('has_emergency_procedure')!r})"
        )
    else:
        accept("safety_role.has_emergency_procedure=true")

    if safety.get("has_manual_override") is not True:
        failures.append(
            "safety_role.has_manual_override must be true "
            "(manual states LOCK OFF / REMOTE OFF knob positions on the "
            f"safety relay; live={safety.get('has_manual_override')!r})"
        )
    else:
        accept("safety_role.has_manual_override=true")

    protects = live.get("protects") or []
    protect_hit = next(
        (
            item
            for item in protects
            if isinstance(item, dict)
            and any(
                k in _norm(item.get("description_verbatim"))
                for k in (
                    "bms",
                    "safety relay",
                    "under",
                    "over",
                    "temperature",
                    "protect",
                    "disconnect",
                    "contactor",
                    "relay",
                )
            )
        ),
        None,
    )
    if protect_hit is None:
        failures.append(
            "protects missing BMS protective disconnect / safety-relay open "
            "(manual: automatic open on built-in thresholds / battery safety "
            "events — voltage & temperature)"
        )
    else:
        accept(
            "protects BMS / safety-relay protective disconnect",
            protect_hit,
            via=str(protect_hit.get("description_verbatim") or ""),
        )

    supply = live.get("supply_requirements") or []
    protected = live.get("protected_by") or []
    fuse_hit = next(
        (
            item
            for item in (supply + protected)
            if isinstance(item, dict)
            and any(
                k in _norm(item.get("description_verbatim"))
                for k in ("class t", "t-fuse", "t fuse", "fuse")
            )
        ),
        None,
    )
    if fuse_hit is None:
        failures.append(
            "supply_requirements/protected_by missing external fuse "
            "(expect T-Fuse / Class T or fuse holder in positive battery wire)"
        )
    else:
        accept(
            "external fuse supply/protected_by (T-Fuse/Class T class)",
            fuse_hit,
            via=str(fuse_hit.get("description_verbatim") or ""),
        )

    actions = live.get("operator_actions") or []
    recovery = next(
        (
            a
            for a in actions
            if isinstance(a, dict)
            and str(a.get("context") or "") == "emergency"
            and str(a.get("audience") or "") in {"operator", "either"}
            and (
                (
                    "close" in _norm(a.get("action"))
                    and "relay" in _norm(a.get("action"))
                )
                or (
                    "reset" in _norm(a.get("action"))
                    and any(
                        k in _norm(a.get("action"))
                        for k in ("bms", "relay", "safety")
                    )
                )
            )
        ),
        None,
    )
    if recovery is None:
        failures.append(
            "missing emergency operator BMS recovery/reset after protective "
            "disconnect (e.g. Close relay when within limits)"
        )
    else:
        accept(
            "emergency BMS recovery/reset after protective disconnect",
            recovery,
            via=str(recovery.get("action") or ""),
        )

    auto_as_action = [
        a
        for a in actions
        if isinstance(a, dict)
        and any(
            k in _norm(a.get("action"))
            for k in (
                "automatically open",
                "built-in threshold",
                "battery safety event opens",
                "bms opens",
                "bms disconnects automatically",
            )
        )
    ]
    if auto_as_action:
        failures.append(
            "automatic BMS protections recorded as operator_actions "
            f"(e.g. {auto_as_action[0].get('action')!r}) — belong in protects"
        )
    else:
        accept("automatic BMS protections not listed as operator_actions")

    monitor = next(
        (
            a
            for a in actions
            if isinstance(a, dict)
            and str(a.get("context") or "") in {"daily", "situational"}
            and any(
                k in _norm(a.get("action"))
                for k in ("monitor", "soc", "state of charge", "display")
            )
        ),
        None,
    )
    if monitor is None:
        failures.append(
            "missing daily/monitor-appropriate monitoring action "
            "(SOC / MasterBus display / SmartRemote monitor)"
        )
    else:
        accept(
            "monitoring action (daily/monitor-appropriate)",
            monitor,
            via=str(monitor.get("action") or ""),
        )

    requires = live.get("requires_devices") or []
    smartremote = next(
        (
            r
            for r in requires
            if isinstance(r, dict)
            and "smartremote" in _norm(r.get("description_verbatim"))
        ),
        None,
    )
    if smartremote is None:
        failures.append(
            "requires_devices missing SmartRemote (panel alternative to MasterView)"
        )
    else:
        accept(
            "requires_devices SmartRemote alternative",
            smartremote,
            via=str(smartremote.get("description_verbatim") or ""),
        )

    easyview = next(
        (
            r
            for r in requires
            if isinstance(r, dict)
            and "easyview" in _norm(r.get("description_verbatim"))
        ),
        None,
    )
    if easyview is None:
        failures.append(
            "requires_devices missing EasyView 5 (panel alternative to MasterView)"
        )
    else:
        accept(
            "requires_devices EasyView 5 alternative",
            easyview,
            via=str(easyview.get("description_verbatim") or ""),
        )

    return failures, satisfied


def main() -> int:
    # Avoid Windows cp1252 crashes on en-dash / notes from fixtures.
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", type=Path, default=DEFAULT_LIVE)
    parser.add_argument("--golden", type=Path, default=GOLDEN)
    args = parser.parse_args()

    if not args.live.is_file():
        print(f"FAIL - live extract not found: {args.live}")
        return 2
    if not args.golden.is_file():
        print(f"FAIL - golden fixture missing: {args.golden}")
        return 2

    live = json.loads(args.live.read_text(encoding="utf-8"))
    golden = json.loads(args.golden.read_text(encoding="utf-8"))

    print(f"live:   {args.live}")
    print(f"golden: {args.golden}")
    for note in (golden.get("_meta") or {}).get("adjudication_notes") or []:
        print(f"ADJUDICATION: {note}")

    if live.get("needs_rextraction") is True:
        print("BLOCKED - golden not compared")
        print("  reason: live profile needs_rextraction=true")
        return 3

    if "derived_ungrounded" in validation_flag_names(live):
        print("NOTE: profile has derived_ungrounded flags")

    failures, satisfied = compare(live, golden)
    print("ASSERTIONS:")
    for line in satisfied:
        print(f"  {line}")
    print("FOCUS (MasterBus / BMS safety / fuse / recovery / monitor):")
    focus_keys = (
        "MasterBus",
        "exposes_data",
        "is_protective",
        "emergency_procedure",
        "manual_override",
        "protects",
        "fuse",
        "recovery",
        "automatic BMS",
        "monitoring",
    )
    for line in satisfied:
        if any(k.lower() in line.lower() for k in focus_keys):
            print(f"  {line}")
    for item in failures:
        print(f"  FAIL [—] {item}")

    if failures:
        print("FAIL - live extract does not satisfy MLI Ultra golden assertions:")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("OK - live extract satisfies MLI Ultra golden fixture assertions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
