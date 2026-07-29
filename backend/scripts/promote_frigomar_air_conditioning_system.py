"""Promote Frigomar Air Conditioning System scratch extract into Outremer fixtures.

Source: "Instruction Manual" — Self-contained unit INVERTER BLDC
(SCU07VFD–SCU16VFD), EN Rev. 20190118, 32 pp; manual_work 08e30678-...;
file hash 1e9ca775641747af… matches local Downloads PDF.

Live Stage 1 extraction was clean (0 validation flags, 0 material instability,
needs_rextraction false). Human review (chat 2026-07-28) approved §1.D
adjudications D1–D4 (Playbook 1; PRINCIPLES §2/§8). Raw scratch is left
pristine as the honest model record.

  1. ``safety_role.is_protective_device`` was true from §5.1.4 circuit-breaker
     evidence — that breaker is not the AC itself. Set false; keep
     ``has_emergency_procedure`` true (alarm restart).

  2. Duplicate control surfaces (touchscreen + physical_controls) for the same
     wall-mounted touch panel. Collapse to one ``remote_panel_accessory`` with
     ``location_class=remote_wired`` (dedicated HVAC wall panel — not a vessel
     command-station ``touchscreen``, which would spuriously classify as HUB
     via shared NMEA2000 with CZone).

  3. Genres were auto-``operation`` only; manual is install (§5) + operate (§6)
     → ``["installation","operation"]``.

  4. Extraction omitted seawater-pump-only mode (§6.2.1: hold mode 10 s while
     OFF). Add as source-grounded operator action.

Vessel inventory: Supernova ``vessel_equipment`` 6d36a369… (saloon_living_area /
saloon_general, team_verified) — mirrored into fixture plant places.

Usage (from backend/):
  python scripts/promote_frigomar_air_conditioning_system.py
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
LAST_GREEN = (
    ROOT / "fixtures" / "pipeline" / "last_green" / "frigomar_air_conditioning_system"
)

DEVICE_KEY = "frigomar_air_conditioning_system"
STEM = "frigomar_air_conditioning_system"

EQUIPMENT_ID = "d3f0228f-5c1d-48a1-acdc-dbba6afbd3ee"
MANUAL_WORK_ID = "08e30678-2e08-472e-ad52-7fa9c60f9db4"
VESSEL_EQUIPMENT_ID = "6d36a369-ad9e-461d-91f3-7d19a2ecb549"

# Speaks NMEA2000 → shares hub network with CZone Touch 7 → ENDPOINT (not ISLAND).
EXPECTED_ROLE = "ENDPOINT"
EXPECTED_SECTION = "ac"

FIXTURE_AUTH = (
    "Fixture-Auth: chat Frigomar Air Conditioning System Stage 1 extract — "
    "live extraction promoted; D1–D4 adjudicated (protective_device false, "
    "single wall remote_panel_accessory, genres install+operation, "
    "seawater-pump-only mode action); Supernova vessel_equipment saloon "
    "team_verified"
)

_TOUCH_SURFACE = {
    "surface": "remote_panel_accessory",
    "location_class": "remote_wired",
    "optional_accessory": False,
    "label_verbatim": "wall-mounted touch-screen display",
    "path": "control_surfaces[0]",
}

_PUMP_ACTION = {
    "action": (
        "activate seawater pump only by holding mode button 10s while unit OFF"
    ),
    "audience": "operator",
    "context": "situational",
    "occasion": "to run the seawater pump without cooling/heating",
    "source": "adjudicated_extraction_omission",
}

_PUMP_EVIDENCE = {
    "supports_field": (
        "operator_actions[action=\"activate seawater pump only by holding "
        "mode button 10s while unit OFF\"]"
    ),
    "manual_section": "6.2.1  MODE:",
    "note": (
        "adjudicated: mode held 10s while OFF runs seawater pump only "
        "(icon yellow)"
    ),
}

_SURFACE_EVIDENCE = {
    "supports_field": "control_surfaces[0]",
    "manual_section": "6.0 WALL-MOUNTED TOUCH-SCREEN DISPLAY",
    "note": (
        "adjudicated: single wall-mounted touch-screen as "
        "remote_panel_accessory (remote wired); dropped duplicate "
        "physical_controls; not vessel command-station touchscreen"
    ),
}

_EQUIPMENT_ROW = {
    "device_key": DEVICE_KEY,
    "catalog_key": DEVICE_KEY,
    "manufacturer": "Frigomar",
    "model": "Air Conditioning System",
    "description": (
        "Frigomar self-contained BLDC variable-speed air conditioning "
        "(SCU07VFD–SCU16VFD) with wall-mounted touch-screen"
    ),
    "system_category": "hvac",
    "quantity": 1,
    "instance_handling": "interchangeable",
    "provenance": (
        "DB registry equipment d3f0228f + Supernova vessel_equipment "
        "6d36a369 team_verified (saloon); Instruction Manual Rev. 20190118 "
        "(manual_work 08e30678) Stage 1 extracted; " + FIXTURE_AUTH
    ),
    "places": [
        {
            "zone": "saloon_living_area",
            "sub_zone": "saloon_general",
            "hull_side": None,
            "detail": None,
            "location_label": "Saloon / Living Area – Saloon General",
            "provenance": (
                f"Supernova vessel_equipment {VESSEL_EQUIPMENT_ID[:8]} "
                "team_verified"
            ),
        }
    ],
}


def _load_excerpts() -> list[str]:
    path = SCRATCH / f"{STEM}_input.json"
    if not path.is_file():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    texts: list[str] = []
    for ex in payload.get("excerpts") or []:
        if isinstance(ex, dict):
            text = str(ex.get("text") or ex.get("excerpt") or "").strip()
            if text:
                texts.append(text)
        elif isinstance(ex, str) and ex.strip():
            texts.append(ex.strip())
    return texts


def _prepare(raw: dict, *, excerpts: list[str] | None = None) -> dict:
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"

    device = dict(profile.get("device") or {})
    device["manufacturer"] = "Frigomar"
    device["model"] = "Air Conditioning System"
    device.setdefault("category_freeform", "Air Conditioning System")
    profile["device"] = device

    # §1.D D1: AC is not a protective device (breaker evidence was mis-attributed).
    safety = dict(profile.get("safety_role") or {})
    safety["is_protective_device"] = False
    safety.setdefault("has_manual_override", False)
    safety["has_emergency_procedure"] = True
    profile["safety_role"] = safety

    evidence = [
        ev
        for ev in (profile.get("evidence") or [])
        if isinstance(ev, dict)
        and str(ev.get("supports_field") or "")
        != "safety_role.is_protective_device"
    ]

    # §1.D D2: one wall touchscreen (remote wired).
    profile["control_surfaces"] = [dict(_TOUCH_SURFACE)]
    evidence = [
        ev
        for ev in evidence
        if not str(ev.get("supports_field") or "").startswith("control_surfaces[")
    ]
    evidence.append(dict(_SURFACE_EVIDENCE))

    # §1.D D4: seawater-pump-only mode.
    actions = list(profile.get("operator_actions") or [])
    has_pump = any(
        isinstance(a, dict)
        and "seawater pump" in str(a.get("action") or "").lower()
        for a in actions
    )
    if not has_pump:
        actions.append(dict(_PUMP_ACTION))
        profile["operator_actions"] = actions
        evidence.append(dict(_PUMP_EVIDENCE))
    profile["evidence"] = evidence

    # §1.D D3: install + operate genres.
    profile["genres"] = ["installation", "operation"]
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile, excerpts=excerpts or [])

    flags = list(profile.get("validation_flags") or [])
    flags.append(
        {
            "flag": "extraction_omission_adjudicated",
            "severity": "info",
            "detail": (
                "D1 protective_device=false; D2 single wall "
                "remote_panel_accessory (not command-station touchscreen); "
                "D3 genres install+operation; D4 seawater-pump-only mode "
                "action. " + FIXTURE_AUTH
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

    blocking = [
        f
        for f in (profile.get("validation_flags") or [])
        if f.get("severity") == "blocking"
    ]
    if blocking:
        raise SystemExit(f"refuse promote — unresolved blocking flags={blocking}")
    return profile


def _ensure_equipment(eq_path: Path) -> None:
    doc = json.loads(eq_path.read_text(encoding="utf-8"))
    equipment = list(doc.get("equipment") or [])
    replaced = False
    for i, row in enumerate(equipment):
        if isinstance(row, dict) and row.get("device_key") == DEVICE_KEY:
            equipment[i] = deepcopy(_EQUIPMENT_ROW)
            replaced = True
            break
    if not replaced:
        equipment.append(deepcopy(_EQUIPMENT_ROW))
    doc["equipment"] = equipment

    auth = str(doc.get("fixture_auth") or "")
    if "Frigomar Air Conditioning System" not in auth:
        doc["fixture_auth"] = (auth + "; " if auth else "") + FIXTURE_AUTH

    notes = str(doc.get("notes") or "")
    if "Frigomar" not in notes:
        doc["notes"] = (
            notes
            + " Frigomar self-contained AC in saloon (fixture plant); "
            "CZone Climate supported_hvac gate still unknown."
        ).strip()

    eq_path.write_text(
        json.dumps(doc, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print("equipment row ->", eq_path)


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
        "vessel_equipment_id": VESSEL_EQUIPMENT_ID,
        "manual": (
            "Instruction Manual — Self-contained unit INVERTER BLDC "
            "(SCU07VFD–SCU16VFD), Rev. 20190118, 32pp EN"
        ),
        "fixture_auth": FIXTURE_AUTH,
        "review": {
            "status": "reviewed_and_approved",
            "verdict": "pass",
            "reviewed_by": "owner/human (chat)",
            "date": "2026-07-28",
            "adjudications": [
                "D1 is_protective_device=false",
                "D2 single wall remote_panel_accessory (not vessel HUB touchscreen)",
                "D3 genres installation+operation",
                "D4 seawater-pump-only mode action",
                "D5 Supernova vessel_equipment wired (saloon)",
            ],
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
    profile = _prepare(raw, excerpts=_load_excerpts())

    for vessel_dir in (OUTREMER, POST):
        eq_path = vessel_dir / "equipment.json"
        if eq_path.is_file():
            _ensure_equipment(eq_path)

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
        roles = dict(exp.get("roles") or {})
        roles[DEVICE_KEY] = EXPECTED_ROLE
        exp["roles"] = roles
        sections = dict(exp.get("sections") or {})
        sections[DEVICE_KEY] = {"value": EXPECTED_SECTION, "source": "lookup"}
        exp["sections"] = sections
        notes = dict(exp.get("notes") or {})
        notes[DEVICE_KEY] = (
            "live Stage 1 extraction promoted (" + FIXTURE_AUTH + "); "
            "operators Instruction Manual Rev. 20190118; standalone "
            + EXPECTED_ROLE
            + " in "
            + EXPECTED_SECTION
            + " section; wall touch-screen; Modbus/NMEA2000 controllable; "
            "reviewed & approved 2026-07-28 (owner/human)"
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
        "safety",
        profile.get("safety_role"),
        "genres",
        profile.get("genres"),
        "needs_rextraction",
        profile.get("needs_rextraction"),
        "flags",
        [f.get("flag") for f in (profile.get("validation_flags") or [])],
    )


if __name__ == "__main__":
    main()
