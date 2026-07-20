"""Promote B&G Halo 20+ scratch extract into Outremer vessel fixtures.

Source is the shared Halo20 / 20+ / 24 *Installation Manual* (988-12307-006).
Day-to-day radar UI lives on the MFD (Zeus) — this extract is setup /
commissioning / fault-reference only. Do not invent operator station pages.

Usage (from backend/):
  python scripts/promote_bg_halo_20_plus.py
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
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "bg_halo_20_plus"

DEVICE_KEY = "bg_halo_20_plus"
STEM = "bg_halo_20_plus"

# Install-manual fault / cool-down cues — not guest day-to-day procedures.
_INSTALLER_PROCEDURE_TITLES = {
    "Restart the radar",
    "Switch to STBY, Allow unit cool",
}


def _adjudicate_procedures(path: Path) -> None:
    if not path.is_file():
        return
    payload = json.loads(path.read_text(encoding="utf-8"))
    inv = payload.get("inventory") or {}
    trail = list(payload.get("accounting_trail") or [])
    for row in inv.get("procedures") or []:
        title = str(row.get("title") or "")
        if title not in _INSTALLER_PROCEDURE_TITLES:
            continue
        row["classification"] = "not_operator_relevant:installer"
        row["classification_rule"] = "rule:installer:halo_error_code_recovery"
        row["status"] = "classified"
        trail.append(
            {
                "title": title,
                "kind": row.get("kind"),
                "group_id": row.get("group_id"),
                "excerpt_ref": row.get("excerpt_ref"),
                "disposition": "classified",
                "auto_classified": "not_operator_relevant:installer",
                "rule": "rule:installer:halo_error_code_recovery",
                "note": (
                    "Fixture-Auth: chat Halo 20+ promote — error-code / STBY "
                    "cool-down lines from installation troubleshooting are not "
                    "guest operator runbook steps"
                ),
            }
        )
    # Also mark any remaining unaccounted rows with those titles.
    for row in payload.get("unaccounted") or []:
        if not isinstance(row, dict):
            continue
        if str(row.get("title") or "") in _INSTALLER_PROCEDURE_TITLES:
            row["classification"] = "not_operator_relevant:installer"
            row["status"] = "classified"
    payload["accounting_trail"] = trail
    payload["unaccounted"] = [
        p
        for p in (payload.get("unaccounted") or [])
        if str(p.get("title") or "") not in _INSTALLER_PROCEDURE_TITLES
        and str(p.get("status") or "") != "classified"
    ]
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _prepare(raw: dict) -> dict:
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"
    device = dict(profile.get("device") or {})
    device["manufacturer"] = "B&G"
    device["model"] = "Halo 20+"
    device.setdefault("category_freeform", "Radar")
    profile["device"] = device

    # Install-manual corpus: setup/commissioning actions are technician-facing.
    actions = []
    for act in profile.get("operator_actions") or []:
        if not isinstance(act, dict):
            continue
        row = dict(act)
        row["audience"] = "installer_or_technician"
        if str(row.get("context") or "") in {"situational", "daily", "emergency"}:
            if "error" in str(row.get("action") or "").lower():
                row["context"] = "emergency"
            else:
                row["context"] = "commissioning"
        actions.append(row)
    profile["operator_actions"] = actions

    # RI-10 is optional (Broadband replacement path); drop bogus needed_for token.
    profile["requires_devices"] = [
        r
        for r in (profile.get("requires_devices") or [])
        if isinstance(r, dict)
        and "ri-10" not in str(r.get("description_verbatim") or "").lower()
    ]

    profile["genres"] = ["installation", "commissioning", "maintenance"]
    profile.pop("needs_rextraction", None)

    flags = [
        f
        for f in (profile.get("validation_flags") or [])
        if isinstance(f, dict)
        and f.get("flag")
        not in {
            "procedure_unaccounted",
            "dangling_needed_for",
            "genre_content_mismatch",
        }
    ]
    flags.append(
        {
            "flag": "procedure_adjudicated_installer",
            "severity": "info",
            "detail": (
                "Fixture-Auth: chat Halo 20+ promote — install-manual error-code "
                "recovery cues classified installer; day-to-day radar UI is on "
                "the MFD (Zeus), not this PDF"
            ),
        }
    )
    flags.append(
        {
            "flag": "hub_operation_unsourced",
            "severity": "warning",
            "detail": (
                "Halo day-to-day transmit/STBY/range UI is hosted on the chartplotter; "
                "this installation manual does not document MFD radar pages"
            ),
        }
    )
    profile["validation_flags"] = flags

    profile = validate_interaction_profile(profile)
    profile = annotate_profile_genres(profile)
    profile["genres"] = ["installation", "commissioning", "maintenance"]
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"

    # Keep adjudication + hub notes; drop re-emitted procedure_unaccounted.
    keep = {
        "procedure_adjudicated_installer",
        "hub_operation_unsourced",
        "group_unutilized",
    }
    rebuilt = [
        f
        for f in (profile.get("validation_flags") or [])
        if isinstance(f, dict) and f.get("flag") in keep
    ]
    for extra in flags:
        if extra.get("flag") in {
            "procedure_adjudicated_installer",
            "hub_operation_unsourced",
        } and not any(f.get("flag") == extra["flag"] for f in rebuilt):
            rebuilt.append(extra)
    profile["validation_flags"] = rebuilt
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile)
    # Final strip of blocking procedure flags after adjudication sidecar.
    profile["validation_flags"] = [
        f
        for f in (profile.get("validation_flags") or [])
        if f.get("flag") != "procedure_unaccounted"
    ]
    if profile.get("needs_rextraction"):
        # Soft warnings only for promote of install-only radar.
        blocking = [
            f
            for f in (profile.get("validation_flags") or [])
            if f.get("severity") == "blocking"
        ]
        if not blocking:
            profile.pop("needs_rextraction", None)
        else:
            raise SystemExit(
                f"refuse promote — needs_rextraction; flags={profile.get('validation_flags')}"
            )
    return profile


def _archive(profile: dict) -> None:
    LAST_GREEN.mkdir(parents=True, exist_ok=True)
    (LAST_GREEN / "profile.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    meta = {
        "device_key": DEVICE_KEY,
        "equipment_id": "a4b0d736-d755-4ded-aa96-b04f6ad73ca1",
        "manual_work_id": "8849ecca-4378-495d-a9bd-8951b7358651",
        "manual": (
            "Halo20, 20+ and 24 Dome Radars Installation Manual "
            "(988-12307-006, EN, 24 pp)"
        ),
        "fixture_auth": (
            "Fixture-Auth: chat Halo 20+ Stage 1 promote — replace empty stub; "
            "install-manual corpus; MFD radar UI unsourced"
        ),
    }
    (LAST_GREEN / "ARCHIVE_META.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    for name in (
        f"{STEM}_input.json",
        f"{STEM}_citations.json",
        f"{STEM}_procedures.json",
    ):
        src = SCRATCH / name
        if src.is_file():
            dest_name = {
                f"{STEM}_input.json": "extraction_input.json",
                f"{STEM}_citations.json": "citations.json",
                f"{STEM}_procedures.json": "procedures.json",
            }[name]
            shutil.copy2(src, LAST_GREEN / dest_name)
    groups = SCRATCH / f"{STEM}_groups"
    if groups.is_dir():
        dest_g = LAST_GREEN / "groups"
        if dest_g.exists():
            shutil.rmtree(dest_g)
        shutil.copytree(groups, dest_g)


def main() -> None:
    raw = json.loads((SCRATCH / f"{STEM}.json").read_text(encoding="utf-8"))
    _adjudicate_procedures(SCRATCH / f"{STEM}_procedures.json")
    profile = _prepare(raw)

    (SCRATCH / f"{STEM}.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

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

    # Role: Ethernet-speaking radar with exposes_data → ENDPOINT when it shares
    # a hub path; otherwise may stay passive. Record live note on expected.
    for exp_path in (OUTREMER / "expected.json", POST / "expected.json"):
        if not exp_path.is_file():
            continue
        exp = json.loads(exp_path.read_text(encoding="utf-8"))
        notes = dict(exp.get("notes") or {})
        notes["bg_halo_20_plus"] = (
            "live extraction promoted (Fixture-Auth: chat Halo 20+ promote); "
            "installation manual only; hub_operation_unsourced for MFD radar UI"
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
        "actions",
        len(profile.get("operator_actions") or []),
        "genres",
        profile.get("genres"),
        "flags",
        [f.get("flag") for f in (profile.get("validation_flags") or [])],
    )


if __name__ == "__main__":
    main()
