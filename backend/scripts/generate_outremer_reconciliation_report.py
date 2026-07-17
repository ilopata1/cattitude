"""Regenerate Outremer 55N60 vessel reconciliation report + quantity experiment.

Usage (from backend/):
  python scripts/generate_outremer_reconciliation_report.py
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from content_tiers import assign_content_tiers
from system_graph import build_vessel_graph

# Import vessel helpers without treating scripts/ as a package.
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "run_outremer_vessel",
    _BACKEND / "scripts" / "run_outremer_vessel.py",
)
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_mod)
annotate_report = _mod.annotate_report
build_vessel_profiles = _mod.build_vessel_profiles

OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"


def _load(name: str) -> Any:
    return json.loads((OUTREMER / name).read_text(encoding="utf-8"))


def _quantity_experiment() -> dict[str, Any]:
    """Show raw Stage 2 behavior for quantity fields vs expanded per-unit keys."""
    equipment = _load("equipment.json")["equipment"]
    profiles = _load("profiles.json")

    # As encoded: quantity on line items, one device_key each.
    as_encoded = build_vessel_graph(equipment, profiles)
    enc_roles = as_encoded.summary()["roles"]
    enc_keys = {
        k: {
            "role": enc_roles.get(k),
            "quantity": next(
                (r.get("quantity") for r in equipment if r.get("device_key") == k),
                None,
            ),
        }
        for k in ("mass_combi_pro", "mli_ultra", "victron_mppt", "victron_mppt_150_60")
    }

    # Expanded: duplicate device_keys per quantity (synthetic).
    expanded_eq: list[dict[str, Any]] = []
    expanded_profiles: dict[str, Any] = {}
    for row in equipment:
        key = str(row.get("device_key") or "")
        qty = int(row.get("quantity") or 1)
        if key in {"mass_combi_pro", "mli_ultra", "victron_mppt"} and qty > 1:
            for i in range(1, qty + 1):
                unit_key = f"{key}_{i}"
                unit = deepcopy(row)
                unit["device_key"] = unit_key
                unit["quantity"] = 1
                unit["unit_index"] = i
                expanded_eq.append(unit)
                if key in profiles:
                    expanded_profiles[unit_key] = deepcopy(profiles[key])
        else:
            expanded_eq.append(deepcopy(row))
            if key in profiles:
                expanded_profiles[key] = deepcopy(profiles[key])

    expanded = build_vessel_graph(expanded_eq, expanded_profiles)
    exp_roles = expanded.summary()["roles"]
    expanded_combi = sorted(k for k in exp_roles if k.startswith("mass_combi_pro"))
    expanded_mli = sorted(k for k in exp_roles if k.startswith("mli_ultra"))
    expanded_mppt = sorted(
        k for k in exp_roles if k.startswith("victron_mppt") and k != "victron_mppt_150_60"
    )

    return {
        "as_encoded_device_keys": enc_keys,
        "note": (
            "Stage 2 build_vessel_graph keys strictly by device_key and ignores "
            "quantity — one node per key. Expanding to per-unit keys yields "
            "N independent ENDPOINT/ISLAND nodes sharing the same profile."
        ),
        "expanded_roles_sample": {
            "mass_combi_pro_*": {k: exp_roles[k] for k in expanded_combi},
            "mli_ultra_*": {k: exp_roles[k] for k in expanded_mli},
            "victron_mppt_*": {k: exp_roles[k] for k in expanded_mppt},
        },
    }


def main() -> int:
    records = _load("reconciliation_records.json")
    equipment_doc = _load("equipment.json")
    before_path = OUTREMER / "_report_before.txt"
    before = ""
    if before_path.is_file():
        raw = before_path.read_bytes()
        for enc in ("utf-8-sig", "utf-16", "utf-16-le", "cp1252"):
            try:
                before = raw.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        else:
            before = raw.decode("utf-8", errors="replace")

    equipment, profiles, relations, equipment_doc = build_vessel_profiles()
    result = build_vessel_graph(
        equipment, profiles, relations=relations, equipment_doc=equipment_doc
    )
    tiers = assign_content_tiers(result)
    vessel_lines = annotate_report(result, tiers, profiles)
    summary = result.summary()

    qty = _quantity_experiment()

    retired_hits = []
    live_roles = summary["roles"]
    eq_keys = {str(r.get("device_key")) for r in equipment_doc.get("equipment") or []}
    profile_keys = set(_load("profiles.json"))
    expected_roles = set((_load("expected.json").get("roles") or {}))
    for retired in ("balmar_mc624", "czone_touch_10", "czone_system"):
        if (
            retired in eq_keys
            or retired in profile_keys
            or retired in expected_roles
            or retired in live_roles
        ):
            retired_hits.append(retired)

    report_lines: list[str] = []
    report_lines.append("# Outremer 55N60 — vessel artifact reconciliation report")
    report_lines.append("")
    report_lines.append(
        f"**Batch:** {records.get('batch')}  "
    )
    report_lines.append(f"**Fixture-Auth:** `{records.get('fixture_auth')}`")
    report_lines.append("")
    report_lines.append("## Reconciliation records (audit only)")
    report_lines.append("")
    for rec in records.get("records") or []:
        report_lines.append(f"- **{rec.get('id')}** — {rec.get('summary')}")
        if rec.get("provenance_split"):
            ps = rec["provenance_split"]
            report_lines.append(
                f"  - provenance_split: attested={ps.get('attested')!r}; "
                f"inferred={ps.get('inferred')!r}; unconfirmed={ps.get('unconfirmed')!r}"
            )
    report_lines.append("")
    report_lines.append("## Installation notes")
    report_lines.append("")
    for note in equipment_doc.get("installation_notes") or []:
        report_lines.append(
            f"- {note.get('applies_to')}: {note.get('note')} "
            f"(source={note.get('source')})"
        )
    report_lines.append("")
    report_lines.append("## Quantity / multi-unit raw graph behavior")
    report_lines.append("")
    report_lines.append("```json")
    report_lines.append(json.dumps(qty, indent=2))
    report_lines.append("```")
    report_lines.append("")
    report_lines.append("## Retired-node check (fixtures + live roles)")
    report_lines.append("")
    if retired_hits:
        report_lines.append(f"FAIL still present: {retired_hits}")
    else:
        report_lines.append(
            "OK — `balmar_mc624` / `czone_touch_10` / `czone_system` absent from "
            "equipment keys, profile keys, expected roles, and live roles. "
            "`czone_touch_10` scratch extracts remain archived outside the vessel graph."
        )
    report_lines.append("")
    report_lines.append("## Vessel graph report (current)")
    report_lines.append("")
    report_lines.append("```")
    report_lines.extend(vessel_lines)
    report_lines.append("```")
    report_lines.append("")
    report_lines.append("## Diff vs previous run (roles / paths / flags)")
    report_lines.append("")

    def _parse_section(text: str, header: str) -> list[str]:
        lines = text.splitlines()
        out: list[str] = []
        grab = False
        for line in lines:
            if line.startswith(header):
                grab = True
                continue
            if grab and line and not line.startswith(" ") and line.endswith(":"):
                break
            if grab and line.startswith("OK -"):
                break
            if grab and line.startswith("FAIL"):
                break
            if grab:
                out.append(line)
        return out

    before_roles = _parse_section(before, "ROLES:")
    after_roles = _parse_section("\n".join(vessel_lines), "ROLES:")
    before_paths = _parse_section(before, "CONTROL PATHS:")
    after_paths = _parse_section("\n".join(vessel_lines), "CONTROL PATHS:")
    before_flags = _parse_section(before, "FLAGS:")
    after_flags = _parse_section("\n".join(vessel_lines), "FLAGS:")

    def _diff(label: str, a: list[str], b: list[str]) -> None:
        report_lines.append(f"### {label}")
        report_lines.append("")
        report_lines.append("**Before:**")
        report_lines.append("```")
        report_lines.extend(a or ["(missing)"])
        report_lines.append("```")
        report_lines.append("**After:**")
        report_lines.append("```")
        report_lines.extend(b or ["(missing)"])
        report_lines.append("```")
        removed = [x for x in a if x not in b]
        added = [x for x in b if x not in a]
        report_lines.append(f"- removed: {removed or '(none)'}")
        report_lines.append(f"- added: {added or '(none)'}")
        report_lines.append("")

    _diff("ROLES", before_roles, after_roles)
    _diff("CONTROL PATHS", before_paths, after_paths)
    _diff("FLAGS", before_flags, after_flags)

    out = OUTREMER / "RECONCILIATION_REPORT.md"
    out.write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    print(f"Wrote {out}")
    print("\n".join(vessel_lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
