"""Universal channel_map vessel_artifact schema (builder-doc adjudicated extract).

Builder documentation is an unbounded-format source class: extract ONLY via
adjudicated LLM reading against this fixed schema. Do not add per-builder
parsers. Format-specific parsers remain reserved for vendor machine artifacts
(e.g. CZone ``.zcf``).
"""

from __future__ import annotations

from typing import Any

CHANNEL_MAP_SOURCE_CLASS = "channel_map"
CHANNEL_MAP_TIER = 4
CHANNEL_MAP_LAYER = "config"

OPTION_FLAGS = frozenset({"STD", "OPT", "CUS", "unclear", "unreadable"})

CHANNEL_ENTRY_FIELDS = (
    "device_instance",
    "channel_ref",
    "pin",
    "circuit_name_fr",
    "circuit_name_en",
    "fuse_rating",
    "option_flag",
    "hull_side_or_zone",
    "current_block",  # e.g. high_current | low_current | analogue_input | null
    "note",
    "cell_confidence",  # clear | ambiguous | unreadable
)

DEVICE_LOCATION_FIELDS = (
    "device_instance",
    "device_kind",  # coi | oi | fuse_box | dc500 | other
    "zone_label_fr",
    "zone_label_en",
    "hull_side",  # port | stbd | center | unclear
    "network_address",
    "cell_confidence",
)

CHANNEL_MAP_EXTRACT_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "document": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "source_doc": {"type": "string"},
                "page": {"type": ["string", "number", "null"]},
                "boat_model": {"type": ["string", "null"]},
                "version_line": {"type": ["string", "null"]},
                "revision_date": {"type": ["string", "null"]},
                "revision_index": {"type": ["string", "null"]},
                "title_verbatim": {"type": ["string", "null"]},
            },
            "required": [
                "source_doc",
                "page",
                "boat_model",
                "version_line",
                "revision_date",
                "revision_index",
                "title_verbatim",
            ],
        },
        "device_locations": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "device_instance": {"type": "string"},
                    "device_kind": {"type": "string"},
                    "zone_label_fr": {"type": ["string", "null"]},
                    "zone_label_en": {"type": ["string", "null"]},
                    "hull_side": {"type": ["string", "null"]},
                    "network_address": {"type": ["string", "null"]},
                    "cell_confidence": {
                        "type": "string",
                        "enum": ["clear", "ambiguous", "unreadable"],
                    },
                    "uncertainty_note": {"type": ["string", "null"]},
                },
                "required": [
                    "device_instance",
                    "device_kind",
                    "zone_label_fr",
                    "zone_label_en",
                    "hull_side",
                    "network_address",
                    "cell_confidence",
                    "uncertainty_note",
                ],
            },
        },
        "channel_entries": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "device_instance": {"type": "string"},
                    "channel_ref": {"type": ["string", "null"]},
                    "pin": {"type": ["string", "number", "null"]},
                    "circuit_name_fr": {"type": ["string", "null"]},
                    "circuit_name_en": {"type": ["string", "null"]},
                    "fuse_rating": {"type": ["string", "null"]},
                    "option_flag": {
                        "type": "string",
                        "enum": ["STD", "OPT", "CUS", "unclear", "unreadable"],
                    },
                    "hull_side_or_zone": {"type": ["string", "null"]},
                    "current_block": {"type": ["string", "null"]},
                    "note": {"type": ["string", "null"]},
                    "cell_confidence": {
                        "type": "string",
                        "enum": ["clear", "ambiguous", "unreadable"],
                    },
                    "uncertainty_note": {"type": ["string", "null"]},
                    "empty_row": {"type": "boolean"},
                },
                "required": [
                    "device_instance",
                    "channel_ref",
                    "pin",
                    "circuit_name_fr",
                    "circuit_name_en",
                    "fuse_rating",
                    "option_flag",
                    "hull_side_or_zone",
                    "current_block",
                    "note",
                    "cell_confidence",
                    "uncertainty_note",
                    "empty_row",
                ],
            },
        },
        "extractor_flags": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": [
        "document",
        "device_locations",
        "channel_entries",
        "extractor_flags",
    ],
}


EXTRACT_SYSTEM = """You extract a CZone / digital-switching channel map from document images
into a fixed JSON schema. This is a dense multi-column landscape table —
column integrity is critical.

Rules:
1. Read ONLY what is visible in the provided image(s). Never invent circuits,
   fuse values, or option flags from general knowledge.
2. Preserve column alignment. If a cell is unreadable or you are unsure which
   column a value belongs to, set cell_confidence to "ambiguous" or
   "unreadable" and put null / "unreadable" in the uncertain fields. Do NOT
   guess to fill gaps.
3. option_flag: STD when the row is a normal (non-highlighted) circuit;
   OPT when the document marks OPTION / OPT / grey option shading / [OPT] in
   the name; CUS when CUSTOM / orange custom shading / custom note is shown;
   unclear when you cannot tell.
4. EMPTY-ROW INTEGRITY (highest defect class): Every REPERE / pin row printed
   in the left columns MUST become one channel_entry — including rows whose
   Fonction cells are blank. Set empty_row=true, null names, null fuse when
   blank. NEVER skip an empty row and attach the next filled Fonction to the
   previous ref (that causes COI2-O14 to steal COI2-O15's values, etc.).
5. Emit refs in printed order with no gaps in the sequence you can see
   (e.g. O1,O2,O3,O4 then O5…O16 then A1…A8). If a ref number is printed
   with blank names, still emit it.
6. fuse_rating: copy the amp number as a string (e.g. "7.5", "25"); null if
   blank or unreadable. Do not copy Note-column text into fuse_rating.
7. device_instance: use the document's own label (e.g. "COI n°1", "OI n°2",
   "Fuse Box 03", "Portes-Fusible", "DC500 n°0").
8. device_locations: include network_address when the sheet prints a binary
   / DIP-style address next to the device (e.g. 1000 0010 for a COI).
9. Return ONLY JSON matching the schema.
"""


def render_channel_map_markdown(payload: dict[str, Any]) -> str:
    """Human-reviewable markdown: grouped by device, FR/EN side-by-side."""
    import re

    def _ref_sort_key(row: dict[str, Any]) -> tuple:
        ref = str(row.get("channel_ref") or "")
        # Analogue inputs after outputs.
        block = 1 if re.search(r"-A\d*$", ref, re.I) else 0
        # DC500 / similar: alpha suffixes (E, S, …) before numeric (-01, -02).
        m = re.match(r"^(.*-)([A-Za-z]+)$", ref)
        mnum = re.match(r"^(.*-)(\d+)$", ref)
        if m:
            suffix_kind = 0  # alpha first
            suffix_val: tuple = (0, m.group(2).upper())
            prefix = m.group(1)
        elif mnum:
            suffix_kind = 1
            suffix_val = (1, int(mnum.group(2)))
            prefix = mnum.group(1)
        else:
            suffix_kind = 2
            suffix_val = (2, ref.upper())
            prefix = ref
        parts = re.split(r"(\d+)", prefix)
        key: list = [block, suffix_kind]
        for p in parts:
            if p.isdigit():
                key.append((0, int(p)))
            else:
                key.append((1, p.upper()))
        key.append(suffix_val)
        return tuple(key)

    doc = payload.get("document") or {}
    lines: list[str] = [
        "# Channel map — parsed for adjudication",
        "",
        "> **STOP:** Do not commit `channel_entries` / `device_locations` as",
        "> vessel facts until this table is adjudicated against the PDF.",
        "",
        "## Citation",
        "",
        f"- **Source doc:** {doc.get('source_doc')}",
        f"- **Page:** {doc.get('page')}",
        f"- **Boat model:** {doc.get('boat_model')}",
        f"- **Version:** {doc.get('version_line')}",
        f"- **Revision:** {doc.get('revision_date')} {doc.get('revision_index') or ''}".rstrip(),
        f"- **Title (verbatim):** {doc.get('title_verbatim')}",
        "",
        "## Device locations",
        "",
        "| device_instance | kind | zone FR | zone EN | hull_side | address | confidence | notes |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for loc in payload.get("device_locations") or []:
        if not isinstance(loc, dict):
            continue
        lines.append(
            "| {device_instance} | {device_kind} | {zone_label_fr} | {zone_label_en} | "
            "{hull_side} | {network_address} | {cell_confidence} | {uncertainty_note} |".format(
                device_instance=loc.get("device_instance") or "",
                device_kind=loc.get("device_kind") or "",
                zone_label_fr=loc.get("zone_label_fr") or "",
                zone_label_en=loc.get("zone_label_en") or "",
                hull_side=loc.get("hull_side") or "",
                network_address=loc.get("network_address") or "",
                cell_confidence=loc.get("cell_confidence") or "",
                uncertainty_note=(loc.get("uncertainty_note") or "").replace("|", "/"),
            )
        )

    lines.extend(["", "## Channel entries (by device)", ""])
    by_dev: dict[str, list[dict[str, Any]]] = {}
    for row in payload.get("channel_entries") or []:
        if not isinstance(row, dict):
            continue
        key = str(row.get("device_instance") or "unknown")
        by_dev.setdefault(key, []).append(row)

    unsure: list[str] = []
    for dev, rows in by_dev.items():
        rows = sorted(rows, key=_ref_sort_key)
        lines.append(f"### {dev}")
        lines.append("")
        lines.append(
            "| ref | pin | FR | EN | fuse | flag | zone | block | conf | notes |"
        )
        lines.append("|---|---|---|---|---|---|---|---|---|---|")
        for row in rows:
            conf = str(row.get("cell_confidence") or "")
            flag = str(row.get("option_flag") or "")
            note = str(row.get("uncertainty_note") or row.get("note") or "")
            if row.get("empty_row"):
                fr_disp = "— (empty)"
                en_disp = "— (empty)"
            else:
                fr_disp = (row.get("circuit_name_fr") or "").replace("|", "/")
                en_disp = (row.get("circuit_name_en") or "").replace("|", "/")
            if conf in {"ambiguous", "unreadable"} or flag in {
                "unclear",
                "unreadable",
            }:
                unsure.append(
                    f"- **{dev}** `{row.get('channel_ref')}`: "
                    f"conf={conf} flag={flag} — {note or 'flagged by extractor'}"
                )
            lines.append(
                "| {channel_ref} | {pin} | {circuit_name_fr} | {circuit_name_en} | "
                "{fuse_rating} | {option_flag} | {hull_side_or_zone} | {current_block} | "
                "{cell_confidence} | {note} |".format(
                    channel_ref=row.get("channel_ref") or "",
                    pin=row.get("pin") if row.get("pin") is not None else "",
                    circuit_name_fr=fr_disp,
                    circuit_name_en=en_disp,
                    fuse_rating=row.get("fuse_rating") or "",
                    option_flag=flag,
                    hull_side_or_zone=row.get("hull_side_or_zone") or "",
                    current_block=row.get("current_block") or "",
                    cell_confidence=conf,
                    note=note.replace("|", "/"),
                )
            )
        lines.append("")

    flags = payload.get("extractor_flags") or []
    lines.extend(["## Extractor flags", ""])
    if flags:
        for f in flags:
            lines.append(f"- {f}")
    else:
        lines.append("- (none)")

    lines.extend(["", "## Cells the extractor was unsure about", ""])
    if unsure:
        lines.extend(unsure)
    else:
        lines.append("- (none flagged)")

    lines.append("")
    return "\n".join(lines)
