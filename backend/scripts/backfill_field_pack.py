"""Run a Stage 1 field-pack debt scan and/or offline backfill.

Usage (from backend/):
  python scripts/backfill_field_pack.py --pack occasion --scan
  python scripts/backfill_field_pack.py --pack occasion --backfill --device mastervolt_combi
  python scripts/backfill_field_pack.py --pack occasion --backfill --device mastervolt_combi --promote-vessel mass_combi_pro
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from profile_field_packs import (
    FIELD_PACKS,
    OCCASION_PROMOTE_MAP,
    backfill_last_green,
    catch_up_all_occasion_packs,
    promote_occasion_to_vessel,
    scan_pack_debt,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pack",
        required=True,
        choices=sorted(FIELD_PACKS.keys()),
        help="Field pack id",
    )
    parser.add_argument(
        "--scan",
        action="store_true",
        help="Print debt rows (last_green + vessel)",
    )
    parser.add_argument(
        "--backfill",
        action="store_true",
        help="Run offline additive backfill on last_green",
    )
    parser.add_argument(
        "--catch-up",
        action="store_true",
        help=(
            "Backfill all last_green devices, promote OCCASION_PROMOTE_MAP, "
            "fill vessel CZone occasions, then report remaining debt"
        ),
    )
    parser.add_argument(
        "--device",
        default=None,
        help="Limit backfill to one last_green folder (e.g. mastervolt_combi)",
    )
    parser.add_argument(
        "--promote-vessel",
        default=None,
        metavar="CATALOG_KEY",
        help="After backfill, promote occasion onto vessel catalog_key",
    )
    args = parser.parse_args()

    if not any(
        [args.scan, args.backfill, args.promote_vessel, args.catch_up]
    ):
        parser.error(
            "specify --scan and/or --backfill and/or --promote-vessel "
            "and/or --catch-up"
        )

    if args.catch_up:
        if args.pack != "occasion":
            parser.error("--catch-up currently supports --pack occasion only")
        result = catch_up_all_occasion_packs()
        summary = {
            "fill_count": sum(
                len(r.get("fills") or []) for r in result["last_green"]
            ),
            "promoted_count": len(result["promoted"]),
            "czone_fill_count": len(result["czone_fills"]),
            "debt_count": result["debt_count"],
            "debt_remaining": result["debt_remaining"],
            "promote_map": {
                k: list(v) for k, v in OCCASION_PROMOTE_MAP.items()
            },
            "fills_by_device": {
                r["device_key"]: [
                    {"action": f.get("action"), "occasion": f.get("occasion")}
                    for f in (r.get("fills") or [])
                ]
                for r in result["last_green"]
                if r.get("fills")
            },
        }
        print(json.dumps(summary, indent=2))
        return 0

    if args.scan:
        debt = scan_pack_debt(args.pack)
        print(json.dumps(debt, indent=2))
        print(f"debt_count={len(debt)}")

    if args.backfill:
        results = backfill_last_green(args.pack, device_folder=args.device)
        print(json.dumps(results, indent=2))
        filled = sum(len(r.get("fills") or []) for r in results)
        print(f"fill_count={filled}")

    if args.promote_vessel:
        folder = args.device or "mastervolt_combi"
        promoted = promote_occasion_to_vessel(
            catalog_key=args.promote_vessel,
            last_green_folder=folder,
        )
        print(json.dumps(promoted, indent=2))
        print(f"promoted_count={len(promoted)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
