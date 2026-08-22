#!/usr/bin/env python3
"""Seed vessel_instrument_map for a vessel slug (default: supernova)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from instrument_map import default_instrument_map, save_instrument_map, supernova_instrument_map


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed vessel instrument map")
    parser.add_argument("--slug", default="supernova", help="Vessel slug")
    args = parser.parse_args()

    if args.slug == "supernova":
        payload = supernova_instrument_map()
    else:
        payload = default_instrument_map()

    result = save_instrument_map(args.slug, payload, updated_by="seed_instrument_map")
    if result is None:
        print(f"FAIL: vessel '{args.slug}' not found")
        return 1
    print(f"OK: instrument map saved for {args.slug}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
