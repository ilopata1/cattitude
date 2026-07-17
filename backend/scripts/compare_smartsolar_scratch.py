"""Compare a post-validation live extraction to the golden SmartSolar asserts.

Does NOT rewrite fixtures. When the live profile has ``needs_rextraction: true``,
golden field comparison is not run and this script exits nonzero with status
``BLOCKED - golden not compared`` (OK is reserved for runs where every
assertion executed).

Default live path: ``fixtures/pipeline/scratch/victron_mppt.json``
(output of ``scripts/extract_interaction_profile.py``).

Usage (from backend/):
  python scripts/compare_smartsolar_scratch.py
  python scripts/compare_smartsolar_scratch.py --live path/to/extract.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_derive import (
    DERIVED_ERROR_ACTION,
    actions_semantically_similar,
)

GOLDEN = _BACKEND / "tests" / "fixtures" / "smartsolar_corrected_extraction.json"
DEFAULT_LIVE = _BACKEND / "fixtures" / "pipeline" / "scratch" / "victron_mppt.json"

REQUIRED_ACTIONS = [
    ("shutdown the solar charger", "situational"),
    ("restart the solar charger", "situational"),
    (DERIVED_ERROR_ACTION, "emergency"),
]

# v4.3/v4.4 adjudicated repair — presence only.
REQUIRED_ACTION_PRESENCE = [
    "sunset",
    "firmware",
]


def _has_action(actions: list, text: str, context: str) -> bool:
    needle = text.lower()
    compact = needle.replace(" the ", " ")
    error_action = text == DERIVED_ERROR_ACTION
    # Allow structural shutdown/restart wording ("shutdown the device") in addition
    # to golden's "shutdown the solar charger" phrasing (calibration J).
    shutdown_family = "shutdown" in compact and "restart" not in compact
    restart_family = compact.startswith("restart") or " restart " in f" {compact} "
    for action in actions:
        if not isinstance(action, dict):
            continue
        if str(action.get("context") or "") != context:
            continue
        raw = str(action.get("action") or "").lower()
        raw_compact = raw.replace(" the ", " ")
        if error_action and actions_semantically_similar(raw, text):
            return True
        if compact in raw_compact or raw_compact in compact or needle in raw:
            return True
        if shutdown_family and "shutdown" in raw_compact:
            return True
        if restart_family and "restart" in raw_compact:
            return True
    return False


def _action_contexts(actions: list, text: str) -> list[str]:
    needle = text.lower().replace(" the ", " ")
    found: list[str] = []
    for action in actions:
        if not isinstance(action, dict):
            continue
        raw = str(action.get("action") or "").lower().replace(" the ", " ")
        if needle in raw or raw in needle:
            found.append(str(action.get("context") or ""))
    return found


def compare(live: dict, golden: dict) -> list[str]:
    failures: list[str] = []
    actions = live.get("operator_actions") or []

    for text, context in REQUIRED_ACTIONS:
        if _has_action(actions, text, context):
            if text.startswith("consult error"):
                matched = [
                    a
                    for a in actions
                    if isinstance(a, dict)
                    and text in str(a.get("action") or "").lower()
                    and str(a.get("context") or "") == context
                ]
                for a in matched:
                    src = str(a.get("source") or "").strip()
                    if src and src not in {"derived", "extracted"}:
                        failures.append(
                            f"action {text!r}: source must be derived|extracted "
                            f"(live={src!r})"
                        )
            continue
        alt = _action_contexts(actions, text)
        if alt:
            failures.append(
                f"action {text!r}: expected context {context!r}, live has {alt}"
            )
        else:
            failures.append(f"action {text!r} ({context}) ABSENT from live extract")

    for needle in REQUIRED_ACTION_PRESENCE:
        hit = next(
            (
                a
                for a in actions
                if isinstance(a, dict) and needle in str(a.get("action") or "").lower()
            ),
            None,
        )
        if hit is None:
            failures.append(f"action containing {needle!r} ABSENT from live extract")
        elif needle == "firmware" and str(hit.get("context") or "") != "maintenance":
            failures.append(
                f"firmware action must use context maintenance "
                f"(live={hit.get('context')!r})"
            )
        elif needle == "sunset":
            # Collapsed form: one action with options[], not four to-tail variants.
            sunset_rows = [
                a
                for a in actions
                if isinstance(a, dict) and "sunset" in str(a.get("action") or "").lower()
            ]
            if len(sunset_rows) != 1:
                failures.append(
                    f"sunset must collapse to 1 action with options[]; "
                    f"got {len(sunset_rows)} rows"
                )
            else:
                opts = sunset_rows[0].get("options")
                if not isinstance(opts, list) or len(opts) < 2:
                    failures.append(
                        f"sunset action must carry options[] (≥2); got {opts!r}"
                    )

    requires = live.get("requires_devices") or []
    gl_hit = next(
        (
            r
            for r in requires
            if isinstance(r, dict)
            and "globallink" in str(r.get("description_verbatim") or "").lower()
        ),
        None,
    )
    if gl_hit is None:
        failures.append("requires_devices missing GlobalLink 520 (GX OR-alternative)")
    else:
        gx_hit = next(
            (
                r
                for r in requires
                if isinstance(r, dict)
                and "gx" in str(r.get("description_verbatim") or "").lower()
            ),
            None,
        )
        if gx_hit is not None:
            gl_needed = str(gl_hit.get("needed_for") or "").strip()
            gx_needed = str(gx_hit.get("needed_for") or "").strip()
            if gl_needed and gx_needed and gl_needed != gx_needed:
                failures.append(
                    f"GlobalLink needed_for {gl_needed!r} must match GX {gx_needed!r}"
                )

    safety = live.get("safety_role") or {}
    if safety.get("has_emergency_procedure") is not True:
        failures.append(
            "safety_role.has_emergency_procedure must be true "
            f"(live={safety.get('has_emergency_procedure')!r})"
        )

    for text in ("shutdown", "restart"):
        for action in actions:
            if not isinstance(action, dict):
                continue
            if text not in str(action.get("action") or "").lower():
                continue
            ctx = str(action.get("context") or "")
            if ctx == "emergency":
                failures.append(
                    f"action {action.get('action')!r} has context emergency; "
                    "golden fixture pins situational (see calibration J)"
                )

    data_roles = live.get("data_roles") or {}
    evidence = live.get("evidence") or []
    supports = {
        str(e.get("supports_field") or "")
        for e in evidence
        if isinstance(e, dict)
    }
    for key, val in data_roles.items():
        if val is True:
            path = f"data_roles.{key}"
            if not any(path == s or path in s for s in supports):
                failures.append(f"missing evidence for true {path}")

    for i, req in enumerate(live.get("requires_devices") or []):
        if not isinstance(req, dict):
            continue
        path = f"requires_devices[{i}]"
        needed = str(req.get("needed_for") or "").strip()
        if any(
            s == path or s.startswith(path) or "requires_devices" in s
            for s in supports
        ):
            continue
        # Adjudication: evidence on the capability/surface the dependency targets
        # satisfies the assertion (LLM often cites the path, not requires_devices[i]).
        if needed and any(
            s == needed or s.startswith(needed + ".") or needed in s
            for s in supports
        ):
            continue
        failures.append(f"missing evidence for {path}")

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--live",
        type=Path,
        default=DEFAULT_LIVE,
        help="Live extraction JSON (default: scratch/victron_mppt.json)",
    )
    parser.add_argument(
        "--golden",
        type=Path,
        default=GOLDEN,
        help="Golden fixture JSON",
    )
    args = parser.parse_args()

    if not args.live.is_file():
        print(f"FAIL - live extract not found: {args.live}")
        print("  Re-run: python scripts/extract_interaction_profile.py ...")
        return 2
    if not args.golden.is_file():
        print(f"FAIL - golden fixture missing: {args.golden}")
        return 2

    live = json.loads(args.live.read_text(encoding="utf-8"))
    golden = json.loads(args.golden.read_text(encoding="utf-8"))

    print(f"live:   {args.live}")
    print(f"golden: {args.golden}")

    flags = live.get("validation_flags") or []
    flag_names = sorted(
        {
            str(f.get("flag"))
            for f in flags
            if isinstance(f, dict) and f.get("flag")
        }
    )
    if live.get("needs_rextraction") is True:
        print("BLOCKED - golden not compared")
        print("  reason: live profile needs_rextraction=true")
        print(f"  validation_flags: {flag_names}")
        for item in flags:
            if not isinstance(item, dict):
                continue
            print(
                f"  - [{item.get('severity')}] {item.get('flag')} "
                f"@ {item.get('field_path')}: {item.get('detail')}"
            )
        return 3

    failures = compare(live, golden)
    if failures:
        print("FAIL - live extract does not satisfy golden SmartSolar assertions:")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("OK - live extract satisfies golden SmartSolar fixture assertions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
