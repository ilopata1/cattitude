"""Run procedure inventory (flags-only) on last_green / scratch profiles.

Writes ``<stem>_procedures.json`` beside each profile and prints unaccounted
lists (pre-repair) for adjudication.

Usage (from backend/):
  python scripts/run_procedure_inventory.py
  python scripts/run_procedure_inventory.py --source last_green
  python scripts/run_procedure_inventory.py --source scratch
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_procedures import run_procedure_inventory_pass

LAST_GREEN = _BACKEND / "fixtures" / "pipeline" / "last_green"
SCRATCH = _BACKEND / "fixtures" / "pipeline" / "scratch"

DEVICES = (
    ("victron_mppt", "victron_mppt"),
    ("mastervolt_combi", "mastervolt_combi"),
    ("mastervolt_mli", "mastervolt_mli"),
)


def _load_last_green(folder: str) -> tuple[dict, list, list]:
    root = LAST_GREEN / folder
    profile = json.loads((root / "profile.json").read_text(encoding="utf-8"))
    inp = json.loads((root / "extraction_input.json").read_text(encoding="utf-8"))
    excerpts = list(inp.get("excerpts") or [])
    map_groups = list(inp.get("map_groups") or [])
    # Prefer groups/*_input.json excerpt payloads when map_groups are stubs.
    gdir = root / "groups"
    if gdir.is_dir():
        rebuilt: list[dict] = []
        for p in sorted(gdir.glob("*_input.json")):
            g = json.loads(p.read_text(encoding="utf-8"))
            if g.get("excerpts"):
                rebuilt.append(g)
        if rebuilt:
            map_groups = rebuilt
    return profile, excerpts, map_groups


def _load_scratch(stem: str) -> tuple[dict, list, list]:
    profile = json.loads((SCRATCH / f"{stem}.json").read_text(encoding="utf-8"))
    inp_path = SCRATCH / f"{stem}_input.json"
    excerpts: list = []
    map_groups: list = []
    if inp_path.is_file():
        inp = json.loads(inp_path.read_text(encoding="utf-8"))
        excerpts = list(inp.get("excerpts") or [])
        map_groups = list(inp.get("map_groups") or [])
    return profile, excerpts, map_groups


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        choices=("last_green", "scratch"),
        default="last_green",
    )
    args = parser.parse_args()

    for label, folder in DEVICES:
        if args.source == "last_green":
            profile, excerpts, map_groups = _load_last_green(folder)
            out_path = LAST_GREEN / folder / f"{folder}_procedures.json"
        else:
            profile, excerpts, map_groups = _load_scratch(folder)
            out_path = SCRATCH / f"{folder}_procedures.json"

        _prof, payload = run_procedure_inventory_pass(
            profile,
            excerpts=excerpts,
            map_groups=map_groups or None,
            repair_enabled=False,
        )
        out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

        recon = payload.get("reconciliation") or {}
        unacc = recon.get("unaccounted") or []
        print(f"\n=== {label} ({args.source}) ===")
        print(
            f"procedures={payload.get('inventory', {}).get('procedure_count')} "
            f"alternatives={payload.get('inventory', {}).get('alternative_count')} "
            f"unaccounted={len(unacc)} "
            f"classified={recon.get('counts', {}).get('classified')} "
            f"-> {out_path}"
        )
        print("UNACCOUNTED (pre-repair):")
        if not unacc:
            print("  (none)")
        for u in unacc:
            kind = u.get("kind")
            title = u.get("title")
            missing = u.get("missing_alternatives")
            ref = u.get("excerpt_ref")
            gid = u.get("group_id")
            extra = f" missing={missing}" if missing else ""
            print(f"  - [{kind}] {title!r} @ {ref}{('@' + gid) if gid else ''}{extra}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
