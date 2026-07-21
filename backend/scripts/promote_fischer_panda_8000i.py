"""Promote Fischer Panda 8000i scratch extract into Outremer vessel fixtures.

Source: "Manual marine generator Panda 8000i 8 kVA / Panda 10000i PMS 10 kVA"
(operators manual, EN rev R10 29.4.25, 178 pp; manual_work eb6dc5c9-...). This
is a combined installation + operation + maintenance manual that also covers the
sibling Panda 10000i (three-phase / L3 content is out of scope for the 8000i).

Live Stage 1 extraction was stable (0 material instability) but left three
items that need a narrow, source-grounded §1.D adjudication (Playbook 1;
PRINCIPLES §2/§8). The raw scratch extraction is left pristine as the honest
record of the model output.

  1. Blocking `speaks_but_inert`: the generator speaks the (grounded) "Fischer
     Panda standard bus" / "Fischer Panda CAN bus" to its dedicated Panda
     iControl2 panel, but the extraction left every data_role false. The bus
     names are grounded in the corpus (the validator's grounding step kept
     them), so this is a *missed data role*, not an invented bus. The generator
     publishes engine status/telemetry to the iControl2 panel over the standard
     bus -> exposes_data_to_network = true. This is the minimal honest fix.

  2. Genre: the extraction declared only "operation" though the manual is a
     combined install (ch. 8) + operate (ch. 15-17 iControl2) + maintain
     (ch. 10) document -> genres = installation/maintenance/operation.

  3. Installer-only actions: three cable/commissioning steps from the
     installation chapter were labelled audience=operator. They are one-time
     installer actions, not operator content, and are dropped with a recorded
     rationale (installer/reference-only).

Usage (from backend/):
  python scripts/promote_fischer_panda_8000i.py
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
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "fischer_panda_8000i"

DEVICE_KEY = "fischer_panda_8000i"
STEM = "fischer_panda_8000i"

EQUIPMENT_ID = "17c202cc-e006-4cf2-b5d1-47592eadebab"
MANUAL_WORK_ID = "eb6dc5c9-7977-4eee-8b33-0578a70d7086"

EXPECTED_ROLE = "ISLAND"
EXPECTED_SECTION = "batteries"

FIXTURE_AUTH = (
    "Fixture-Auth: chat Fischer Panda 8000i Stage 1 extract — live extraction "
    "promoted; missed data_role (exposes status to iControl2 over grounded "
    "standard bus) set, genres normalized to combined install/operate/maintain, "
    "installer-only cable steps dropped as source-grounded §1.D adjudication"
)

# §1.D: installer-only actions (installation chapter 8), not operator content.
_INSTALLER_ACTIONS = frozenset(
    {
        "connect the generator power out cable",
        "connect the control cable from the generator",
        "check cable laying and electrical connections",
    }
)

_DATA_ROLE_EVIDENCE = {
    "supports_field": "data_roles.exposes_data_to_network",
    "manual_section": "General operation / iControl2 panel (ch. 15-17)",
    "note": "adjudicated: genset reports status to iControl2 over standard bus",
}


def _prepare(raw: dict) -> dict:
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"

    device = dict(profile.get("device") or {})
    device["manufacturer"] = "Fischer Panda"
    device["model"] = "Panda 8000i"
    device.setdefault("category_freeform", "marine generator")
    profile["device"] = device

    # §1.D adjudication 1: resolve blocking speaks_but_inert. The grounded
    # Fischer Panda standard/CAN bus carries the generator's status to its
    # dedicated iControl2 panel -> exposes_data_to_network is true.
    data_roles = dict(profile.get("data_roles") or {})
    speaks = (profile.get("networks") or {}).get("speaks") or []
    if speaks and not any(
        bool(data_roles.get(k))
        for k in (
            "exposes_data_to_network",
            "displays_data_from_other_devices",
            "controllable_from_network",
        )
    ):
        data_roles["exposes_data_to_network"] = True
        evidence = list(profile.get("evidence") or [])
        evidence.append(dict(_DATA_ROLE_EVIDENCE))
        profile["evidence"] = evidence
    profile["data_roles"] = data_roles

    # §1.D adjudication 3: drop installer-only cable steps (installation ch. 8).
    actions = [
        a
        for a in (profile.get("operator_actions") or [])
        if not (
            isinstance(a, dict)
            and str(a.get("action") or "").strip().lower() in _INSTALLER_ACTIONS
        )
    ]
    profile["operator_actions"] = actions

    # §1.D adjudication 2: combined install/operate/maintain manual.
    profile["genres"] = ["installation", "maintenance", "operation"]
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile)

    flags = list(profile.get("validation_flags") or [])
    flags.append(
        {
            "flag": "extraction_omission_adjudicated",
            "severity": "info",
            "detail": (
                "Set exposes_data_to_network (grounded standard bus to iControl2), "
                "normalized genres to install/operate/maintain, dropped 3 "
                "installer-only cable steps. " + FIXTURE_AUTH
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
            "Manual marine generator Panda 8000i 8 kVA / Panda 10000i PMS 10 kVA "
            "(operators, EN rev R10 29.4.25, 178 pp)"
        ),
        "fixture_auth": FIXTURE_AUTH,
        "review": {
            "status": "pending_human_review",
            "verdict": "unreviewed",
            "reviewed_by": "",
            "date": "",
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
        roles[DEVICE_KEY] = EXPECTED_ROLE
        exp["roles"] = roles
        sections = dict(exp.get("sections") or {})
        sections[DEVICE_KEY] = {"value": EXPECTED_SECTION, "source": "lookup"}
        exp["sections"] = sections
        notes = dict(exp.get("notes") or {})
        notes[DEVICE_KEY] = (
            "live Stage 1 extraction promoted (" + FIXTURE_AUTH + "); "
            "operators manual marine generator Panda 8000i (combined "
            "install/operate/maintain, R10); standalone " + EXPECTED_ROLE
            + " in " + EXPECTED_SECTION + " section; Panda iControl2 control "
            "panel; exposes status over Fischer Panda standard bus; sibling "
            "Panda 10000i / L3 three-phase content out of scope; "
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
        "speaks",
        len((profile.get("networks") or {}).get("speaks") or []),
        "data_roles",
        profile.get("data_roles"),
        "genres",
        profile.get("genres"),
        "flags",
        [f.get("flag") for f in (profile.get("validation_flags") or [])],
    )


if __name__ == "__main__":
    main()
