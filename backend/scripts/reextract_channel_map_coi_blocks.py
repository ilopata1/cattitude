"""Re-extract COI blocks at higher zoom; merge with mid/DC from pass1."""

from __future__ import annotations

import base64
import json
import sys
from collections import Counter
from pathlib import Path

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
CROPS = OUT / "_work/crops_v2"

STRICT = (
    EXTRACT_SYSTEM
    + """
EXTRA STRICT FOR THIS PASS:
- Prefer cell_confidence=ambiguous over inventing fuse/name alignment.
- Empty Fonction cells: empty_row=true, names null.
- Grey row / [OPT] in name / OPT in Note column => option_flag OPT.
- Orange/peach CUSTOM row => option_flag CUS.
- Otherwise STD only if you can see a filled non-option row.
- Preserve REPERE strings EXACTLY as printed (COI2-O1 vs COI2-01 etc).
- Include EVERY pin row visible in THIS image only.
"""
)

PASSES = [
    ("coi2_high", "COI n°2 high-current outputs only (Bâbord)."),
    ("coi2_low", "COI n°2 low-current outputs only (Bâbord)."),
    ("coi2_analogue", "COI n°2 analogue inputs only (Bâbord)."),
    ("coi1_high", "COI n°1 high-current outputs only (Carré)."),
    ("coi1_low", "COI n°1 low-current outputs only (Carré)."),
    ("coi1_analogue", "COI n°1 analogue inputs only (Carré)."),
    ("coi3_high", "COI n°3 high-current outputs only (Tribord)."),
    ("coi3_low", "COI n°3 low-current outputs only (Tribord). Include CUS orange rows."),
    ("coi3_analogue", "COI n°3 analogue inputs only (Tribord)."),
]

REVIEW_FLAGS = [
    "PASS1 marked all cells clear; PASS2 re-extracted COI blocks at higher crop zoom.",
    "REF FORMAT may differ by column (COI2-On vs COI3-nn vs C01-nn) — verify REPERE "
    "glyphs (digit 0 vs letter O) against the PDF.",
    "COI high-current pin/name alignment disagreed between vision passes — "
    "adjudicate Alim Pilote / Lave Pont / Pompe ED row order on COI2 and empty "
    "high-current rows on COI3 carefully.",
    "Fuse ratings on lighting rows (2 vs 3 vs 7.5) are a known column-shift hazard.",
    "Orange CUSTOM rows (COI3-12 / COI3-14 salon courtesy) must be option_flag=CUS.",
    "Mid-band FuseBox/OI/DC500 from PASS1 is incomplete (sparse EN, missing FB "
    "rows) — treat as incomplete pending adjudication.",
    "Version line should include ': Bureau Lit' if present on the sheet.",
    "Analogue inputs typically have blank fuse — null fuse expected, not 2A.",
]


def vision(path: Path, hint: str) -> dict:
    client = AzureOpenAI(
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        azure_endpoint=settings.azure_openai_endpoint,
    )
    b64 = base64.standard_b64encode(path.read_bytes()).decode("ascii")
    prompt = (
        "Citation: Owners manual 55N60 p46 C-ZONE CHANELS, OUT55N60, "
        "Offshore / MFS Custom : Bureau Lit, 05/05/2026 Ind C. "
        + hint
        + " Return channel_entries + device_locations for this crop only."
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
            {"role": "system", "content": STRICT},
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


def main() -> int:
    prev = json.loads((OUT / "channel_map_extract.json").read_text(encoding="utf-8"))
    parts: list[dict] = []
    for name, hint in PASSES:
        path = CROPS / f"{name}.png"
        print(f"pass {name} ...", flush=True)
        part = vision(path, hint)
        (OUT / f"pass_v2_{name}.json").write_text(
            json.dumps(part, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        parts.append(part)
        print(f"  {len(part.get('channel_entries') or [])} entries", flush=True)

    non_coi_entries = [
        e
        for e in (prev.get("channel_entries") or [])
        if not str(e.get("device_instance") or "").startswith("COI")
    ]
    non_coi_locs = [
        loc
        for loc in (prev.get("device_locations") or [])
        if not str(loc.get("device_instance") or "").startswith("COI")
    ]

    merged: dict = {
        "document": dict(prev.get("document") or {}),
        "device_locations": list(non_coi_locs),
        "channel_entries": list(non_coi_entries),
        "extractor_flags": [],
    }
    seen_loc = {str(l.get("device_instance")) for l in merged["device_locations"]}
    seen_ch = {
        (str(e.get("device_instance")), str(e.get("channel_ref")))
        for e in merged["channel_entries"]
    }

    for part in parts:
        doc = part.get("document") or {}
        for k, v in doc.items():
            if v and not merged["document"].get(k):
                merged["document"][k] = v
        if doc.get("version_line") and "Bureau" in str(doc.get("version_line")):
            merged["document"]["version_line"] = doc["version_line"]
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

    # Prefer explicit Bureau Lit citation from the known sheet.
    merged["document"]["version_line"] = "Offshore / MFS Custom : Bureau Lit"
    merged["document"]["source_doc"] = "Owners' manual 55N60 / OUTREMER YACHTING"
    merged["document"]["page"] = 46
    merged["document"]["boat_model"] = "OUT55N60"
    merged["document"]["revision_date"] = "05/05/2026"
    merged["document"]["revision_index"] = "Ind C"
    merged["document"]["title_verbatim"] = "C-ZONE CHANELS"

    for row in merged["channel_entries"]:
        if row.get("empty_row"):
            continue
        if not row.get("circuit_name_fr") or not row.get("circuit_name_en"):
            row["cell_confidence"] = "ambiguous"
            note = row.get("uncertainty_note") or ""
            if "missing FR or EN" not in note:
                row["uncertainty_note"] = (note + " missing FR or EN name").strip()

    merged["extractor_flags"] = list(REVIEW_FLAGS)
    merged["_meta"] = {
        "status": "pending_adjudication",
        "source_pdf": (prev.get("_meta") or {}).get("source_pdf"),
        "Fixture-Auth": (
            "chat channel_map founding — LLM extract pending human adjudication "
            "against PDF; do not commit facts until approved"
        ),
        "passes": ["v1_merged", "v2_coi_block_crops"],
    }

    (OUT / "channel_map_extract.json").write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (OUT / "channel_map_parsed.md").write_text(
        render_channel_map_markdown(merged), encoding="utf-8"
    )
    print("TOTAL", len(merged["channel_entries"]), "locs", len(merged["device_locations"]))
    print(Counter(e.get("device_instance") for e in merged["channel_entries"]))
    print("conf", Counter(e.get("cell_confidence") for e in merged["channel_entries"]))
    print("opt", Counter(e.get("option_flag") for e in merged["channel_entries"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
