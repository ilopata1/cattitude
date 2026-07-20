"""Promote CZone COI scratch extract into Outremer vessel fixtures.

Cleans schema blockers from Stage 1 (unknown network fields, bad evidence
heading). Drops diagram-inferred MasterBus↔CZone bridge on the COI itself —
vessel inventory already has ``masterbus_bridge_interface`` as a separate
module; the extract notes that SKU may not be the COI.

Usage (from backend/):
  python scripts/promote_czone_coi.py
"""

from __future__ import annotations

import json
import shutil
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from interaction_profile_genre import annotate_profile_genres
from interaction_profile_validate import validate_interaction_profile

SCRATCH = ROOT / "fixtures" / "pipeline" / "scratch"
OUTREMER = ROOT / "fixtures" / "pipeline" / "outremer"
POST = ROOT / "fixtures" / "pipeline" / "outremer_post_batch_b"
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "czone_coi"

DEVICE_KEY = "coi"


def _clean_networks(profile: dict) -> None:
    nets = dict(profile.get("networks") or {})
    speaks_out = []
    for row in nets.get("speaks") or []:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name_verbatim") or "").strip()
        # Drop MasterBus speak derived from separate-bridge diagram.
        if name.lower() == "masterbus":
            continue
        speaks_out.append(
            {
                "name_verbatim": name,
                "physical_or_wireless": str(
                    row.get("physical_or_wireless") or "wired"
                ).strip()
                or "wired",
            }
        )
    # Prefer keeping CZone + NMEA 2000 when present.
    nets["speaks"] = speaks_out
    # Do not attribute MasterBus↔CZone bridge to the COI device.
    nets["bridges"] = []
    profile["networks"] = nets


def _clean_evidence(profile: dict) -> None:
    cleaned = []
    for row in profile.get("evidence") or []:
        if not isinstance(row, dict):
            continue
        section = str(row.get("manual_section") or "").strip()
        # Drop letter-fragment / blank-line "headings".
        if section.startswith("1 ") and "_" in section:
            row = dict(row)
            row["manual_section"] = "Alarm / fault codes"
        # Shorten running footer citations to a stable heading token.
        if section.startswith("EN /") or "EN / CZone" in section:
            row = dict(row)
            row["manual_section"] = "COI Combination Output Interface"
        if section.startswith(("11 EN", "15 EN", "17 EN")):
            row = dict(row)
            row["manual_section"] = "COI Combination Output Interface"
        cleaned.append(row)
    profile["evidence"] = cleaned


def _prepare(raw: dict) -> dict:
    profile = deepcopy(raw)
    _clean_networks(profile)
    _clean_evidence(profile)

    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"
    # Manual title: USER'S AND INSTALLATION — commissioning actions present.
    profile["genres"] = ["installation", "commissioning", "operation"]
    device = dict(profile.get("device") or {})
    device["manufacturer"] = "CZone / Mastervolt"
    device["model"] = "Combination Output Interface (COI)"
    device.setdefault("category_freeform", "Combination Output Interface")
    profile["device"] = device
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile)
    profile = annotate_profile_genres(profile)
    profile["genres"] = ["installation", "commissioning", "operation"]
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"

    # One more clean pass if validate reintroduced derived fields.
    _clean_networks(profile)
    profile = validate_interaction_profile(profile)
    profile.pop("needs_rextraction", None)

    # Soft-only flags may remain; blocking must be clear for promote.
    blocking = [
        f
        for f in (profile.get("validation_flags") or [])
        if str(f.get("severity") or "") == "blocking"
    ]
    if blocking or profile.get("needs_rextraction"):
        raise SystemExit(
            "refuse promote — blocking flags remain: "
            + json.dumps(blocking, indent=2)
        )
    return profile


def _archive(profile: dict) -> None:
    LAST_GREEN.mkdir(parents=True, exist_ok=True)
    (LAST_GREEN / "profile.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    mapping = {
        "czone_coi_input.json": "extraction_input.json",
        "czone_coi.citations.json": "citations.json",
        "czone_coi_procedures.json": "procedures.json",
    }
    for src_name, dest_name in mapping.items():
        src = SCRATCH / src_name
        if src.is_file():
            shutil.copy2(src, LAST_GREEN / dest_name)
    groups = SCRATCH / "czone_coi_groups"
    if groups.is_dir():
        dest = LAST_GREEN / "groups"
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(groups, dest)
    meta = {
        "device_key": DEVICE_KEY,
        "equipment_id": "cdc103af-99ca-41de-82e4-3f4a663752f0",
        "manual_work_id": "163f4819-52f8-4aeb-b678-88f4c889d181",
        "manual": "CZone COI Combination Output Interface USER'S AND INSTALLATION MANUAL V1.2",
        "fixture_auth": (
            "Fixture-Auth: chat COI Stage 1 promote — replace stub; drop "
            "diagram-inferred MasterBus bridge (separate inventory module)"
        ),
    }
    (LAST_GREEN / "ARCHIVE_META.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8"
    )


def main() -> int:
    raw_path = SCRATCH / "czone_coi.json"
    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    profile = _prepare(raw)
    raw_path.write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    for vessel_dir in (OUTREMER, POST):
        path = vessel_dir / "profiles.json"
        if not path.is_file():
            continue
        profiles = json.loads(path.read_text(encoding="utf-8"))
        old = profiles.get(DEVICE_KEY) or {}
        profiles[DEVICE_KEY] = deepcopy(profile)
        path.write_text(
            json.dumps(profiles, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(
            "promoted coi ->",
            path,
            "| stub_actions=",
            len((old.get("operator_actions") or [])),
            "->",
            len(profile.get("operator_actions") or []),
        )

    # Keep equipment manufacturer/model aligned with registry extract.
    for vessel_dir in (OUTREMER, POST):
        eq_path = vessel_dir / "equipment.json"
        if not eq_path.is_file():
            continue
        doc = json.loads(eq_path.read_text(encoding="utf-8"))
        changed = False
        for row in doc.get("equipment") or []:
            if row.get("device_key") != DEVICE_KEY:
                continue
            if row.get("manufacturer") != "CZone / Mastervolt":
                row["manufacturer"] = "CZone / Mastervolt"
                changed = True
            if row.get("model") != "Combination Output Interface (COI)":
                row["model"] = "Combination Output Interface (COI)"
                changed = True
            if not str(row.get("description") or "").strip():
                row["description"] = "CZone Combination Output Interface"
                changed = True
        if changed:
            eq_path.write_text(
                json.dumps(doc, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            print("aligned equipment row ->", eq_path)

    _archive(profile)
    print("archived", LAST_GREEN)
    print("genres", profile.get("genres"))
    print(
        "speaks",
        [s.get("name_verbatim") for s in (profile.get("networks") or {}).get("speaks") or []],
    )
    print("bridges", (profile.get("networks") or {}).get("bridges"))
    print(
        "flags",
        [
            (f.get("severity"), f.get("flag"))
            for f in (profile.get("validation_flags") or [])
        ],
    )
    print("actions", len(profile.get("operator_actions") or []))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
