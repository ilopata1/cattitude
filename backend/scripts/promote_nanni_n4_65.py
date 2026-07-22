"""Promote Nanni N4.65 scratch extract into Outremer vessel fixtures.

Source: "NANNI MARINE ENGINE USER MANUAL DGBXXT09007C"
(operators, DGBXXT09007C-N4.65-80.pdf; manual_work 9e95df10-...).

Live Stage 1 extraction captured start/stop and maintenance/emergency actions
but left ``control_surfaces`` empty after the validator dropped a MasterView
few-shot leak. The operators manual documents the Nanni instrument panel
(dashboard / main panel with key or ON/STOP + Start) as the operator control
surface (S05 Instruments; S07 Start & Running). That surface is added here as
a narrow, source-grounded §1.D adjudication (Playbook 1; PRINCIPLES §2/§8).
The raw scratch extraction is left pristine as the honest record of the model
output.

Usage (from backend/):
  python scripts/promote_nanni_n4_65.py
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
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "nanni_n4_65"

DEVICE_KEY = "nanni_n4_65"
STEM = "nanni_n4_65"

EQUIPMENT_ID = "f7cb721c-a607-45a3-a0e6-c0a01ccf1da4"
MANUAL_WORK_ID = "9e95df10-7eec-4b4f-a49c-f3a734d037fb"

FIXTURE_AUTH = (
    "Fixture-Auth: chat Nanni N4.65 Stage 1 extract — live extraction "
    "promoted; Nanni instrument panel (main panel key/ON-STOP + Start) added "
    "as source-grounded §1.D adjudication (extraction omission after "
    "MasterView few-shot drop)"
)

_INSTRUMENT_PANEL = {
    "surface": "physical_controls",
    "location_class": "remote_wired",
    "optional_accessory": False,
    "label_verbatim": (
        "Nanni instrument panel (key or ON/STOP starter switch; Start button; "
        "warning lamps)"
    ),
    "path": "control_surfaces[0]",
}

_INSTRUMENT_PANEL_EVIDENCE = {
    "supports_field": "control_surfaces[0]",
    "manual_section": "S05 INSTRUMENTS / S07 START & RUNNING",
    "note": "adjudicated: primary helm instrument panel omitted by extraction",
}


def _prepare(raw: dict) -> dict:
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"

    device = dict(profile.get("device") or {})
    device["manufacturer"] = "Nanni"
    device["model"] = "N4.65"
    device.setdefault("category_freeform", "marine engine")
    profile["device"] = device

    # §1.D adjudication: Nanni instrument panel (always present for operation).
    surfaces = list(profile.get("control_surfaces") or [])
    has_panel = any(
        isinstance(s, dict)
        and "instrument panel" in str(s.get("label_verbatim") or "").lower()
        for s in surfaces
    )
    if not has_panel:
        panel = dict(_INSTRUMENT_PANEL)
        panel["path"] = f"control_surfaces[{len(surfaces)}]"
        surfaces.append(panel)
        profile["control_surfaces"] = surfaces

    evidence = list(profile.get("evidence") or [])
    panel_idx = next(
        (
            i
            for i, s in enumerate(profile["control_surfaces"])
            if isinstance(s, dict)
            and "instrument panel" in str(s.get("label_verbatim") or "").lower()
        ),
        None,
    )
    if panel_idx is not None:
        ev = dict(_INSTRUMENT_PANEL_EVIDENCE)
        ev["supports_field"] = f"control_surfaces[{panel_idx}]"
        evidence.append(ev)
    profile["evidence"] = evidence

    # Combined operators manual: install / operate / maintain chapters.
    profile["genres"] = ["installation", "operation", "maintenance"]
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile)

    flags = list(profile.get("validation_flags") or [])
    flags.append(
        {
            "flag": "extraction_omission_adjudicated",
            "severity": "info",
            "detail": (
                "Added Nanni instrument panel from S05/S07 (grounded; see "
                "evidence). " + FIXTURE_AUTH
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
            "NANNI MARINE ENGINE USER MANUAL DGBXXT09007C "
            "(operators, DGBXXT09007C-N4.65-80.pdf)"
        ),
        "fixture_auth": FIXTURE_AUTH,
        "review": {
            "status": "pending_human_review",
            "verdict": None,
            "reviewed_by": None,
            "date": None,
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
        notes[DEVICE_KEY] = (
            "live Stage 1 extraction promoted (" + FIXTURE_AUTH + "); "
            "operators manual DGBXXT09007C; standalone ISLAND in engines "
            "section; Nanni instrument panel (key/ON-STOP + Start); "
            "pending human review"
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
        "genres",
        profile.get("genres"),
        "flags",
        [f.get("flag") for f in (profile.get("validation_flags") or [])],
    )


if __name__ == "__main__":
    main()
