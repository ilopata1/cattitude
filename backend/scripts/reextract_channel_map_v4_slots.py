"""COI slot-forced re-extract: emit every REPERE in a fixed list, blank or not."""

from __future__ import annotations

import base64
import json
import sys
from pathlib import Path
from typing import Any

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from channel_map_schema import (  # noqa: E402
    CHANNEL_MAP_EXTRACT_JSON_SCHEMA,
    EXTRACT_SYSTEM,
    render_channel_map_markdown,
)
from config import settings  # noqa: E402
from openai import AzureOpenAI  # noqa: E402

OUT = BACKEND / "fixtures/pipeline/scratch/channel_map_adjudication"
CROPS = OUT / "_work/crops_v3"
ARTIFACTS = BACKEND / "fixtures/pipeline/outremer/artifacts"

# Document uses COIn-Om / COIn-Am style on this sheet (letter O).
COI_SLOTS = {
    "COI n°2": {
        "image": "coi2.png",
        "zone": ("Bâbord", "Port", "port"),
        "address_hint": "1000 0010",
        "refs": [f"COI2-O{i}" for i in range(1, 17)]
        + [f"COI2-A{i}" for i in range(1, 9)],
    },
    "COI n°1": {
        "image": "coi1.png",
        "zone": ("Carré", "Salon", "center"),
        "address_hint": "1000 0001",
        "refs": [f"COI1-O{i}" for i in range(1, 17)]
        + [f"COI1-A{i}" for i in range(1, 9)],
    },
    "COI n°3": {
        "image": "coi3.png",
        "zone": ("Tribord", "Starboard", "stbd"),
        "address_hint": "1000 0011",
        "refs": [f"COI3-O{i}" for i in range(1, 17)]
        + [f"COI3-A{i}" for i in range(1, 9)],
    },
}

PLANNED_COMMIT = """
## Planned commit (DO NOT EXECUTE until you approve B3)

After adjudication of the table above:

1. Commit adjudicated `channel_entries` + `device_locations` as `channel_map`
   facts with citations (source doc p46, 05/05/2026 Ind C) and
   `supersedes_where_conflicting` toward older DC folios.
2. Split `config_unsourced`: circuits sourced; modes/favourites/alarms remain
   unsourced (`.zcf` or screen walkthrough).
3. Locate COI `_1`/`_2`/`_3` (salon / port / stbd); fixture the mapping.
4. Wire Controls config-layer; OPT/CUS fitted only if inventory-corroborated.
5. Re-run vessel; surface contradictions — do not auto-resolve.
6. Re-render Controls draft + provenance + reconciliation notes.

Eval: **(xxiii)**–**(xxv)** per v4.12.
"""


def _vision(path: Path, prompt: str) -> dict[str, Any]:
    client = AzureOpenAI(
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        azure_endpoint=settings.azure_openai_endpoint,
    )
    b64 = base64.standard_b64encode(path.read_bytes()).decode("ascii")
    resp = client.chat.completions.create(
        model=settings.azure_openai_chat_deployment,
        temperature=0,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "channel_map_extract",
                "strict": True,
                "schema": CHANNEL_MAP_EXTRACT_JSON_SCHEMA,
            },
        },
        messages=[
            {"role": "system", "content": EXTRACT_SYSTEM},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{b64}",
                            "detail": "high",
                        },
                    },
                ],
            },
        ],
    )
    return json.loads(resp.choices[0].message.content or "{}")


def _coi_prompt(device: str, meta: dict[str, Any]) -> str:
    refs = ", ".join(meta["refs"])
    return f"""
Citation: Owners' manual 55N60 p46 C-ZONE CHANELS, OUT55N60,
Offshore / MFS Custom : Bureau Lit, 05/05/2026 Ind C.

Extract ONLY {device}.

MANDATORY: return exactly one channel_entry for EACH of these channel_ref
values, in this order, and no others:
{refs}

Rules for each slot:
- Read the row whose REPERE matches that ref (or the same number with 0/O
  glyph variants — normalize to the listed ref spelling above).
- If Fonction FR and EN are both blank: empty_row=true, names null,
  fuse_rating null, option_flag STD (or unclear if shading unreadable).
- If the row has names: empty_row=false and copy FR/EN/fuse/note/flag.
- NEVER put a later row's names onto an earlier ref. Blank rows stay blank.
- High current = O1-O4; low current = O5-O16; analogue = A1-A8.
- Grey/[OPT] => OPT; orange/CUSTOM => CUS; else STD.
- device_locations: one row for {device} with network_address if visible
  (hint often {meta['address_hint']}), zone {meta['zone'][0]} / {meta['zone'][1]}.
"""


def _align_to_slots(
    device: str, part: dict[str, Any], refs: list[str]
) -> list[dict[str, Any]]:
    by_ref: dict[str, dict[str, Any]] = {}
    for row in part.get("channel_entries") or []:
        ref = str(row.get("channel_ref") or "").strip()
        # Normalize COI2-01 -> COI2-O1, C01-01 -> skip unless maps
        norm = ref.replace(" ", "")
        norm = norm.replace("-0", "-O") if "-O" not in norm.upper() and "-A" not in norm.upper() else norm
        # Fix digit-zero after hyphen before number only when letter-O form expected
        import re

        m = re.match(r"(COI\d+)-0?(\d+)$", norm, re.I)
        if m and f"{m.group(1).upper()}-O{int(m.group(2))}" in refs:
            norm = f"{m.group(1).upper()}-O{int(m.group(2))}"
        m = re.match(r"(COI\d+)-A0?(\d+)$", norm, re.I)
        if m:
            norm = f"{m.group(1).upper()}-A{int(m.group(2))}"
        # Uppercase O variants
        m = re.match(r"(COI\d+)-O0?(\d+)$", norm, re.I)
        if m:
            norm = f"{m.group(1).upper()}-O{int(m.group(2))}"
        by_ref[norm] = row

    out: list[dict[str, Any]] = []
    for i, ref in enumerate(refs):
        pin = (i % 16) + 1 if "-O" in ref else (i - 16) + 1
        if "-O" in ref:
            num = int(ref.split("-O")[1])
            pin = num if num <= 4 else num - 4  # rough; prefer model pin
        if "-A" in ref:
            pin = int(ref.split("-A")[1])
        row = by_ref.get(ref)
        if row is None:
            out.append(
                {
                    "device_instance": device,
                    "channel_ref": ref,
                    "pin": pin,
                    "circuit_name_fr": None,
                    "circuit_name_en": None,
                    "fuse_rating": None,
                    "option_flag": "unclear",
                    "hull_side_or_zone": None,
                    "current_block": (
                        "high_current"
                        if "-O" in ref and int(ref.split("-O")[1]) <= 4
                        else "low_current"
                        if "-O" in ref
                        else "analogue_input"
                    ),
                    "note": None,
                    "cell_confidence": "ambiguous",
                    "uncertainty_note": "slot missing from model output — needs PDF check",
                    "empty_row": True,
                }
            )
            continue
        fixed = dict(row)
        fixed["device_instance"] = device
        fixed["channel_ref"] = ref
        # Contradiction: empty_row but has names → not empty; names belong check
        has_name = bool(fixed.get("circuit_name_fr") or fixed.get("circuit_name_en"))
        if fixed.get("empty_row") and has_name:
            fixed["empty_row"] = False
            fixed["cell_confidence"] = "ambiguous"
            fixed["uncertainty_note"] = (
                (fixed.get("uncertainty_note") or "")
                + " empty_row was true but names present — verify alignment"
            ).strip()
        if not fixed.get("empty_row") and not has_name:
            fixed["empty_row"] = True
        out.append(fixed)
    return out


def main() -> int:
    prev = json.loads((OUT / "channel_map_extract.json").read_text(encoding="utf-8"))
    # Keep non-COI entries from v3 mid/dc passes
    non_coi = [
        e
        for e in prev.get("channel_entries") or []
        if not str(e.get("device_instance") or "").startswith("COI")
    ]
    non_coi_locs = [
        loc
        for loc in prev.get("device_locations") or []
        if not str(loc.get("device_instance") or "").startswith("COI")
    ]

    coi_entries: list[dict[str, Any]] = []
    coi_locs: list[dict[str, Any]] = []
    for device, meta in COI_SLOTS.items():
        path = CROPS / meta["image"]
        print(f"slot-forced {device} ...", flush=True)
        part = _vision(path, _coi_prompt(device, meta))
        (OUT / f"pass_v4_{device.replace(' ', '_').replace('°', '')}.json").write_text(
            json.dumps(part, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        aligned = _align_to_slots(device, part, meta["refs"])
        empty = sum(1 for e in aligned if e.get("empty_row"))
        print(f"  slots={len(aligned)} empty={empty}", flush=True)
        coi_entries.extend(aligned)
        # location
        loc = None
        for candidate in part.get("device_locations") or []:
            if str(candidate.get("device_instance") or "").startswith("COI"):
                loc = dict(candidate)
                break
        if loc is None:
            loc = {
                "device_instance": device,
                "device_kind": "coi",
                "zone_label_fr": meta["zone"][0],
                "zone_label_en": meta["zone"][1],
                "hull_side": meta["zone"][2],
                "network_address": meta["address_hint"],
                "cell_confidence": "ambiguous",
                "uncertainty_note": "address from sheet hint; confirm glyph",
            }
        else:
            loc["device_instance"] = device
            loc["device_kind"] = "coi"
            loc["zone_label_fr"] = meta["zone"][0]
            loc["zone_label_en"] = meta["zone"][1]
            loc["hull_side"] = meta["zone"][2]
            if not loc.get("network_address"):
                loc["network_address"] = meta["address_hint"]
                loc["cell_confidence"] = "ambiguous"
                loc["uncertainty_note"] = (
                    (loc.get("uncertainty_note") or "")
                    + " address filled from common sheet value; confirm"
                ).strip()
        coi_locs.append(loc)

    # Ensure Fuse Box 03 location exists when entries present
    loc_names = {str(l.get("device_instance") or "") for l in non_coi_locs}
    fb03_entries = [
        e
        for e in non_coi
        if "03" in str(e.get("device_instance") or "")
        and "fuse" in str(e.get("device_instance") or "").lower()
    ]
    if fb03_entries and not any("03" in n for n in loc_names):
        non_coi_locs.append(
            {
                "device_instance": "Fuse Box 03 BD Avant",
                "device_kind": "fuse_box",
                "zone_label_fr": "BD Avant",
                "zone_label_en": "Port Forward",
                "hull_side": "port",
                "network_address": None,
                "cell_confidence": "clear",
                "uncertainty_note": None,
            }
        )

    # Portes-Fusible channel entries if location-only
    has_portes_entries = any(
        "orte" in str(e.get("device_instance") or "").lower()
        or "fusible" in str(e.get("device_instance") or "").lower()
        for e in non_coi
    )
    if not has_portes_entries:
        # Placeholder rows for adjudication — marked ambiguous
        for ref, fuse in (("DCD2-E", "250"), ("DCD3-E", "250")):
            non_coi.append(
                {
                    "device_instance": "Portes-Fusible",
                    "channel_ref": ref,
                    "pin": None,
                    "circuit_name_fr": f"FUSE/{ref.split('-')[0]}",
                    "circuit_name_en": f"FUSE/{ref.split('-')[0]}",
                    "fuse_rating": fuse,
                    "option_flag": "STD",
                    "hull_side_or_zone": None,
                    "current_block": None,
                    "note": None,
                    "cell_confidence": "ambiguous",
                    "uncertainty_note": (
                        "Portes-Fusible row inferred from prior band read — "
                        "confirm labels against PDF (not slot-forced vision)"
                    ),
                    "empty_row": False,
                }
            )

    merged = {
        "document": {
            "source_doc": "Owners' manual 55N60 / OUTREMER YACHTING",
            "page": 46,
            "boat_model": "OUT55N60",
            "version_line": "Offshore / MFS Custom : Bureau Lit",
            "revision_date": "05/05/2026",
            "revision_index": "Ind C",
            "title_verbatim": "C-ZONE CHANELS",
        },
        "device_locations": coi_locs + non_coi_locs,
        "channel_entries": coi_entries + non_coi,
        "extractor_flags": [
            "Round 3: COI extracts use mandatory REPERE slot lists so blank "
            "Fonction rows cannot collapse into neighboring refs.",
            "Adjudication defect class confirmed: empty-row skip → name shift "
            "(e.g. COI2-O14 stealing O15).",
            "Fuse Box 03 BD Avant and Portes-Fusible required in device_locations.",
            "COI network_address populated (1000 0001 / 1000 0010 / 1000 0011).",
            "STOP — still pending human adjudication against PDF.",
        ],
        "_meta": {
            "status": "pending_adjudication",
            "adjudication_round": 3,
            "prior_defect": "empty_row_collapse",
            "source_pdf": str(ARTIFACTS / "channel_map_czone_chanels_ind_c.pdf"),
            "artifact_id": "channel_map_czone_chanels_ind_c",
            "Fixture-Auth": (
                "chat channel_map founding — round-3 slot-forced COI extract "
                "after empty-row feedback; still pending adjudication"
            ),
            "planned_commit_blocked": True,
        },
    }

    # Smell flags
    for row in merged["channel_entries"]:
        if row.get("empty_row"):
            continue
        fr = str(row.get("circuit_name_fr") or "")
        en = str(row.get("circuit_name_en") or "")
        if not fr or not en:
            row["cell_confidence"] = "ambiguous"
            note = row.get("uncertainty_note") or ""
            if "missing FR or EN" not in note:
                row["uncertainty_note"] = (note + " missing FR or EN").strip()
        fuse = row.get("fuse_rating")
        if fuse and ("&" in str(fuse) or str(fuse).startswith("128")):
            row["cell_confidence"] = "ambiguous"
            row["uncertainty_note"] = (
                (row.get("uncertainty_note") or "")
                + " fuse looks like Note-column bleed"
            ).strip()

    (OUT / "channel_map_extract.json").write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    md = render_channel_map_markdown(merged) + PLANNED_COMMIT
    (OUT / "channel_map_parsed.md").write_text(md, encoding="utf-8")
    (ARTIFACTS / "channel_map_parsed.md").write_text(md, encoding="utf-8")

    print("TOTAL", len(merged["channel_entries"]))
    for device in COI_SLOTS:
        rows = [e for e in coi_entries if e["device_instance"] == device]
        print(
            device,
            "empty",
            sum(1 for e in rows if e.get("empty_row")),
            "ambiguous",
            sum(1 for e in rows if e.get("cell_confidence") == "ambiguous"),
        )
        for e in rows:
            if e.get("empty_row") or "O14" in str(e.get("channel_ref")) or "O15" in str(
                e.get("channel_ref")
            ) or "O3" in str(e.get("channel_ref")) and "-O3" in str(e.get("channel_ref")):
                if e.get("channel_ref") in {
                    "COI2-O3",
                    "COI2-O4",
                    "COI2-O14",
                    "COI2-O15",
                    "COI2-O16",
                    "COI3-O1",
                    "COI3-O4",
                    "COI3-O12",
                    "COI3-O14",
                    "COI3-O15",
                }:
                    print(
                        " ",
                        e.get("channel_ref"),
                        "empty="+str(e.get("empty_row")),
                        e.get("circuit_name_en") or e.get("circuit_name_fr"),
                    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
