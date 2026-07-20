"""Promote B&G Zeus SR scratch extract into the Outremer vessel fixture.

Usage (from backend/):
  python scripts/promote_bg_zeus_sr.py
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from interaction_profile_validate import validate_interaction_profile

SCRATCH = ROOT / "fixtures" / "pipeline" / "scratch"
OUTREMER = ROOT / "fixtures" / "pipeline" / "outremer"
POST = ROOT / "fixtures" / "pipeline" / "outremer_post_batch_b"


def main() -> None:
    raw = json.loads((SCRATCH / "bg_zeus_sr.json").read_text(encoding="utf-8"))
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"
    # Keep adjudicated model naming aligned with vessel inventory.
    device = dict(profile.get("device") or {})
    if not str(device.get("model") or "").strip():
        device["model"] = "Zeus SR"
    profile["device"] = device
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile)
    if profile.get("needs_rextraction"):
        raise SystemExit(
            f"refuse promote — needs_rextraction; flags={profile.get('validation_flags')}"
        )

    (SCRATCH / "bg_zeus_sr.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    for vessel_dir in (OUTREMER, POST):
        path = vessel_dir / "profiles.json"
        if not path.is_file():
            continue
        profiles = json.loads(path.read_text(encoding="utf-8"))
        profiles["bg_zeus_sr"] = deepcopy(profile)
        path.write_text(
            json.dumps(profiles, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print("promoted bg_zeus_sr ->", path)

    # expected: multiple_hubs is now required (first occurrence with Zeus HUB).
    for exp_path in (
        OUTREMER / "expected.json",
        POST / "expected.json",
    ):
        if not exp_path.is_file():
            continue
        exp = json.loads(exp_path.read_text(encoding="utf-8"))
        forbidden = [
            f
            for f in (exp.get("forbidden_flags") or [])
            if not (isinstance(f, dict) and f.get("flag") == "multiple_hubs")
        ]
        exp["forbidden_flags"] = forbidden
        required = list(exp.get("required_flags") or [])
        if not any(
            isinstance(f, dict) and f.get("flag") == "multiple_hubs" for f in required
        ):
            required.append({"flag": "multiple_hubs"})
        if not any(
            isinstance(f, dict) and f.get("flag") == "hub_domain_split" for f in required
        ):
            required.append({"flag": "hub_domain_split"})
        exp["required_flags"] = required
        notes = dict(exp.get("notes") or {})
        notes["multiple_hubs"] = (
            "first occurrence — Touch 7 + Zeus SR both HUB; see hub_domain_split "
            "judgment (Fixture-Auth: chat Zeus post-adjudication round 2)"
        )
        notes["bg_zeus_sr"] = (
            "live extraction promoted (Fixture-Auth: chat Zeus SR promote); "
            "displays_data true; CZone Digital switching ui_page; exposes_data false"
        )
        exp["notes"] = notes
        # Role expectations for Zeus instances if present.
        roles = dict(exp.get("roles") or {})
        for key in ("bg_zeus_sr", "bg_zeus_sr_1", "bg_zeus_sr_2"):
            if key in roles or key.startswith("bg_zeus"):
                roles[key] = "HUB"
        # Always set instance keys used by expansion.
        roles["bg_zeus_sr_1"] = "HUB"
        roles["bg_zeus_sr_2"] = "HUB"
        exp["roles"] = roles
        exp_path.write_text(
            json.dumps(exp, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print("updated expected ->", exp_path)


if __name__ == "__main__":
    main()
