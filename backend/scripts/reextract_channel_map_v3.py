"""Re-extract channel map after empty-row-collapse adjudication feedback.

Forces one entry per printed REPERE (including blank Fonction rows),
captures Fuse Box 03 / Portes-Fusible, and COI network addresses.
"""

from __future__ import annotations

import base64
import json
import re
import sys
from collections import Counter
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

CITATION = (
    "Owners' manual 55N60 / OUTREMER YACHTING p46 C-ZONE CHANELS, "
    "OUT55N60, Offshore / MFS Custom : Bureau Lit, 05/05/2026 Ind C."
)

EMPTY_ROW_RULE = (
    " CRITICAL: emit EVERY REPERE row visible, including blank Fonction "
    "rows (empty_row=true). Skipping blanks shifts later names onto wrong "
    "refs — the defect we are correcting."
)

PASSES: list[tuple[str, list[tuple[str, Path]], str]] = [
    (
        "coi2",
        [("coi2", CROPS / "coi2.png")],
        "Extract COI n°2 (Bâbord/Port) completely: high current O1-O4, "
        "low current O5-O16, analogue A1-A8. Include network_address if shown. "
        "Expect ~24 rows; blank O3/O14/O16-style rows MUST appear as empty_row. "
        + EMPTY_ROW_RULE
        + " "
        + CITATION,
    ),
    (
        "coi1",
        [("coi1", CROPS / "coi1.png")],
        "Extract COI n°1 (Carré/Salon) completely: high O1-O4, low O5-O16, "
        "analogue A1-A8. Include network_address if shown. Blank rows MUST "
        "be emitted. Preserve REPERE spelling exactly. "
        + EMPTY_ROW_RULE
        + " "
        + CITATION,
    ),
    (
        "coi3",
        [("coi3", CROPS / "coi3.png")],
        "Extract COI n°3 (Tribord/Starboard) completely: high O1-O4 (many "
        "may be blank), low O5-O16 (orange CUS on coupled salon-courtesy "
        "rows; grey OPT on step lights), analogue A1-A8. Include "
        "network_address if shown. "
        + EMPTY_ROW_RULE
        + " "
        + CITATION,
    ),
    (
        "mid",
        [
            ("mid_left", CROPS / "mid_left.png"),
            ("mid_mid", CROPS / "mid_mid.png"),
            ("mid_right", CROPS / "mid_right.png"),
        ],
        "Extract ALL Fuse Box and Output Interface tables visible, "
        "including Fuse Box 03 BD Avant if present. Emit blank fuse "
        "positions as empty_row. Capture device network_address values. "
        "Also note Touch7/WiFi labels if present (as device_locations, "
        "not channel_entries). "
        + EMPTY_ROW_RULE
        + " "
        + CITATION,
    ),
    (
        "dc",
        [
            ("dc_left", CROPS / "dc_left.png"),
            ("dc_mid", CROPS / "dc_mid.png"),
            ("dc_right", CROPS / "dc_right.png"),
            ("portes_fusible", CROPS / "portes_fusible.png"),
        ],
        "Extract DC500/DCS/DCD tables AND Portes-Fusible (fuse holders) "
        "if visible. Emit every printed ref including blanks. "
        + EMPTY_ROW_RULE
        + " "
        + CITATION,
    ),
]

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
5. Re-run vessel; surface reconciliation notes — do not auto-resolve.
6. Re-render Controls draft; paste draft + provenance map + reconciliation notes.

Eval adds: **(xxiii)**–**(xxv)** as in v4.12.
"""


def _vision(images: list[tuple[str, Path]], prompt: str) -> dict[str, Any]:
    client = AzureOpenAI(
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        azure_endpoint=settings.azure_openai_endpoint,
    )
    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for label, path in images:
        content.append({"type": "text", "text": f"[image: {label}]"})
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": (
                        "data:image/png;base64,"
                        + base64.standard_b64encode(path.read_bytes()).decode("ascii")
                    ),
                    "detail": "high",
                },
            }
        )
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
            {"role": "user", "content": content},
        ],
    )
    return json.loads(resp.choices[0].message.content or "{}")


def _merge(parts: list[dict[str, Any]]) -> dict[str, Any]:
    merged: dict[str, Any] = {
        "document": {},
        "device_locations": [],
        "channel_entries": [],
        "extractor_flags": [],
    }
    seen_loc: set[str] = set()
    seen_ch: set[tuple[str, str]] = set()
    for part in parts:
        for k, v in (part.get("document") or {}).items():
            if v and not merged["document"].get(k):
                merged["document"][k] = v
        for loc in part.get("device_locations") or []:
            key = str(loc.get("device_instance") or "")
            if key and key not in seen_loc:
                seen_loc.add(key)
                merged["device_locations"].append(loc)
            elif key in seen_loc and loc.get("network_address"):
                for existing in merged["device_locations"]:
                    if existing.get("device_instance") == key and not existing.get(
                        "network_address"
                    ):
                        existing["network_address"] = loc.get("network_address")
        for row in part.get("channel_entries") or []:
            ref = str(row.get("channel_ref") or "")
            dev = str(row.get("device_instance") or "")
            key = (dev, ref or f"pin:{row.get('pin')}:{id(row)}")
            if ref and (dev, ref) in seen_ch:
                continue
            if ref:
                seen_ch.add((dev, ref))
            merged["channel_entries"].append(row)
        for flag in part.get("extractor_flags") or []:
            if flag not in merged["extractor_flags"]:
                merged["extractor_flags"].append(flag)
    return merged


_REF_NUM = re.compile(
    r"(?P<pre>[A-Za-z0-9]+[-_]?[OA]?)(?P<num>\d+)$", re.IGNORECASE
)


def _sequence_gap_flags(entries: list[dict[str, Any]]) -> list[str]:
    """Flag missing numbers within a device's REPERE sequence."""
    by_dev: dict[str, list[str]] = {}
    for row in entries:
        dev = str(row.get("device_instance") or "")
        ref = str(row.get("channel_ref") or "")
        if dev and ref:
            by_dev.setdefault(dev, []).append(ref)
    flags: list[str] = []
    for dev, refs in by_dev.items():
        # Group by prefix family (e.g. COI2-O vs COI2-A)
        families: dict[str, list[int]] = {}
        for ref in refs:
            m = _REF_NUM.search(ref.replace(" ", ""))
            if not m:
                continue
            families.setdefault(m.group("pre").upper(), []).append(int(m.group("num")))
        for pre, nums in families.items():
            nums = sorted(set(nums))
            if len(nums) < 2:
                continue
            missing = [n for n in range(nums[0], nums[-1] + 1) if n not in set(nums)]
            if missing:
                flags.append(
                    f"SEQUENCE GAP {dev} prefix {pre}: missing {missing} "
                    f"(empty-row collapse risk)"
                )
    return flags


def _normalize_locations(merged: dict[str, Any]) -> None:
    fixes = {
        "COI n°1": {
            "device_kind": "coi",
            "zone_label_fr": "Carré",
            "zone_label_en": "Salon",
            "hull_side": "center",
        },
        "COI n°2": {
            "device_kind": "coi",
            "zone_label_fr": "Bâbord",
            "zone_label_en": "Port",
            "hull_side": "port",
        },
        "COI n°3": {
            "device_kind": "coi",
            "zone_label_fr": "Tribord",
            "zone_label_en": "Starboard",
            "hull_side": "stbd",
        },
    }
    # Alias normalization for fuse box naming
    for loc in merged["device_locations"]:
        key = str(loc.get("device_instance") or "")
        if key in fixes:
            for k, v in fixes[key].items():
                loc[k] = v
            if not loc.get("network_address"):
                loc["cell_confidence"] = "ambiguous"
                loc["uncertainty_note"] = (
                    (loc.get("uncertainty_note") or "")
                    + " network_address missing — confirm from sheet"
                ).strip()


def main() -> int:
    parts: list[dict[str, Any]] = []
    for name, images, prompt in PASSES:
        for _, p in images:
            if not p.is_file():
                raise SystemExit(f"missing crop: {p}")
        print(f"extracting {name} ...", flush=True)
        part = _vision(images, prompt)
        (OUT / f"pass_v3_{name}.json").write_text(
            json.dumps(part, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        n = len(part.get("channel_entries") or [])
        empty = sum(1 for e in (part.get("channel_entries") or []) if e.get("empty_row"))
        print(f"  entries={n} empty_rows={empty}", flush=True)
        parts.append(part)

    merged = _merge(parts)
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
    _normalize_locations(merged)

    gap_flags = _sequence_gap_flags(merged["channel_entries"])
    review_flags = [
        "Re-extract after adjudication: empty-row collapse was the primary "
        "defect (blank Fonction rows skipped → later names shifted onto "
        "earlier refs, e.g. COI2-O14 stealing COI2-O15).",
        "Device-location feedback: require Fuse Box 03 BD Avant, "
        "Portes-Fusible, and COI network_address values.",
        "STOP — still pending human adjudication against PDF.",
    ] + gap_flags

    # Required location presence check
    loc_names = {
        str(l.get("device_instance") or "").lower() for l in merged["device_locations"]
    }
    for required, needle in [
        ("Fuse Box 03 / FB03 BD Avant", "03"),
        ("Portes-Fusible", "porte"),
    ]:
        if not any(needle in n for n in loc_names):
            review_flags.append(f"MISSING device_location candidate: {required}")

    for loc in merged["device_locations"]:
        if str(loc.get("device_kind") or "").lower() in {"coi", "combination output interface"}:
            if not loc.get("network_address"):
                review_flags.append(
                    f"COI address still missing: {loc.get('device_instance')}"
                )

    # Smell: OPT without [OPT] token
    for row in merged["channel_entries"]:
        if row.get("empty_row"):
            continue
        fr = str(row.get("circuit_name_fr") or "")
        en = str(row.get("circuit_name_en") or "")
        if not fr or not en:
            row["cell_confidence"] = "ambiguous"
            row["uncertainty_note"] = (
                (row.get("uncertainty_note") or "") + " missing FR or EN"
            ).strip()
        if row.get("option_flag") == "OPT" and "[OPT]" not in fr and "[OPT]" not in en:
            row["cell_confidence"] = "ambiguous"
            row["uncertainty_note"] = (
                (row.get("uncertainty_note") or "")
                + " OPT without [OPT] token — verify grey shading"
            ).strip()
        if row.get("fuse_rating") and (
            "&" in str(row.get("fuse_rating")) or "128" in str(row.get("fuse_rating"))
        ):
            row["cell_confidence"] = "ambiguous"
            row["uncertainty_note"] = (
                (row.get("uncertainty_note") or "")
                + " fuse looks like Note-column bleed"
            ).strip()

    merged["extractor_flags"] = list(dict.fromkeys(review_flags))
    merged["_meta"] = {
        "status": "pending_adjudication",
        "adjudication_round": 2,
        "prior_defect": "empty_row_collapse",
        "source_pdf": str(ARTIFACTS / "channel_map_czone_chanels_ind_c.pdf"),
        "artifact_id": "channel_map_czone_chanels_ind_c",
        "Fixture-Auth": (
            "chat channel_map founding — round-2 extract after empty-row "
            "feedback; still pending human adjudication"
        ),
        "planned_commit_blocked": True,
    }

    (OUT / "channel_map_extract.json").write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    md = render_channel_map_markdown(merged) + PLANNED_COMMIT
    (OUT / "channel_map_parsed.md").write_text(md, encoding="utf-8")
    (ARTIFACTS / "channel_map_parsed.md").write_text(md, encoding="utf-8")

    print("TOTAL", len(merged["channel_entries"]), "locs", len(merged["device_locations"]))
    print(
        "empty_rows",
        sum(1 for e in merged["channel_entries"] if e.get("empty_row")),
    )
    print(Counter(e.get("device_instance") for e in merged["channel_entries"]))
    print("locations:")
    for loc in merged["device_locations"]:
        print(
            " ",
            loc.get("device_instance"),
            loc.get("network_address"),
            loc.get("zone_label_fr"),
        )
    print("gap flags:")
    for f in gap_flags:
        print(" ", f)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
