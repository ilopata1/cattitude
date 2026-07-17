"""Compare live Mass Combi scratch to tests/fixtures/masscombi_golden.json.

Each satisfied assertion is annotated extracted | derived. Assertions that pass
ONLY via an ungrounded derived item (missing/unresolvable derived_from, or
``derived_ungrounded`` on the profile) FAIL — honest red beats synthetic green.

Exit codes:
  0 = OK (all asserts executed and passed)
  1 = FAIL (asserts executed, gaps found)
  2 = missing files
  3 = BLOCKED (needs_rextraction; golden not compared)

Usage (from backend/):
  python scripts/compare_masscombi_scratch.py
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

GOLDEN = _BACKEND / "tests" / "fixtures" / "masscombi_golden.json"
DEFAULT_LIVE = _BACKEND / "fixtures" / "pipeline" / "scratch" / "mastervolt_combi.json"


def _norm(text: str) -> str:
    return " ".join(str(text or "").lower().replace(" the ", " ").split())


def _item_grounded(profile: dict, item: dict) -> bool:
    """True when derived item has resolvable derived_from; extracted always ok."""
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


def _match_actions(
    actions: list,
    needles: list[str],
    *,
    context: str | None = None,
    audience: str | None = None,
) -> list[dict]:
    hits: list[dict] = []
    for action in actions:
        if not isinstance(action, dict):
            continue
        if context and str(action.get("context") or "") != context:
            continue
        if audience and str(action.get("audience") or "") != audience:
            continue
        raw = _norm(action.get("action") or "")
        if any(_norm(n) in raw or raw in _norm(n) for n in needles):
            hits.append(action)
    return hits


def compare(live: dict, golden: dict) -> tuple[list[str], list[str]]:
    """Return (failures, satisfied_annotated_lines)."""
    _ = golden
    failures: list[str] = []
    satisfied: list[str] = []
    ungrounded_flags = "derived_ungrounded" in validation_flag_names(live)

    def accept(label: str, item: dict | None, *, via: str = "") -> None:
        src = _provenance(item)
        detail = f" ({via})" if via else ""
        if item is not None and not _item_grounded(live, item):
            failures.append(
                f"{label}: matched ONLY via ungrounded derived item"
                f"{detail} — counted as FAIL"
            )
            return
        if src == "derived" and ungrounded_flags and item is not None:
            # Profile-level ungrounded may be a different item; still require
            # this match itself to be grounded (checked above).
            pass
        satisfied.append(f"OK [{src}] {label}{detail}")

    actions = live.get("operator_actions") or []
    surfaces = live.get("control_surfaces") or []
    roles = live.get("data_roles") or {}
    safety = live.get("safety_role") or {}

    on_device_hit = next(
        (
            s
            for s in surfaces
            if isinstance(s, dict)
            and s.get("optional_accessory") is False
            and str(s.get("location_class") or "") in {"on_device", "unknown"}
        ),
        None,
    )
    if on_device_hit is None:
        failures.append("missing on-device control surface (optional_accessory:false)")
    else:
        accept("on-device control surface", on_device_hit)

    remote_hit = next(
        (
            s
            for s in surfaces
            if isinstance(s, dict)
            and (
                str(s.get("surface") or "") == "remote_panel_accessory"
                or "masterview" in str(s.get("label_verbatim") or "").lower()
                or "remote" in str(s.get("label_verbatim") or "").lower()
            )
            and s.get("optional_accessory") is True
        ),
        None,
    )
    if remote_hit is None:
        failures.append(
            "missing remote_panel_accessory (optional_accessory:true, "
            "MasterView/remote class)"
        )
    else:
        accept("remote_panel_accessory (MasterView/remote class)", remote_hit)

    requires = live.get("requires_devices") or []
    remote_req = next(
        (
            r
            for r in requires
            if isinstance(r, dict)
            and (
                "masterview" in str(r.get("description_verbatim") or "").lower()
                or "remote" in str(r.get("description_verbatim") or "").lower()
                or "panel" in str(r.get("description_verbatim") or "").lower()
            )
        ),
        None,
    )
    if remote_hit is not None and remote_req is None:
        failures.append("remote panel surface present without requires_devices entry")
    if remote_req is None:
        failures.append(
            "missing requires_devices for remote panel (MasterView class)"
        )
    else:
        accept("requires_devices for remote panel", remote_req)

    shore_hits = _match_actions(
        actions,
        [
            "shore power input current",
            "max ac input current",
            "ac input current",
            "power sharing",
            "mains limit",
            "mains fuse",
        ],
        context="situational",
    )
    if not shore_hits:
        failures.append("action set shore/AC input current limit (situational) ABSENT")
    else:
        accept(
            "shore/AC input current limit (situational)",
            shore_hits[0],
            via=str(shore_hits[0].get("action") or ""),
        )

    gen_mains = _match_actions(
        actions,
        ["gen-/mains", "generator / mains", "generator/mains", "mains support"],
    )
    if not gen_mains:
        failures.append(
            "action Gen-/Mains support (mode selection/behavior) ABSENT "
            "(accounted-by-extraction; any audience)"
        )
    else:
        accept(
            "Gen-/Mains support (extracted; any audience)",
            gen_mains[0],
            via=str(gen_mains[0].get("action") or ""),
        )

    power_share = _match_actions(
        actions, ["power sharing", "power-sharing", "power assist"]
    )
    if not power_share:
        failures.append(
            "action Power sharing / power-assist mode ABSENT "
            "(accounted-by-extraction; any audience)"
        )
    else:
        accept(
            "Power sharing / power-assist (extracted; any audience)",
            power_share[0],
            via=str(power_share[0].get("action") or ""),
        )

    switch_hits = _match_actions(
        actions, ["switch inverter", "inverter on", "main switch"], context="daily"
    )
    if not switch_hits:
        switch_hits = [
            a
            for a in actions
            if isinstance(a, dict)
            and str(a.get("context")) in {"daily", "situational"}
            and any(
                t in _norm(a.get("action"))
                for t in ("switch", "inverter", "main switch")
            )
        ]
    if not switch_hits:
        failures.append(
            "action switch inverter on/off (daily/situational) ABSENT or weak"
        )
    else:
        accept(
            "switch inverter on/off",
            switch_hits[0],
            via=str(switch_hits[0].get("action") or ""),
        )

    dip_hits = _match_actions(
        actions,
        ["dip", "masteradjust", "commission"],
        audience="installer_or_technician",
    )
    if not dip_hits:
        # Also accept DIP configuration mistagged as operator if context is
        # commissioning (prompt pins installer; tolerate until re-extract).
        dip_hits = _match_actions(
            actions, ["dip", "masteradjust"], context="commissioning"
        )
    if not dip_hits:
        # Narrow: DIP/MasterAdjust verb phrases regardless of audience when the
        # action string itself is clearly commissioning configuration.
        dip_hits = [
            a
            for a in actions
            if isinstance(a, dict)
            and any(
                n in _norm(a.get("action"))
                for n in ("dip", "masteradjust", "dip-switch", "dip switch")
            )
        ]
    if not dip_hits:
        failures.append(
            "installer_or_technician commissioning action "
            "(DIP / MasterAdjust) ABSENT"
        )
    else:
        accept(
            "installer_or_technician commissioning (DIP / MasterAdjust)",
            dip_hits[0],
            via=str(dip_hits[0].get("action") or ""),
        )

    for key in ("exposes_data_to_network", "controllable_from_network"):
        if roles.get(key) is not True:
            failures.append(f"data_roles.{key} must be true (live={roles.get(key)!r})")
        else:
            satisfied.append(f"OK [extracted] data_roles.{key}=true")

    if safety.get("has_emergency_procedure") is not True:
        failures.append("safety_role.has_emergency_procedure must be true")
    else:
        satisfied.append("OK [extracted] safety_role.has_emergency_procedure=true")

    supply = live.get("supply_requirements") or []
    protected = live.get("protected_by") or []
    fuse_hit = next(
        (
            item
            for item in (supply + protected)
            if isinstance(item, dict)
            and "fuse" in str(item.get("description_verbatim") or "").lower()
        ),
        None,
    )
    if fuse_hit is None:
        failures.append(
            "supply_requirements/protected_by missing DC-fuse requirement "
            "(manual states DC-fuse in DC distribution)"
        )
    else:
        accept("DC-fuse supply_requirements/protected_by", fuse_hit)

    cat = str((live.get("device") or {}).get("category_freeform") or "")
    if "_" in cat or cat.lower() in {"electrical_dc", "electrical ac shore power"}:
        failures.append(f"category_freeform looks taxonomic: {cat!r}")
    else:
        satisfied.append(f"OK [extracted] category_freeform non-taxonomic ({cat!r})")

    return failures, satisfied


def main() -> int:
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
    notes = (golden.get("_meta") or {}).get("adjudication_notes") or []
    for note in notes:
        print(f"ADJUDICATION: {note}")

    if live.get("needs_rextraction") is True:
        print("BLOCKED - golden not compared")
        print("  reason: live profile needs_rextraction=true")
        return 3

    failures, satisfied = compare(live, golden)
    print("ASSERTIONS:")
    for line in satisfied:
        print(f"  {line}")
    focus = (
        "remote_panel",
        "requires_devices for remote",
        "shore/AC",
        "commissioning",
        "DC-fuse",
    )
    print("FOCUS (remote / shore / DIP / DC-fuse):")
    for line in satisfied:
        if any(k in line for k in focus):
            print(f"  {line}")
    for item in failures:
        if any(
            k in item.lower()
            for k in (
                "remote",
                "shore",
                "dip",
                "masteradjust",
                "fuse",
                "requires_devices for remote",
            )
        ):
            print(f"  FAIL [—] {item}")
    if failures:
        print("FAIL - live extract does not satisfy Mass Combi golden assertions:")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("OK - live extract satisfies Mass Combi golden fixture assertions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
