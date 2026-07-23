"""Promote Sea.AI Watchkeeper scratch extract into Outremer vessel fixtures.

Source: "User Guide Watchkeeper Series" (Doc SEAAI-442870296-11, Revision
26 November 2025, 18 pp; filename Watchkeeper Series_1.2; manual_work
14570452-...; equipment 3b14f3a7-...). Combined installation + operation +
maintenance / troubleshooting user guide for the SEA.AI Watchkeeper AI camera
object-detection system.

Live Stage 1 extraction (2026-07-23) was strong: heading coverage 0.9, 0
unaccounted procedures, needs_rextraction false, no blocking flags. Narrow
§1.D adjudications (Playbook 1; PRINCIPLES §2/§8); raw scratch left pristine.

  1. Genre: extraction declared only ``operation`` though the TOC includes
     Installation (ch. 3), Operating Instructions (ch. 4), Update (ch. 5),
     Alarms (ch. 6), and Maintenance and Troubleshooting (ch. 7)
     → genres = installation / operation / maintenance.

  2. Commissioning-only action: ``select and configure the NMEA Gateway model``
     is Setup-tab commissioning, not guest day-to-day → dropped as
     installer/reference-only.

  3. Duplicate remote-access action: keep the longer ``enable or disable
     temporary remote access to service team``; drop the shorter duplicate.

Usage (from backend/):
  python scripts/promote_sea_ai_watchkeeper.py
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
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "sea_ai_watchkeeper"

DEVICE_KEY = "sea_ai_watchkeeper"
STEM = "sea_ai_watchkeeper"

EQUIPMENT_ID = "3b14f3a7-c348-461f-b3c7-6f02955b4419"
MANUAL_WORK_ID = "14570452-6ad1-4d48-8c02-f688a7d81cd7"

FIXTURE_AUTH = (
    "Fixture-Auth: chat Sea.AI Watchkeeper Stage 1 extract — live extraction "
    "promoted; genres normalized to install/operate/maintain, NMEA Gateway "
    "commissioning action + duplicate remote-access action dropped as "
    "source-grounded §1.D adjudication"
)

_DROP_ACTIONS = frozenset(
    {
        "select and configure the nmea gateway model",
        "enable or disable temporary remote access",
    }
)


def _prepare(raw: dict) -> dict:
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"

    device = dict(profile.get("device") or {})
    device["manufacturer"] = "Sea.AI"
    device["model"] = "Watchkeeper"
    device["category_freeform"] = "AI camera object detection system"
    profile["device"] = device

    # §1.D: drop commissioning + duplicate remote-access actions.
    kept: list[dict] = []
    dropped: list[str] = []
    for act in profile.get("operator_actions") or []:
        if not isinstance(act, dict):
            continue
        key = str(act.get("action") or "").strip().lower()
        if key in _DROP_ACTIONS:
            dropped.append(key)
            continue
        kept.append(act)
    profile["operator_actions"] = kept

    profile["genres"] = ["installation", "operation", "maintenance"]
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile)

    flags = list(profile.get("validation_flags") or [])
    flags.append(
        {
            "flag": "extraction_adjudicated",
            "severity": "info",
            "detail": (
                "Normalized genres to installation/operation/maintenance; "
                f"dropped actions {dropped}. " + FIXTURE_AUTH
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
            "User Guide Watchkeeper Series (Doc SEAAI-442870296-11, "
            "Revision 26 November 2025, 18 pp; file Watchkeeper Series_1.2)"
        ),
        "fixture_auth": FIXTURE_AUTH,
        "review": {
            "status": "pending_human_review",
            "verdict": None,
            "reviewed_by": None,
            "date": None,
            "note": (
                "Awaiting human review. Navigation & Helm Stage 4 is frozen "
                "(v4.37); Watchkeeper is inventory + graph only until a "
                "superseding tip re-composes Nav."
            ),
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
        roles = dict(exp.get("roles") or {})
        roles[DEVICE_KEY] = "ISLAND"
        exp["roles"] = roles
        sections = dict(exp.get("sections") or {})
        sections[DEVICE_KEY] = {"value": "nav", "source": "lookup"}
        exp["sections"] = sections
        notes = dict(exp.get("notes") or {})
        notes[DEVICE_KEY] = (
            "live Stage 1 extraction promoted (" + FIXTURE_AUTH + "); "
            "User Guide Watchkeeper Series (combined install/operate/maintain); "
            "standalone ISLAND in nav section; on-device User Interface; "
            "threat-level alarms (Object/Warning/Danger); "
            "Nav Stage 4 frozen — inventory/graph only until Nav re-compose; "
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
        "alarms",
        len(profile.get("alarm_severity") or []),
        "flags",
        [f.get("flag") for f in (profile.get("validation_flags") or [])],
    )


if __name__ == "__main__":
    main()
