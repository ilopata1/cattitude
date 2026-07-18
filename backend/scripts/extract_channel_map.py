"""Adjudicated LLM extract of a builder channel_map PDF → review artifacts.

Does NOT commit facts into equipment.json. Emits:
  - channel_map_extract.json
  - channel_map_parsed.md

Usage:
  python scripts/extract_channel_map.py \\
    --pdf fixtures/pipeline/outremer/artifacts/channel_map_czone_chanels_ind_c.pdf \\
    --out-dir fixtures/pipeline/scratch/channel_map_adjudication
"""

from __future__ import annotations

import argparse
import base64
import json
import shutil
import sys
from pathlib import Path
from typing import Any

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from channel_map_schema import (  # noqa: E402
    CHANNEL_MAP_EXTRACT_JSON_SCHEMA,
    EXTRACT_SYSTEM,
    render_channel_map_markdown,
)
from config import settings  # noqa: E402


def _render_page_png(pdf_path: Path, out_png: Path, *, dpi: int = 300) -> Path:
    import fitz

    doc = fitz.open(pdf_path)
    page = doc[0]
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    out_png.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(out_png))
    return out_png


def _crop_regions(full_png: Path, crops_dir: Path) -> dict[str, Path]:
    """Crop the founding Outremer landscape channel map into table tiles.

    Fractions tuned for OUT55N60 p46 C-ZONE CHANELS Ind C (A3 landscape).
    """
    from PIL import Image

    img = Image.open(full_png)
    w, h = img.size
    crops_dir.mkdir(parents=True, exist_ok=True)
    # Three columns × stacked device blocks. Overlap slightly to avoid cutting rows.
    regions: dict[str, tuple[float, float, float, float]] = {
        "meta_header": (0.15, 0.02, 0.85, 0.09),
        "coi2": (0.00, 0.07, 0.34, 0.48),
        "coi1": (0.33, 0.07, 0.67, 0.48),
        "coi3": (0.66, 0.07, 1.00, 0.48),
        "fb_oi_left": (0.00, 0.45, 0.34, 0.72),
        "fb_oi_mid": (0.33, 0.45, 0.67, 0.72),
        "fb_oi_right": (0.66, 0.45, 1.00, 0.72),
        "dc_left": (0.00, 0.68, 0.34, 0.92),
        "dc_mid": (0.33, 0.68, 0.67, 0.92),
        "dc_right": (0.66, 0.68, 1.00, 0.92),
        "full_page": (0.0, 0.0, 1.0, 1.0),
    }
    out: dict[str, Path] = {}
    for name, (x0, y0, x1, y1) in regions.items():
        if name == "full_page":
            # Downscale full page for overview context (still readable).
            overview = img.copy()
            overview.thumbnail((2400, 1700))
            p = crops_dir / "full_page_overview.png"
            overview.save(p)
            out[name] = p
            continue
        c = img.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
        p = crops_dir / f"{name}.png"
        c.save(p)
        out[name] = p
    return out


def _b64_image(path: Path) -> str:
    return base64.standard_b64encode(path.read_bytes()).decode("ascii")


def _vision_extract(
    *,
    images: list[tuple[str, Path]],
    prompt: str,
) -> dict[str, Any]:
    from openai import AzureOpenAI as AzureOpenAIClient

    client = AzureOpenAIClient(
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
                    "url": f"data:image/png;base64,{_b64_image(path)}",
                    "detail": "high",
                },
            }
        )
    response = client.chat.completions.create(
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
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


def _merge_extracts(parts: list[dict[str, Any]]) -> dict[str, Any]:
    merged: dict[str, Any] = {
        "document": {},
        "device_locations": [],
        "channel_entries": [],
        "extractor_flags": [],
    }
    seen_loc: set[str] = set()
    seen_ch: set[tuple[str, str]] = set()
    for part in parts:
        doc = part.get("document") or {}
        if doc and (not merged["document"] or doc.get("revision_date")):
            # Prefer the richest non-empty document block.
            cur = merged["document"]
            merged["document"] = {
                k: (doc.get(k) if doc.get(k) not in (None, "") else cur.get(k))
                for k in set(list(cur) + list(doc))
            } or doc
        for loc in part.get("device_locations") or []:
            if not isinstance(loc, dict):
                continue
            key = str(loc.get("device_instance") or "")
            if key and key not in seen_loc:
                seen_loc.add(key)
                merged["device_locations"].append(loc)
        for row in part.get("channel_entries") or []:
            if not isinstance(row, dict):
                continue
            ref = str(row.get("channel_ref") or "")
            dev = str(row.get("device_instance") or "")
            key = (dev, ref or f"pin:{row.get('pin')}")
            if key in seen_ch:
                continue
            seen_ch.add(key)
            merged["channel_entries"].append(row)
        for flag in part.get("extractor_flags") or []:
            if flag not in merged["extractor_flags"]:
                merged["extractor_flags"].append(flag)
    return merged


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pdf", type=Path, required=True)
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--dpi", type=int, default=300)
    args = ap.parse_args()

    out_dir: Path = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    pdf = args.pdf.resolve()
    if not pdf.is_file():
        raise SystemExit(f"missing pdf: {pdf}")

    work = out_dir / "_work"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    full_png = _render_page_png(pdf, work / "page1.png", dpi=args.dpi)
    crops = _crop_regions(full_png, work / "crops")

    citation_hint = (
        "Known citation (verify from image, do not invent beyond it): "
        "Owners' manual 55N60 / OUTREMER YACHTING, page 46, title "
        "'C-ZONE CHANELS', OUT55N60, VERSION Offshore / MFS Custom : Bureau Lit, "
        "DATE/VERSION 05/05/2026 Ind C."
    )

    passes: list[tuple[str, list[tuple[str, Path]], str]] = [
        (
            "coi_column_left",
            [("coi2", crops["coi2"]), ("overview", crops["full_page"])],
            "Extract ALL rows for the LEFT column device(s) only "
            "(typically COI n°2 / Bâbord). Include high current, low current, "
            "and analogue inputs if visible. Emit blank Fonction rows as "
            "empty_row=true — never skip blanks (prevents ref shift). "
            "Capture network_address if printed. "
            + citation_hint,
        ),
        (
            "coi_column_mid",
            [("coi1", crops["coi1"]), ("overview", crops["full_page"])],
            "Extract ALL rows for the CENTER column device(s) only "
            "(typically COI n°1 / Carré). Include high current, low current, "
            "and analogue inputs if visible. Emit blank Fonction rows as "
            "empty_row=true — never skip blanks (prevents ref shift). "
            "Capture network_address if printed. "
            + citation_hint,
        ),
        (
            "coi_column_right",
            [("coi3", crops["coi3"]), ("overview", crops["full_page"])],
            "Extract ALL rows for the RIGHT column device(s) only "
            "(typically COI n°3 / Tribord). Include high current, low current, "
            "and analogue inputs if visible. Emit blank Fonction rows as "
            "empty_row=true — never skip blanks (prevents ref shift). "
            "Capture network_address if printed. "
            + citation_hint,
        ),
        (
            "mid_devices",
            [
                ("fb_oi_left", crops["fb_oi_left"]),
                ("fb_oi_mid", crops["fb_oi_mid"]),
                ("fb_oi_right", crops["fb_oi_right"]),
            ],
            "Extract Fuse Box and Output Interface (OI) tables visible in these "
            "middle-band crops, including Fuse Box 03 BD Avant if present. "
            "Emit blank fuse positions as empty_row. Capture Touch7 / WiFi "
            "address labels as device_locations if shown. "
            + citation_hint,
        ),
        (
            "dc_devices",
            [
                ("dc_left", crops["dc_left"]),
                ("dc_mid", crops["dc_mid"]),
                ("dc_right", crops["dc_right"]),
            ],
            "Extract DC500 / DCS / DCD tables, Portes-Fusible (fuse holders), "
            "and any winch notes visible in these lower-band crops. Emit blank "
            "rows as empty_row. "
            + citation_hint,
        ),
    ]

    parts: list[dict[str, Any]] = []
    for name, images, prompt in passes:
        print(f"extracting pass: {name} ...", flush=True)
        part = _vision_extract(images=images, prompt=prompt)
        (out_dir / f"pass_{name}.json").write_text(
            json.dumps(part, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        parts.append(part)

    merged = _merge_extracts(parts)
    merged["_meta"] = {
        "status": "pending_adjudication",
        "source_pdf": str(pdf),
        "Fixture-Auth": (
            "chat channel_map founding — LLM extract pending human adjudication "
            "against PDF; do not commit facts until approved"
        ),
        "passes": [p[0] for p in passes],
    }

    json_path = out_dir / "channel_map_extract.json"
    md_path = out_dir / "channel_map_parsed.md"
    json_path.write_text(
        json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    md_path.write_text(render_channel_map_markdown(merged), encoding="utf-8")
    print(f"wrote {json_path}")
    print(f"wrote {md_path}")
    print(
        f"entries={len(merged.get('channel_entries') or [])} "
        f"locations={len(merged.get('device_locations') or [])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
