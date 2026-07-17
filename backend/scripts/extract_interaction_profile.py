"""Offline Stage 1: extract an interaction profile to a JSON file.

Not wired into guide generation. Always writes:
  --out <device>.json
  <device>_input.json          (merged observability payload)
  <device>_groups/<group_id>_input.json
  <device>_groups/<group_id>_output.json

Usage (from backend/, with DB + Azure configured):

  python scripts/extract_interaction_profile.py \\
    --manufacturer Victron --model "SmartSolar" \\
    --out fixtures/pipeline/scratch/victron_mppt.json
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from sqlalchemy import create_engine, text

from config import settings
from interaction_profile import (
    InteractionProfileError,
    extract_interaction_profile,
    validate_profile,
)


def _resolve_equipment_id(conn, args: argparse.Namespace) -> str:
    if args.equipment_id:
        return args.equipment_id
    if not (args.manufacturer and args.model):
        raise SystemExit("Provide --equipment-id or both --manufacturer and --model")
    row = conn.execute(
        text(
            """
            SELECT id FROM equipment
            WHERE manufacturer ILIKE :manufacturer
              AND model ILIKE :model
            ORDER BY created_at DESC
            LIMIT 2
            """
        ),
        {
            "manufacturer": f"%{args.manufacturer}%",
            "model": f"%{args.model}%",
        },
    ).fetchall()
    if not row:
        raise SystemExit("No equipment matched manufacturer/model")
    if len(row) > 1:
        print(
            "Warning: multiple matches; using most recently updated "
            f"({row[0][0]})",
            file=sys.stderr,
        )
    return str(row[0][0])


def _input_path_for(out_path: Path) -> Path:
    return out_path.with_name(f"{out_path.stem}_input{out_path.suffix}")


def _persist_map_groups(out_path: Path, extraction_input: dict) -> Path:
    groups_dir = out_path.with_name(f"{out_path.stem}_groups")
    if groups_dir.is_dir():
        shutil.rmtree(groups_dir)
    groups_dir.mkdir(parents=True, exist_ok=True)
    for mapped in extraction_input.get("map_groups") or []:
        if not isinstance(mapped, dict):
            continue
        gid = str(mapped.get("group_id") or "group").replace("/", "_")
        (groups_dir / f"{gid}_input.json").write_text(
            json.dumps(
                {
                    "group_id": mapped.get("group_id"),
                    "is_introduction": mapped.get("is_introduction"),
                    "partition": mapped.get("partition"),
                    "chapter": mapped.get("chapter"),
                    "predicted_fields": mapped.get("predicted_fields"),
                    "excerpt_count": mapped.get("excerpt_count"),
                    "excerpts": mapped.get("excerpts"),
                    "assembled_user_prompt": mapped.get("assembled_user_prompt"),
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        (groups_dir / f"{gid}_output.json").write_text(
            json.dumps(mapped.get("raw_profile") or {}, indent=2) + "\n",
            encoding="utf-8",
        )
    return groups_dir


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--equipment-id", default="")
    parser.add_argument("--manufacturer", default="")
    parser.add_argument("--model", default="")
    parser.add_argument(
        "--out",
        required=True,
        help="Output JSON path for the normalized profile",
    )
    parser.add_argument(
        "--citations-out",
        default="",
        help="Optional path for excerpt/citation sidecar JSON",
    )
    parser.add_argument(
        "--input-out",
        default="",
        help="Optional override for extraction input JSON "
        "(default: <out_stem>_input.json beside --out)",
    )
    args = parser.parse_args()

    engine = create_engine(settings.database_url)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    input_path = Path(args.input_out) if args.input_out else _input_path_for(out_path)
    input_path.parent.mkdir(parents=True, exist_ok=True)

    with engine.connect() as conn:
        equipment_id = _resolve_equipment_id(conn, args)
        try:
            profile, citations, extraction_input = extract_interaction_profile(
                conn, equipment_id
            )
        except InteractionProfileError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            return 1
        conn.rollback()

    issues = validate_profile(profile)
    out_path.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote profile -> {out_path}")

    input_path.write_text(
        json.dumps(extraction_input, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Wrote extraction input -> {input_path}")

    groups_dir = _persist_map_groups(out_path, extraction_input)
    print(f"Wrote map groups -> {groups_dir}")

    procedures = extraction_input.get("procedure_inventory")
    if procedures is not None:
        proc_path = out_path.with_name(f"{out_path.stem}_procedures.json")
        proc_path.write_text(
            json.dumps(procedures, indent=2) + "\n", encoding="utf-8"
        )
        print(f"Wrote procedure inventory -> {proc_path}")
        unacc = (procedures.get("reconciliation") or {}).get("unaccounted") or []
        print(f"  unaccounted before repair: {len(unacc)}")

    if issues:
        print("Validation notes:")
        for issue in issues:
            print(f"  - {issue}")

    if args.citations_out:
        cit_path = Path(args.citations_out)
        cit_path.parent.mkdir(parents=True, exist_ok=True)
        cit_path.write_text(json.dumps(citations, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote citations -> {cit_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
