"""Promote Dessalator Duo Navigator scratch extract into Outremer vessel fixtures.

Source: "Start-Up Guide Dessalator(R) Duo 60 & Duo 100 Navigator Automatic"
(operators start-up guide, EN v4.9 06/24, 9 pp; manual_work ffe1b474-...).

Live Stage 1 extraction captured the operator actions (start / stop / restart /
flush / rinse) and the optional Mini Remote Control, but omitted two facts that
the start-up guide documents explicitly:

  1. The primary on-device NAVIGATOR control panel (voltage switch 12/24V or
     230V/120V + OFF, and the motorized pressure-regulator knob). This is the
     always-present operator control; without it the graph would model the
     watermaker as operable only via the optional Mini Remote Control.
  2. The supply caveat: running on 12/24V DC for more than 5 minutes requires
     the boat engine, a shore-power charger, or a generator.

Both are added here as a narrow, source-grounded §1.D adjudication (Playbook 1;
PRINCIPLES §2/§8). The raw scratch extraction is left pristine as the honest
record of the model output.

Usage (from backend/):
  python scripts/promote_dessalator_duo.py
"""

from __future__ import annotations

import json
import shutil
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from interaction_profile_validate import validate_interaction_profile

SCRATCH = ROOT / "fixtures" / "pipeline" / "scratch"
OUTREMER = ROOT / "fixtures" / "pipeline" / "outremer"
POST = ROOT / "fixtures" / "pipeline" / "outremer_post_batch_b"
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "dessalator_duo"

DEVICE_KEY = "dessalator_duo"
STEM = "dessalator_duo"

EQUIPMENT_ID = "6f36568d-3093-4f2c-b1f6-001840ee26d8"
MANUAL_WORK_ID = "ffe1b474-3015-46e5-8a22-0f3f00b40a9e"

FIXTURE_AUTH = (
    "Fixture-Auth: chat Dessalator Duo Stage 1 extract — live extraction "
    "promoted; on-device NAVIGATOR panel + DC>5min supply caveat added as "
    "source-grounded §1.D adjudication (extraction omissions)"
)

_ONDEVICE_PANEL = {
    "surface": "physical_controls",
    "location_class": "on_device",
    "optional_accessory": False,
    "label_verbatim": "NAVIGATOR control panel (voltage switch 12/24V or 230V/120V, OFF; motorized pressure-regulator knob)",
    "path": "control_surfaces[1]",
}

_ONDEVICE_PANEL_EVIDENCE = {
    "supports_field": "control_surfaces[1]",
    "manual_section": "First start-up of the watermaker / Starting the watermaker",
    "note": "adjudicated: primary on-device control panel omitted by extraction",
}

_DC_SUPPLY_REQ = {
    "description_verbatim": (
        "When using the system in 12 or 24V for more than 5 minutes, it is "
        "mandatory to turn on either the boat engine, or the battery charger "
        "through the shore power supply, or a generator"
    ),
    "source": "adjudicated_extraction_omission",
}

_DC_SUPPLY_EVIDENCE = {
    "supports_field": "supply_requirements[0]",
    "manual_section": "Procedure for commissioning the Dessalator / Mandatory steps",
    "note": "adjudicated: mandatory powered source when running on DC",
}


def _prepare(raw: dict) -> dict:
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"

    device = dict(profile.get("device") or {})
    device["manufacturer"] = "Dessalator"
    device["model"] = "Duo AC & DC Navigator"
    device.setdefault("category_freeform", "watermaker")
    profile["device"] = device

    # §1.D adjudication 1: primary on-device NAVIGATOR control panel.
    surfaces = list(profile.get("control_surfaces") or [])
    has_ondevice_panel = any(
        isinstance(s, dict)
        and s.get("location_class") == "on_device"
        and not s.get("optional_accessory")
        for s in surfaces
    )
    if not has_ondevice_panel:
        panel = dict(_ONDEVICE_PANEL)
        panel["path"] = f"control_surfaces[{len(surfaces)}]"
        surfaces.append(panel)
        profile["control_surfaces"] = surfaces

    # §1.D adjudication 2: mandatory DC (>5 min) power-source caveat.
    supplies = list(profile.get("supply_requirements") or [])
    if not any(
        isinstance(s, dict)
        and "5 minutes" in str(s.get("description_verbatim") or "")
        for s in supplies
    ):
        supplies.insert(0, dict(_DC_SUPPLY_REQ))
        profile["supply_requirements"] = supplies

    # Evidence for both adjudicated facts (point at the surface we appended).
    evidence = list(profile.get("evidence") or [])
    panel_idx = next(
        (
            i
            for i, s in enumerate(profile["control_surfaces"])
            if isinstance(s, dict)
            and s.get("location_class") == "on_device"
            and not s.get("optional_accessory")
        ),
        None,
    )
    if panel_idx is not None:
        ev = dict(_ONDEVICE_PANEL_EVIDENCE)
        ev["supports_field"] = f"control_surfaces[{panel_idx}]"
        evidence.append(ev)
    evidence.append(dict(_DC_SUPPLY_EVIDENCE))
    profile["evidence"] = evidence

    # Operators start-up guide: commissioning + operation genres.
    profile["genres"] = ["commissioning", "operation"]
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile)

    # Record the adjudication as an audit flag alongside the auto-repair flag.
    flags = list(profile.get("validation_flags") or [])
    flags.append(
        {
            "flag": "extraction_omission_adjudicated",
            "severity": "info",
            "detail": (
                "Added on-device NAVIGATOR control panel + DC>5min supply "
                "caveat from the start-up guide (grounded; see evidence). "
                + FIXTURE_AUTH
            ),
        }
    )
    profile["validation_flags"] = flags
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"

    if profile.get("needs_rextraction"):
        blocking = [
            f
            for f in (profile.get("validation_flags") or [])
            if f.get("severity") == "blocking"
        ]
        if blocking:
            raise SystemExit(
                f"refuse promote — needs_rextraction; blocking={blocking}"
            )
        profile.pop("needs_rextraction", None)
    return profile


def _archive(profile: dict) -> None:
    LAST_GREEN.mkdir(parents=True, exist_ok=True)
    (LAST_GREEN / "profile.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    meta = {
        "device_key": DEVICE_KEY,
        "equipment_id": EQUIPMENT_ID,
        "manual_work_id": MANUAL_WORK_ID,
        "manual": (
            "Start-Up Guide Dessalator(R) Duo 60 & Duo 100 Navigator Automatic "
            "(operators, EN v4.9 06/24, 9 pp)"
        ),
        "fixture_auth": FIXTURE_AUTH,
        "review": {
            "status": "reviewed_and_approved",
            "verdict": "pass",
            "reviewed_by": "owner/human (chat)",
            "date": "2026-07-21",
        },
    }
    (LAST_GREEN / "ARCHIVE_META.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    for name, dest_name in (
        (f"{STEM}_input.json", "extraction_input.json"),
        (f"{STEM}_citations.json", "citations.json"),
        (f"{STEM}_procedures.json", "procedures.json"),
    ):
        src = SCRATCH / name
        if src.is_file():
            shutil.copy2(src, LAST_GREEN / dest_name)
    groups = SCRATCH / f"{STEM}_groups"
    if groups.is_dir():
        dest_g = LAST_GREEN / "groups"
        if dest_g.exists():
            shutil.rmtree(dest_g)
        shutil.copytree(groups, dest_g)


def main() -> None:
    raw = json.loads((SCRATCH / f"{STEM}.json").read_text(encoding="utf-8"))
    profile = _prepare(raw)

    for vessel_dir in (OUTREMER, POST):
        path = vessel_dir / "profiles.json"
        if not path.is_file():
            continue
        profiles = json.loads(path.read_text(encoding="utf-8"))
        profiles[DEVICE_KEY] = deepcopy(profile)
        path.write_text(
            json.dumps(profiles, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print("promoted", DEVICE_KEY, "->", path)

    for exp_path in (OUTREMER / "expected.json", POST / "expected.json"):
        if not exp_path.is_file():
            continue
        exp = json.loads(exp_path.read_text(encoding="utf-8"))
        notes = dict(exp.get("notes") or {})
        notes["dessalator_duo"] = (
            "live Stage 1 extraction promoted (" + FIXTURE_AUTH + "); "
            "operators start-up guide; standalone ISLAND in water section; "
            "on-device NAVIGATOR panel + optional Mini Remote Control; "
            "supersedes the earlier inventory-add stub; "
            "reviewed & approved 2026-07-21 (owner/human)"
        )
        exp["notes"] = notes
        exp_path.write_text(
            json.dumps(exp, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print("annotated expected ->", exp_path)

    _archive(profile)
    print("archived", LAST_GREEN)
    print(
        "surfaces",
        len(profile.get("control_surfaces") or []),
        "actions",
        len(profile.get("operator_actions") or []),
        "supply_requirements",
        len(profile.get("supply_requirements") or []),
        "genres",
        profile.get("genres"),
        "flags",
        [f.get("flag") for f in (profile.get("validation_flags") or [])],
    )


if __name__ == "__main__":
    main()
