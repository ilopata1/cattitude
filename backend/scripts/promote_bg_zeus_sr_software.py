"""Promote B&G Zeus SR Software as a shared UI platform (CZone-style).

Wires:
  - ``bg_zeus_sr_software`` platform profile from QSG extract
  - vessel equipment row ``entity_kind: platform``
  - ``bg_zeus_sr.runs_platform`` → ``bg_zeus_sr_software``

Usage (from backend/):
  python scripts/promote_bg_zeus_sr_software.py
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
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "bg_zeus_sr_software"

PLATFORM_KEY = "bg_zeus_sr_software"
HUB_KEY = "bg_zeus_sr"
STEM = "bg_zeus_sr_software"

RUNS_PLATFORM_EDGE = {
    "platform_key": PLATFORM_KEY,
    "host_kind": "display",
    "optional": False,
    "note": "Zeus SR MFDs run shared Zeus SR Software UI (QSG / system software)",
}

EQUIPMENT_ROW = {
    "device_key": PLATFORM_KEY,
    "catalog_key": PLATFORM_KEY,
    "manufacturer": "B&G",
    "model": "Zeus SR Software",
    "description": "B&G Zeus SR shared MFD software platform (v2.5)",
    "system_category": "navigation_electronics",
    "entity_kind": "platform",
    "quantity": 1,
    "instance_handling": "interchangeable",
    "provenance": (
        "admin vessel link Zeus SR Software + Quick Start Guide V2.5 "
        "(988-13244-002); shared UI for Zeus SR displays"
    ),
}


def _prepare(raw: dict) -> dict:
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "platform"
    profile["documented_version"] = "Zeus SR Software v2.5"
    device = dict(profile.get("device") or {})
    device["manufacturer"] = "B&G"
    device["model"] = "Zeus SR Software"
    device.setdefault("category_freeform", "multi-function display software")
    profile["device"] = device
    profile["genres"] = list(
        dict.fromkeys(
            list(profile.get("genres") or []) + ["operation", "commissioning"]
        )
    )
    profile.pop("needs_rextraction", None)
    profile = validate_interaction_profile(profile)
    profile = annotate_profile_genres(profile)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "platform"
    profile["documented_version"] = "Zeus SR Software v2.5"
    if profile.get("needs_rextraction"):
        blocking = [
            f
            for f in (profile.get("validation_flags") or [])
            if isinstance(f, dict) and f.get("severity") == "blocking"
        ]
        if blocking:
            raise SystemExit(
                f"refuse promote — needs_rextraction; flags={profile.get('validation_flags')}"
            )
        profile.pop("needs_rextraction", None)
    return profile


def _ensure_equipment(path: Path) -> None:
    doc = json.loads(path.read_text(encoding="utf-8"))
    equipment = list(doc.get("equipment") or [])
    existing = next(
        (i for i, row in enumerate(equipment) if row.get("device_key") == PLATFORM_KEY),
        None,
    )
    if existing is None:
        # Insert after bg_zeus_sr when present.
        hub_i = next(
            (i for i, row in enumerate(equipment) if row.get("device_key") == HUB_KEY),
            None,
        )
        row = deepcopy(EQUIPMENT_ROW)
        if hub_i is None:
            equipment.append(row)
        else:
            equipment.insert(hub_i + 1, row)
    else:
        equipment[existing] = {**equipment[existing], **deepcopy(EQUIPMENT_ROW)}
    doc["equipment"] = equipment
    notes = str(doc.get("notes") or "")
    marker = "Zeus SR runs_platform bg_zeus_sr_software"
    if marker not in notes:
        doc["notes"] = (
            (notes + " " if notes else "")
            + "Zeus SR runs_platform bg_zeus_sr_software; "
            "platform_version_unconfirmed until settings photo confirms v2.5."
        ).strip()
    auth = str(doc.get("fixture_auth") or "")
    stamp = (
        "Fixture-Auth: chat Zeus SR Software platform — QSG V2.5 as shared UI "
        "platform (CZone-style runs_platform)"
    )
    if stamp not in auth:
        doc["fixture_auth"] = (auth + "; " if auth else "") + stamp
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("equipment platform row ->", path)


def _wire_hub_runs_platform(profiles: dict) -> None:
    hub = dict(profiles.get(HUB_KEY) or {})
    if not hub:
        raise SystemExit(f"missing hub profile {HUB_KEY}")
    edges = [
        dict(e)
        for e in (hub.get("runs_platform") or [])
        if isinstance(e, dict) and str(e.get("platform_key") or "") != PLATFORM_KEY
    ]
    edges.append(deepcopy(RUNS_PLATFORM_EDGE))
    hub["runs_platform"] = edges
    profiles[HUB_KEY] = hub


def _archive(profile: dict) -> None:
    LAST_GREEN.mkdir(parents=True, exist_ok=True)
    (LAST_GREEN / "profile.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    meta = {
        "device_key": PLATFORM_KEY,
        "equipment_id": "48dbc6c2-7267-4c49-8cea-5af1656ac394",
        "manual_work_id": "c552792a-bd10-485f-a1f0-d7820ea7f9cb",
        "manual": "Zeus SR Quick Start Guide V2.5 (988-13244-002, EN, 1 pp)",
        "fixture_auth": (
            "Fixture-Auth: chat Zeus SR Software platform — QSG as shared MFD "
            "platform; hubs run via runs_platform"
        ),
    }
    (LAST_GREEN / "ARCHIVE_META.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    for src_name, dest_name in (
        (f"{STEM}_input.json", "extraction_input.json"),
        (f"{STEM}_citations.json", "citations.json"),
        (f"{STEM}_procedures.json", "procedures.json"),
    ):
        src = SCRATCH / src_name
        if src.is_file():
            shutil.copy2(src, LAST_GREEN / dest_name)
    groups = SCRATCH / f"{STEM}_groups"
    if groups.is_dir():
        dest = LAST_GREEN / "groups"
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(groups, dest)


def main() -> None:
    raw = json.loads((SCRATCH / f"{STEM}.json").read_text(encoding="utf-8"))
    profile = _prepare(raw)
    (SCRATCH / f"{STEM}.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    for vessel_dir in (OUTREMER, POST):
        eq_path = vessel_dir / "equipment.json"
        if eq_path.is_file():
            _ensure_equipment(eq_path)

        path = vessel_dir / "profiles.json"
        if not path.is_file():
            continue
        profiles = json.loads(path.read_text(encoding="utf-8"))
        profiles[PLATFORM_KEY] = deepcopy(profile)
        _wire_hub_runs_platform(profiles)
        path.write_text(
            json.dumps(profiles, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print("promoted platform + hub edge ->", path)

        exp_path = vessel_dir / "expected.json"
        if not exp_path.is_file():
            continue
        exp = json.loads(exp_path.read_text(encoding="utf-8"))
        roles = dict(exp.get("roles") or {})
        roles[PLATFORM_KEY] = "PLATFORM"
        exp["roles"] = roles
        sections = dict(exp.get("sections") or {})
        sections[PLATFORM_KEY] = {"value": "nav", "source": "lookup"}
        exp["sections"] = sections
        required = list(exp.get("required_flags") or [])
        for hub_key in ("bg_zeus_sr_1", "bg_zeus_sr_2", HUB_KEY):
            # Instance keys when quantity expands; catalog key when collapsed.
            if hub_key not in (exp.get("roles") or {}):
                continue
            plat_flag = {
                "flag": "platform_version_unconfirmed",
                "device": hub_key,
                "platform_key": PLATFORM_KEY,
            }
            cfg_flag = {"flag": "config_unsourced", "device": hub_key}
            if not any(
                isinstance(f, dict)
                and f.get("flag") == plat_flag["flag"]
                and f.get("device") == hub_key
                and f.get("platform_key") == PLATFORM_KEY
                for f in required
            ):
                required.append(plat_flag)
            if not any(
                isinstance(f, dict)
                and f.get("flag") == "config_unsourced"
                and f.get("device") == hub_key
                for f in required
            ):
                required.append(cfg_flag)
        exp["required_flags"] = required
        notes = dict(exp.get("notes") or {})
        notes[PLATFORM_KEY] = (
            "live QSG platform (Fixture-Auth: chat Zeus SR Software platform); "
            "Zeus SR hubs runs_platform; thin ops (power/MOB); version "
            "unconfirmed on vessel → platform_version_unconfirmed + "
            "config_unsourced per hub instance"
        )
        exp["notes"] = notes
        exp_path.write_text(
            json.dumps(exp, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print("expected updated ->", exp_path)

    _archive(profile)
    print("archived", LAST_GREEN)


if __name__ == "__main__":
    main()
