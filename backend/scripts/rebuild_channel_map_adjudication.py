"""Rebuild channel_map adjudication artifacts from pass1 JSON + smell flags."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from channel_map_schema import render_channel_map_markdown  # noqa: E402

OUT = BACKEND / "fixtures/pipeline/scratch/channel_map_adjudication"
ARTIFACTS = BACKEND / "fixtures/pipeline/outremer/artifacts"

PLANNED_COMMIT = """
## Planned commit (DO NOT EXECUTE until you approve B3)

After adjudication of the table above:

1. Commit adjudicated `channel_entries` + `device_locations` as `channel_map`
   facts with citations (source doc p46, 05/05/2026 Ind C) and
   `supersedes_where_conflicting` toward older DC folios.
2. Split `config_unsourced`: circuit/monitoring inventory -> sourced from this
   artifact; modes/favourites/alarm config -> remains unsourced (`.zcf` or
   screen walkthrough).
3. Upgrade COI instances `_1`/`_2`/`_3` from interchangeable-ish to located
   (salon / port / stbd) per `device_locations`; fixture the mapping.
4. Wire circuit inventory into Controls section inputs as config-layer content
   (English names primary). OPT/CUS channels render as fitted only if
   inventory-corroborated; else `context_shaping`.
5. Re-run vessel; surface reconciliation notes (e.g. water heater on COI n°01
   vs folio 8; windlass/winch vs folio 25) — do not auto-resolve.
6. Re-render Controls draft; paste draft + provenance map + reconciliation notes.

Eval adds: **(xxiii)** every rendered circuit name traces to an adjudicated
`channel_entry`; **(xxiv)** no uncorroborated OPT/CUS asserted as fitted;
**(xxv)** modes/favourites gap still explicit.
"""


def mark(row: dict, note: str) -> None:
    row["cell_confidence"] = "ambiguous"
    prev = row.get("uncertainty_note") or ""
    if note not in prev:
        row["uncertainty_note"] = (prev + " " + note).strip()


def main() -> int:
    parts = []
    for name in [
        "coi_column_left",
        "coi_column_mid",
        "coi_column_right",
        "mid_devices",
        "dc_devices",
    ]:
        parts.append(json.loads((OUT / f"pass_{name}.json").read_text(encoding="utf-8")))

    merged: dict = {
        "document": {},
        "device_locations": [],
        "channel_entries": [],
        "extractor_flags": [],
    }
    seen_loc: set[str] = set()
    seen_ch: set[tuple[str, str]] = set()
    for part in parts:
        doc = part.get("document") or {}
        for k, v in doc.items():
            if not v:
                continue
            cur = merged["document"].get(k)
            if not cur or (k == "version_line" and "Bureau" in str(v)):
                merged["document"][k] = v
        for loc in part.get("device_locations") or []:
            key = str(loc.get("device_instance") or "")
            if key and key not in seen_loc:
                seen_loc.add(key)
                merged["device_locations"].append(loc)
        for row in part.get("channel_entries") or []:
            key = (str(row.get("device_instance")), str(row.get("channel_ref")))
            if key in seen_ch:
                continue
            seen_ch.add(key)
            merged["channel_entries"].append(row)

    merged["document"].update(
        {
            "source_doc": "Owners' manual 55N60 / OUTREMER YACHTING",
            "page": 46,
            "boat_model": "OUT55N60",
            "version_line": "Offshore / MFS Custom : Bureau Lit",
            "revision_date": "05/05/2026",
            "revision_index": "Ind C",
            "title_verbatim": "C-ZONE CHANELS",
        }
    )

    for row in merged["channel_entries"]:
        ref = str(row.get("channel_ref") or "")
        fr = str(row.get("circuit_name_fr") or "")
        en = str(row.get("circuit_name_en") or "")
        fuse = row.get("fuse_rating")
        flag = row.get("option_flag")
        dev = str(row.get("device_instance") or "")

        if not row.get("empty_row") and (not fr or not en):
            mark(row, "missing FR or EN")
        if (
            "Fridge" in en
            and flag == "OPT"
            and "[OPT]" not in fr
            and "[OPT]" not in en
        ):
            mark(row, "Fridge marked OPT without [OPT] token — verify shading")
        if "Auto Pilot" in en and flag == "OPT" and "[OPT]" not in fr:
            mark(row, "Auto Pilot marked OPT without [OPT] — verify")
        if "Fresh Water PORT" in en and flag == "OPT" and "[OPT]" not in fr:
            mark(row, "Fresh Water PORT marked OPT without [OPT] — verify")
        if (
            dev.startswith("COI n°3")
            and ref.startswith("COI3-")
            and not ref.startswith("COI3-A")
        ):
            try:
                pin = int(row.get("pin") or 0)
            except (TypeError, ValueError):
                pin = 0
            if pin > 12:
                mark(
                    row,
                    "output pin>12 — likely analogue rows folded into outputs",
                )
        if fuse and ("&" in str(fuse) or "128" in str(fuse)):
            mark(row, "fuse_rating looks like Note column bleed")
        if "-A" in ref and str(fuse) in {"2", "3", "5"}:
            mark(row, "analogue input with fuse value — usually blank")

    loc_fixes = {
        "COI n°1": {
            "zone_label_fr": "Carré",
            "zone_label_en": "Salon",
            "hull_side": "center",
            "device_kind": "coi",
        },
        "COI n°2": {
            "zone_label_fr": "Bâbord",
            "zone_label_en": "Port",
            "hull_side": "port",
            "device_kind": "coi",
        },
        "COI n°3": {
            "zone_label_fr": "Tribord",
            "zone_label_en": "Starboard",
            "hull_side": "stbd",
            "device_kind": "coi",
        },
    }
    for loc in merged["device_locations"]:
        key = str(loc.get("device_instance") or "")
        if key in loc_fixes:
            loc.update(loc_fixes[key])
            note = loc.get("uncertainty_note") or ""
            add = "zone labels from document headers; confirm"
            if add not in note:
                loc["uncertainty_note"] = (note + " " + add).strip()

    merged["extractor_flags"] = [
        "STOP for human adjudication — do not commit facts.",
        "Dense landscape table: vision extract is provisional; column-shift "
        "is the primary defect class.",
        "COI n°3 pass1 packing looks wrong (outputs/analogue possibly "
        "interleaved) — highest priority review.",
        "COI n°1 refs may be C01-* vs COI1-* — confirm REPERE glyphs "
        "(digit 0 vs letter O).",
        "Option flags over-assigned on some STD circuits (Auto Pilot / Fresh "
        "Water / Fridge) — verify grey OPTION shading vs name tokens.",
        "CUS orange rows (COI3 salon courtesy note 12 and 14) must be "
        "distinguished from OPT grey.",
        "FuseBox 01/03/04 and many OI/DC EN names incomplete in mid/dc passes.",
        "Touch7 / WiFi address labels may appear on sheet but are not "
        "channel_entries.",
        "Revision 05/05/2026 Ind C postdates 2023-era DC folios — "
        "supersedes_where_conflicting on commit.",
    ]
    merged["_meta"] = {
        "status": "pending_adjudication",
        "source_pdf": str(
            ARTIFACTS / "channel_map_czone_chanels_ind_c.pdf"
        ),
        "artifact_id": "channel_map_czone_chanels_ind_c",
        "Fixture-Auth": (
            "chat channel_map founding — LLM extract pending human "
            "adjudication against PDF; do not commit facts until approved"
        ),
        "passes": [
            "pass_coi_column_*",
            "pass_mid_devices",
            "pass_dc_devices",
        ],
        "planned_commit_blocked": True,
    }

    md = render_channel_map_markdown(merged) + PLANNED_COMMIT
    (OUT / "channel_map_extract.json").write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (OUT / "channel_map_parsed.md").write_text(md, encoding="utf-8")
    (ARTIFACTS / "channel_map_parsed.md").write_text(md, encoding="utf-8")

    print("entries", len(merged["channel_entries"]))
    print("conf", Counter(e.get("cell_confidence") for e in merged["channel_entries"]))
    print("ambiguous:")
    for e in merged["channel_entries"]:
        if e.get("cell_confidence") == "ambiguous":
            print(
                " ",
                e.get("device_instance"),
                e.get("channel_ref"),
                e.get("circuit_name_en"),
                "|",
                e.get("uncertainty_note"),
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
