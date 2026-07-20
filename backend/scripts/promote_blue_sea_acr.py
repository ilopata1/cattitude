"""Promote Blue Sea ACR scratch extract into Outremer vessel fixtures.

Adjudicates residual procedure_unaccounted items as installer wiring
(Start Isolation config, Contura switch hookup, remote LED, high-current
studs) — not guest operator omissions.

Usage (from backend/):
  python scripts/promote_blue_sea_acr.py
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
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "blue_sea_acr"

# Playbook §1.D — installer / setup wiring, not guest operator actions.
_INSTALLER_PROCEDURE_TITLES = {
    "Configure Start Isolation when there are heavy cranking loads",
    "To Connect Sustained (SPDT) ON-OFF-ON Contura Control Switch",
    "To enable Start Isolation for two or three engines starting from the same battery",
    "To install a remote LED indicator",
    "To connect high current circuit wires",
    "Connect the battery banks to the stud terminals marked A and B",
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
        if str(row.get("classification") or "").startswith("not_operator"):
            continue
        row["classification"] = "not_operator_relevant:installer"
        row["classification_rule"] = "rule:installer:acr_wiring_or_feature_enable"
        row["status"] = "classified"
        trail.append(
            {
                "title": title,
                "kind": row.get("kind"),
                "group_id": row.get("group_id"),
                "excerpt_ref": row.get("excerpt_ref"),
                "disposition": "classified",
                "auto_classified": "not_operator_relevant:installer",
                "rule": "rule:installer:acr_wiring_or_feature_enable",
                "note": (
                    "Fixture-Auth: chat ACR promote — install/wiring/feature-enable "
                    "procedures are not guest operator actions"
                ),
            }
        )
    payload["accounting_trail"] = trail
    # Recompute unaccounted list for the sidecar.
    remaining = [
        p
        for p in (inv.get("procedures") or [])
        if not str(p.get("classification") or "").startswith("not_operator")
        and str(p.get("status") or "") != "accounted_action"
        and str(p.get("title") or "") not in _INSTALLER_PROCEDURE_TITLES
    ]
    payload["unaccounted"] = remaining
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _prepare(raw: dict) -> dict:
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"
    profile["genres"] = ["installation", "operation"]
    device = dict(profile.get("device") or {})
    device.setdefault("manufacturer", "Blue Sea Systems")
    device.setdefault("model", "Automatic Charging Relays (ACR)")
    profile["device"] = device
    profile.pop("needs_rextraction", None)

    flags = [
        f
        for f in (profile.get("validation_flags") or [])
        if f.get("flag") != "procedure_unaccounted"
    ]
    flags.append(
        {
            "flag": "procedure_adjudicated_installer",
            "severity": "info",
            "detail": (
                "Fixture-Auth: chat ACR promote — residual unaccounted procedures "
                "classified installer (Start Isolation wiring, Contura switch, "
                "remote LED, high-current studs)"
            ),
        }
    )
    profile["validation_flags"] = flags

    profile = validate_interaction_profile(profile)
    profile = annotate_profile_genres(profile)
    profile["genres"] = ["installation", "operation"]
    profile["source"] = "live_extraction"
    # Re-drop procedure_unaccounted if validate re-emitted them.
    profile["validation_flags"] = [
        f
        for f in (profile.get("validation_flags") or [])
        if f.get("flag") != "procedure_unaccounted"
    ] + [
        f
        for f in flags
        if f.get("flag") == "procedure_adjudicated_installer"
    ]
    # Dedupe adjudicated info flag
    seen = set()
    deduped = []
    for f in profile["validation_flags"]:
        key = (f.get("flag"), f.get("detail"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(f)
    profile["validation_flags"] = deduped
    profile.pop("needs_rextraction", None)
    return profile


def _archive(profile: dict) -> None:
    LAST_GREEN.mkdir(parents=True, exist_ok=True)
    (LAST_GREEN / "profile.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    for name in (
        "blue_sea_acr_input.json",
        "blue_sea_acr.citations.json",
        "blue_sea_acr_procedures.json",
    ):
        src = SCRATCH / name
        if src.is_file():
            shutil.copy2(src, LAST_GREEN / name.replace("blue_sea_acr_", "").replace("blue_sea_acr.", "extraction_"))
    groups = SCRATCH / "blue_sea_acr_groups"
    if groups.is_dir():
        dest = LAST_GREEN / "groups"
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(groups, dest)
    meta = {
        "device_key": "blue_sea_acr",
        "equipment_id": "bd6154c6-2e00-4980-aff4-b87146895498",
        "manual_work_id": "5edc1271-3293-42db-a456-16ca44de7d10",
        "manual": "990180180 Rev.005 ML–ACR Automatic Charging Relays",
        "fixture_auth": (
            "Fixture-Auth: chat ACR Stage 1 promote — replace Outremer ml_switch "
            "inventory with vessel ACR; installer procedures adjudicated"
        ),
    }
    (LAST_GREEN / "ARCHIVE_META.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8"
    )


def main() -> int:
    raw_path = SCRATCH / "blue_sea_acr.json"
    raw = json.loads(raw_path.read_text(encoding="utf-8"))
    _adjudicate_procedures(SCRATCH / "blue_sea_acr_procedures.json")
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
        profiles["blue_sea_acr"] = deepcopy(profile)
        profiles.pop("ml_switch", None)
        path.write_text(
            json.dumps(profiles, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print("promoted blue_sea_acr ->", path)

    _archive(profile)
    print("archived", LAST_GREEN)
    print(
        "actions",
        [a.get("action") for a in (profile.get("operator_actions") or [])],
    )
    print("genres", profile.get("genres"))
    print(
        "flags",
        [f.get("flag") for f in (profile.get("validation_flags") or [])],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
