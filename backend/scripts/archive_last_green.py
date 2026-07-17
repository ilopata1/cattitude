"""Archive golden-green Stage 1 payloads for flap diagnosis.

Copies voted profile + trimmed extraction input + per-group map I/O into
``fixtures/pipeline/last_green/<device_key>/`` (git-tracked).

Usage (from backend/):
  python scripts/archive_last_green.py --all-green
  python scripts/archive_last_green.py --device mastervolt_combi
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

SCRATCH = _BACKEND / "fixtures" / "pipeline" / "scratch"
LAST_GREEN = _BACKEND / "fixtures" / "pipeline" / "last_green"

# Scratch stem → archive device folder name
DEVICE_MAP = {
    "victron_mppt": {
        "stem": "victron_mppt",
        "compare": "scripts/compare_smartsolar_scratch.py",
    },
    "mastervolt_combi": {
        "stem": "mastervolt_combi",
        "compare": "scripts/compare_masscombi_scratch.py",
    },
    "mastervolt_mli": {
        "stem": "mastervolt_mli",
        "compare": "scripts/compare_mli_scratch.py",
    },
}

INPUT_DROP_KEYS = frozenset(
    {
        "prompt_instruction_text",
        "prompt_schema_text",
        "assembled_user_prompt",
        "merged_profile_pre_validate",
    }
)


def _trim_input(payload: dict) -> dict:
    out = {k: v for k, v in payload.items() if k not in INPUT_DROP_KEYS}
    # Strip per-group assembled prompts (huge / redundant with groups/).
    trimmed_groups = []
    for g in out.get("map_groups") or []:
        if not isinstance(g, dict):
            continue
        tg = {
            k: v
            for k, v in g.items()
            if k not in {"assembled_user_prompt", "excerpts"}
        }
        tg["excerpt_count"] = g.get("excerpt_count") or len(g.get("excerpts") or [])
        trimmed_groups.append(tg)
    out["map_groups"] = trimmed_groups
    # Keep excerpt texts for flap diagnosis but drop embedding noise if present.
    excerpts = []
    for e in payload.get("excerpts") or []:
        if not isinstance(e, dict):
            continue
        excerpts.append(
            {
                k: e.get(k)
                for k in (
                    "text",
                    "query",
                    "source_heading_guess",
                    "manual_id",
                    "score",
                )
                if k in e
            }
        )
    out["excerpts"] = excerpts
    return out


def archive_device(device_key: str, *, force: bool = False) -> Path:
    meta = DEVICE_MAP[device_key]
    stem = meta["stem"]
    profile_path = SCRATCH / f"{stem}.json"
    input_path = SCRATCH / f"{stem}_input.json"
    groups_dir = SCRATCH / f"{stem}_groups"
    if not profile_path.is_file() or not input_path.is_file():
        raise SystemExit(f"missing scratch payload for {device_key}")

    dest = LAST_GREEN / device_key
    if dest.exists() and not force:
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)

    profile = json.loads(profile_path.read_text(encoding="utf-8"))
    inp = json.loads(input_path.read_text(encoding="utf-8"))
    (dest / "profile.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (dest / "extraction_input.json").write_text(
        json.dumps(_trim_input(inp), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    out_groups = dest / "groups"
    out_groups.mkdir(exist_ok=True)
    if groups_dir.is_dir():
        for path in sorted(groups_dir.glob("*")):
            if path.suffix.lower() != ".json":
                continue
            shutil.copy2(path, out_groups / path.name)

    meta_doc = {
        "device_key": device_key,
        "scratch_stem": stem,
        "archived_at": datetime.now(timezone.utc).isoformat(),
        "stability_voting": inp.get("stability_voting"),
        "coverage": (inp.get("coverage") or {}).get("heading_coverage_fraction"),
        "note": "Golden-green voted Stage 1 payload for flap diagnosis diffs.",
    }
    (dest / "ARCHIVE_META.json").write_text(
        json.dumps(meta_doc, indent=2) + "\n", encoding="utf-8"
    )
    return dest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", choices=sorted(DEVICE_MAP))
    parser.add_argument(
        "--all-green",
        action="store_true",
        help="Archive all three devices (caller must have green compares).",
    )
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not args.device and not args.all_green:
        parser.error("provide --device or --all-green")
    keys = list(DEVICE_MAP) if args.all_green else [args.device]
    for key in keys:
        dest = archive_device(key, force=args.force)
        print(f"Archived {key} -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
