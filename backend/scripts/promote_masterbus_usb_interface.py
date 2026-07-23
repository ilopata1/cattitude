"""Promote MasterBus USB Interface scratch extract into Outremer fixtures.

Source: "MasterBus USB Interface Users Manual" (operators, EN v 2.1 September
2008, 12 pp; manual_work 34e8580d-...; file MasterBus-USB_Interfa080916EN.pdf).

Live Stage 1 extraction was stable (0 material instability, 94% heading
coverage, 0 unaccounted procedures) but left two blocking flags. Human review
(chat 2026-07-23) approved §1.D adjudications D1/D2 (Playbook 1; PRINCIPLES
§2/§8). Raw scratch is left pristine as the honest model record.

  1. ``action_without_surface``: MasterAdjust is the documented PC software
     used via this USB interface (ch. 3–4). Extraction omitted the surface.
     Add control_surfaces MasterAdjust (surface=other, remote_wired).

  2. ``direction_mismatch``: auto-repair attached MasterAdjust "monitors and
     controls connected devices" evidence to data_roles. That control belongs
     to the software, not this ENDPOINT. Drop hub-commanding data_roles
     evidence; set displays_data_from_other_devices / controllable_from_network
     false. Keep exposes_data_to_network true with grounded non-commanding
     evidence (device is a MasterBus communication participant detected as
     "USB: MasterBus") so ``speaks_but_inert`` does not fire while MasterBus
     remains in networks.speaks.

Usage (from backend/):
  python scripts/promote_masterbus_usb_interface.py
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
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "masterbus_usb_interface"

DEVICE_KEY = "masterbus_usb_interface"
STEM = "masterbus_usb_interface"

EQUIPMENT_ID = "248e1de6-31c4-471c-80e9-9236a7b00d22"
MANUAL_WORK_ID = "34e8580d-91cd-4b0a-bb99-d85f2111b4c7"

FIXTURE_AUTH = (
    "Fixture-Auth: chat MasterBus USB Interface Stage 1 extract — live "
    "extraction promoted; MasterAdjust PC surface added + hub-commanding "
    "data_roles evidence removed (exposes kept for MasterBus participant) as "
    "source-grounded §1.D adjudication (extraction omissions / direction)"
)

_MASTERADJUST_SURFACE = {
    "surface": "other",
    "location_class": "remote_wired",
    "optional_accessory": False,
    "label_verbatim": "MasterAdjust",
    "path": "control_surfaces[0]",
}

_MASTERADJUST_EVIDENCE = {
    "supports_field": "control_surfaces[0]",
    "manual_section": "4 USE OF MASTERADJUST SOFTWARE",
    "note": "adjudicated: MasterAdjust is the PC UI for this USB interface",
}

_EXPOSES_EVIDENCE = {
    "supports_field": "data_roles.exposes_data_to_network",
    "manual_section": "3 INSTALLATION",
    "note": "adjudicated: interface detected as USB MasterBus on the network",
}

# Hub-commanding / software-display notes wrongly glued onto data_roles.
_DROP_DATA_ROLE_NOTE_SNIPPETS = (
    "monitors and controls connected devices",
    "Displays read-only data from connected devices",
)


def _load_excerpts() -> list[str]:
    """Ground few-shot attractors (MasterBus) in the live extraction corpus."""
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
    device["manufacturer"] = "Mastervolt"
    device["model"] = "MasterBus USB Interface"
    device.setdefault("category_freeform", "MasterBus - USB interface")
    profile["device"] = device

    # §1.D D1: MasterAdjust PC software surface.
    surfaces = list(profile.get("control_surfaces") or [])
    has_masteradjust = any(
        isinstance(s, dict)
        and "masteradjust" in str(s.get("label_verbatim") or "").lower()
        for s in surfaces
    )
    if not has_masteradjust:
        surface = dict(_MASTERADJUST_SURFACE)
        surface["path"] = f"control_surfaces[{len(surfaces)}]"
        surfaces.append(surface)
        profile["control_surfaces"] = surfaces

    # §1.D D2: software controls others — not this device's display/control roles.
    profile["data_roles"] = {
        "exposes_data_to_network": True,
        "displays_data_from_other_devices": False,
        "controllable_from_network": False,
    }

    evidence = [
        ev
        for ev in (profile.get("evidence") or [])
        if isinstance(ev, dict)
        and not any(
            snip.lower() in str(ev.get("note") or "").lower()
            for snip in _DROP_DATA_ROLE_NOTE_SNIPPETS
        )
        and not str(ev.get("supports_field") or "").startswith("data_roles.")
    ]

    surface_idx = next(
        (
            i
            for i, s in enumerate(profile["control_surfaces"])
            if isinstance(s, dict)
            and "masteradjust" in str(s.get("label_verbatim") or "").lower()
        ),
        0,
    )
    master_ev = dict(_MASTERADJUST_EVIDENCE)
    master_ev["supports_field"] = f"control_surfaces[{surface_idx}]"
    evidence.append(master_ev)
    evidence.append(dict(_EXPOSES_EVIDENCE))
    profile["evidence"] = evidence

    # Re-point derived_from after evidence rewrite.
    safety_idx = next(
        (
            i
            for i, ev in enumerate(evidence)
            if str(ev.get("supports_field") or "")
            == "safety_role.has_emergency_procedure"
        ),
        None,
    )
    actions = []
    for action in profile.get("operator_actions") or []:
        if not isinstance(action, dict):
            continue
        item = dict(action)
        if item.get("source") == "derived" and safety_idx is not None:
            item["derived_from"] = f"evidence[{safety_idx}]"
        actions.append(item)
    profile["operator_actions"] = actions

    profile["genres"] = ["commissioning", "installation", "operation"]
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile, excerpts=excerpts or [])

    flags = list(profile.get("validation_flags") or [])
    flags.append(
        {
            "flag": "extraction_omission_adjudicated",
            "severity": "info",
            "detail": (
                "Added MasterAdjust PC surface; cleared hub-commanding "
                "data_roles evidence (exposes kept as MasterBus participant). "
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
            "MasterBus USB Interface Users Manual "
            "(operators, EN v 2.1 September 2008, 12 pp)"
        ),
        "fixture_auth": FIXTURE_AUTH,
        "review": {
            "status": "reviewed_and_approved",
            "verdict": "pass",
            "reviewed_by": "owner/human (chat)",
            "date": "2026-07-23",
            "adjudications": [
                "D1 MasterAdjust PC control surface",
                "D2 drop hub-commanding data_roles; exposes=MasterBus participant",
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
        (f"{STEM}_REVIEW.md", "REVIEW.md"),
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
            "operators manual EN v2.1; ENDPOINT in electrical; MasterAdjust "
            "PC surface; data_roles exposes only (software owns display/control); "
            "supersedes inventory stub; reviewed & approved 2026-07-23 (owner/human)"
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
        "data_roles",
        profile.get("data_roles"),
        "genres",
        profile.get("genres"),
        "needs_rextraction",
        profile.get("needs_rextraction"),
        "flags",
        [f.get("flag") for f in (profile.get("validation_flags") or [])],
    )


if __name__ == "__main__":
    main()
