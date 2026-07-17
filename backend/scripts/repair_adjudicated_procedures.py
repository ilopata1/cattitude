"""Offline adjudicated procedure repair against last_green → scratch.

Loads each last_green profile + excerpts, runs scoped procedure repair
(one Azure map-retry per adjudicated item group), writes updated scratch
profiles + ``*_procedures.json`` payloads.

Usage (from backend/):
  python scripts/repair_adjudicated_procedures.py
  python scripts/repair_adjudicated_procedures.py --device victron_mppt
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile import (  # noqa: E402
    _apply_registry_identity,
    _complete_structured,
    _compose_map_prompt,
)
from interaction_profile_procedures import (  # noqa: E402
    PROCEDURE_REPAIR_ENABLED,
    run_procedure_inventory_pass,
)
from prompts.guide.registry import get_draft_prompt  # noqa: E402
from prompts.loader import load_prompt_text  # noqa: E402

LAST_GREEN = _BACKEND / "fixtures" / "pipeline" / "last_green"
SCRATCH = _BACKEND / "fixtures" / "pipeline" / "scratch"

DEVICES = (
    ("victron_mppt", "Victron Energy", "SmartSolar MPPT 75 | 15"),
    ("mastervolt_combi", "Mastervolt", "Mass Combi Pro 24/3500-100"),
    ("mastervolt_mli", "Mastervolt", "MLI Ultra 24/6000"),
)


def _load_device(stem: str) -> tuple[dict, list, dict]:
    d = LAST_GREEN / stem
    profile = json.loads((d / "profile.json").read_text(encoding="utf-8"))
    inp = json.loads((d / "extraction_input.json").read_text(encoding="utf-8"))
    excerpts = list(inp.get("excerpts") or [])
    map_groups = list(inp.get("map_groups") or [])
    if not map_groups:
        gdir = d / "groups"
        if gdir.is_dir():
            for p in sorted(gdir.glob("*_input.json")):
                map_groups.append(json.loads(p.read_text(encoding="utf-8")))
    return profile, excerpts, {
        "map_groups": map_groups,
        "device": inp.get("device") or profile.get("device") or {},
        "manuals": inp.get("source_manuals") or inp.get("manuals") or [],
        "manual_selection_policy": str(
            inp.get("manual_selection_policy") or "cleared manuals only"
        ),
        "instruction": inp.get("prompt_instruction_text")
        or get_draft_prompt("interaction_profile"),
        "schema_hint": inp.get("prompt_schema_text")
        or load_prompt_text("guide/schemas/interaction_profile.txt"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--device", choices=[d[0] for d in DEVICES], default=None)
    args = parser.parse_args()

    if not PROCEDURE_REPAIR_ENABLED:
        print("FAIL - PROCEDURE_REPAIR_ENABLED is False; ungating required")
        return 2

    selected = [d for d in DEVICES if args.device is None or d[0] == args.device]
    SCRATCH.mkdir(parents=True, exist_ok=True)

    for stem, manufacturer, model in selected:
        print(f"=== repairing {stem} ===")
        profile, excerpts, ctx = _load_device(stem)
        device_block = ctx["device"] or {
            "manufacturer": manufacturer,
            "model": model,
            "category_freeform": "",
        }

        def map_fn(scoped, trailer, _ctx=ctx, _dev=device_block, _m=manufacturer, _mod=model):
            prompt = _compose_map_prompt(
                instruction=_ctx["instruction"],
                device_block=_dev,
                manual_selection_policy=_ctx["manual_selection_policy"],
                manuals=_ctx["manuals"],
                schema_hint=_ctx["schema_hint"],
                group_excerpts=scoped,
                group_id="procedure_repair",
            )
            if trailer:
                prompt = prompt + "\n\n" + trailer + "\n"
            raw = _complete_structured(prompt)
            return _apply_registry_identity(raw, manufacturer=_m, model=_mod)

        repaired, payload = run_procedure_inventory_pass(
            profile,
            excerpts=excerpts,
            map_groups=ctx["map_groups"] or None,
            repair_enabled=True,
            repair_map_fn=map_fn,
        )
        counts = (payload.get("reconciliation") or {}).get("counts") or {}
        repair = payload.get("repair") or {}
        print(f"  repair: attempted={repair.get('attempted')} "
              f"added_actions={repair.get('added_actions')} "
              f"added_requires={repair.get('added_requires')}")
        print(f"  residual unaccounted={counts.get('unaccounted')} "
              f"(accounted={counts.get('accounted')} "
              f"classified={counts.get('classified')} "
              f"filtered={counts.get('filtered')})")
        for u in (payload.get("reconciliation") or {}).get("unaccounted") or []:
            print(f"  STILL UNACCOUNTED: {u.get('title')} {u.get('missing_alternatives')}")

        out_profile = SCRATCH / f"{stem}.json"
        out_proc = SCRATCH / f"{stem}_procedures.json"
        out_profile.write_text(
            json.dumps(repaired, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        out_proc.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"  wrote {out_profile.name} + {out_proc.name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
