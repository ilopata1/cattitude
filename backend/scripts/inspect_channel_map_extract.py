"""Inspect round-2 channel_map extract for empty-row / location fixes."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / (
    "fixtures/pipeline/scratch/channel_map_adjudication/channel_map_extract.json"
)


def main() -> None:
    p = json.loads(OUT.read_text(encoding="utf-8"))
    for dev in ("COI n°2", "COI n°1", "COI n°3"):
        print("===", dev, "===")
        for e in p["channel_entries"]:
            if e.get("device_instance") != dev:
                continue
            print(
                f"{e.get('channel_ref'):10} pin={e.get('pin')} "
                f"empty={e.get('empty_row')} flag={e.get('option_flag')} "
                f"fuse={e.get('fuse_rating')} "
                f"fr={e.get('circuit_name_fr')} en={e.get('circuit_name_en')} "
                f"conf={e.get('cell_confidence')} note={e.get('uncertainty_note')}"
            )
    print("=== FB03 / Portes entries ===")
    for e in p["channel_entries"]:
        d = str(e.get("device_instance") or "")
        if "03" in d or "orte" in d.lower() or "Fusible" in d:
            print(
                d,
                e.get("channel_ref"),
                e.get("circuit_name_fr"),
                e.get("circuit_name_en"),
                e.get("fuse_rating"),
                e.get("empty_row"),
            )
    print("=== locations ===")
    for loc in p["device_locations"]:
        print(loc)
    print("=== flags ===")
    for f in p["extractor_flags"]:
        print("-", f)


if __name__ == "__main__":
    main()
