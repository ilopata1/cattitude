"""Promote adjudicated channel_map into Outremer vessel fixture (post-B3)."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

SCRATCH = BACKEND / "fixtures/pipeline/scratch/channel_map_adjudication"
ARTIFACTS = BACKEND / "fixtures/pipeline/outremer/artifacts"
OUTREMER = BACKEND / "fixtures/pipeline/outremer"


def main() -> int:
    src = SCRATCH / "channel_map_extract.json"
    if not src.is_file():
        raise SystemExit(f"missing {src}")
    extract = json.loads(src.read_text(encoding="utf-8"))
    extract["_meta"] = dict(extract.get("_meta") or {})
    extract["_meta"]["status"] = "adjudicated"
    extract["_meta"]["adjudication_round"] = "approved_against_pdf"
    extract["_meta"]["Fixture-Auth"] = (
        "chat channel_map founding — human adjudicated against PDF Ind C; "
        "committed as vessel channel_map facts"
    )
    extract["extractor_flags"] = [
        "Adjudicated against PDF — approved.",
        "Vessel-specific empty-row positions are facts for this sheet only.",
    ]

    dest = ARTIFACTS / "channel_map_extract.json"
    dest.write_text(
        json.dumps(extract, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    shutil.copy2(SCRATCH / "channel_map_parsed.md", ARTIFACTS / "channel_map_parsed.md")

    # Manifest
    manifest_path = ARTIFACTS / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for art in manifest.get("artifacts") or []:
        if art.get("id") == "channel_map_czone_chanels_ind_c":
            art["adjudication_status"] = "approved"
            art["extract_path"] = "channel_map_extract.json"
            art["parsed_path"] = "channel_map_parsed.md"
    manifest["fixture_auth"] = (
        "Fixture-Auth: chat channel_map founding — Ind C C-ZONE CHANELS "
        "adjudicated and approved; deck photos retained"
    )
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    # Equipment
    eq_path = OUTREMER / "equipment.json"
    eq = json.loads(eq_path.read_text(encoding="utf-8"))
    eq["notes"] = (
        "Touch 7 runs_platform czone_2_0; platform_version_unconfirmed until "
        "version photo. Circuit/monitoring inventory sourced from channel_map "
        "Ind C (p46); Modes/Favourites/alarm config still config_unsourced "
        "until .zcf or screen walkthrough. Climate gate unchanged."
    )
    eq["fixture_auth"] = (
        (eq.get("fixture_auth") or "")
        + "; Fixture-Auth: chat channel_map founding — Ind C adjudicated "
        "channel_map + COI located instances"
    )

    for row in eq.get("equipment") or []:
        if row.get("device_key") != "coi":
            continue
        row["catalog_key"] = "coi"
        row["quantity"] = 3
        row["instance_handling"] = "distinct"
        row["provenance"] = (
            "channel_map Ind C p46 C-ZONE CHANELS; COI n°1 Carré, "
            "n°2 Bâbord, n°3 Tribord"
        )
        row["instances"] = [
            {
                "instance_key": "coi_1",
                "instance_label": "COI n°1 — Carré / salon",
                "unit_index": 1,
                "side": "center",
                "zone": "salon",
                "network_address": "1000 0001",
                "document_label": "COI n°1",
            },
            {
                "instance_key": "coi_2",
                "instance_label": "COI n°2 — Bâbord / port",
                "unit_index": 2,
                "side": "port",
                "zone": "port",
                "network_address": "1000 0010",
                "document_label": "COI n°2",
            },
            {
                "instance_key": "coi_3",
                "instance_label": "COI n°3 — Tribord / starboard",
                "unit_index": 3,
                "side": "stbd",
                "zone": "stbd",
                "network_address": "1000 0011",
                "document_label": "COI n°3",
            },
        ]

    # Remove prior channel_map facts if re-run
    facts = [
        f
        for f in (eq.get("vessel_facts") or [])
        if f.get("id")
        not in {
            "channel_map_ind_c_circuits",
            "channel_map_ind_c_coi_locations",
        }
    ]
    facts.append(
        {
            "id": "channel_map_ind_c_coi_locations",
            "kind": "observation",
            "provenance_tier": "channel_map",
            "source_class": "channel_map",
            "evidence_refs": ["channel_map_czone_chanels_ind_c"],
            "document_citation": (
                "Owners' manual 55N60 p46 C-ZONE CHANELS Ind C 05/05/2026"
            ),
            "extract_path": "channel_map_extract.json",
            "applies_to": ["coi_1", "coi_2", "coi_3"],
            "text": (
                "Three Combination Output Interfaces located from the Ind C "
                "channel map: COI n°1 Carré/salon (1000 0001), COI n°2 "
                "Bâbord/port (1000 0010), COI n°3 Tribord/starboard (1000 0011)."
            ),
            "device_locations": extract.get("device_locations") or [],
        }
    )
    facts.append(
        {
            "id": "channel_map_ind_c_circuits",
            "kind": "observation",
            "provenance_tier": "channel_map",
            "source_class": "channel_map",
            "evidence_refs": ["channel_map_czone_chanels_ind_c"],
            "document_citation": (
                "Owners' manual 55N60 p46 C-ZONE CHANELS Ind C 05/05/2026"
            ),
            "extract_path": "channel_map_extract.json",
            "applies_to": ["czone_touch_7", "czone_2_0", "coi_1", "coi_2", "coi_3"],
            "text": (
                "Adjudicated CZone channel / circuit inventory (human-readable "
                "shadow of switching config). OPT/CUS channels are not proof "
                "of fitted equipment. Revision Ind C supersedes older DC "
                "folios where they conflict on circuit naming / COI assignment."
            ),
            "channel_entries": extract.get("channel_entries") or [],
            "document_citation_fields": extract.get("document") or {},
            "supersedes_where_conflicting": [
                {
                    "target_class": "schematic",
                    "note": (
                        "05/05/2026 Ind C postdates 2023-era DC folios — prefer "
                        "this map for circuit naming / COI channel assignment"
                    ),
                }
            ],
        }
    )
    eq["vessel_facts"] = facts
    eq_path.write_text(
        json.dumps(eq, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    # Expected roles/sections for three COIs
    exp_path = OUTREMER / "expected.json"
    exp = json.loads(exp_path.read_text(encoding="utf-8"))
    roles = exp.get("roles") or {}
    sections = exp.get("sections") or {}
    if "coi" in roles:
        del roles["coi"]
    if "coi" in sections:
        del sections["coi"]
    for key in ("coi_1", "coi_2", "coi_3"):
        roles[key] = "BRIDGE"
        sections[key] = {"value": "electrical", "source": "lookup"}
    exp["roles"] = roles
    exp["sections"] = sections
    exp_path.write_text(
        json.dumps(exp, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print("promoted", dest)
    print("equipment COI instances + vessel_facts updated")
    print("expected roles:", [k for k in roles if k.startswith("coi")])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
