"""Validate CZone 2.0 platform extract (ui_pages completeness) + wire vessel.

No longer hand-promotes page inventory — extraction owns ui_pages[]. This
script:
  1. Loads scratch extract, expands ui_pages → Stage 2 fields
  2. Completeness-checks ui_pages vs intro page-tile inventory
  3. Wires Touch 7 runs_platform + vessel fixtures when complete

Usage (from backend/):
  python scripts/promote_czone_2_0.py
  python scripts/promote_czone_2_0.py --check-only
"""

from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from interaction_profile import normalize_profile
from interaction_profile_genre import annotate_profile_genres
from interaction_profile_ui_pages import (
    CZONE_2_0_INTRO_PAGE_TILES,
    inventory_ui_pages_completeness,
)
from interaction_profile_validate import validate_interaction_profile

SCRATCH = ROOT / "fixtures" / "pipeline" / "scratch"
OUTREMER = ROOT / "fixtures" / "pipeline" / "outremer"
POST = ROOT / "fixtures" / "pipeline" / "outremer_post_batch_b"


def _prepare(raw: dict) -> tuple[dict, dict]:
    p = normalize_profile(raw)
    if str(p.get("entity_kind") or "") != "platform":
        p["entity_kind"] = "platform"
    doc = str(p.get("documented_version") or "").strip()
    if not doc or "software" not in doc.lower():
        p["documented_version"] = "CZone 2.0 v1.1 (software v6.12.4.0+)"
    p["genres"] = ["operation"]
    p["source"] = "live_extraction"
    p.pop("needs_rextraction", None)
    p = validate_interaction_profile(p)
    p = annotate_profile_genres(p)
    p["entity_kind"] = "platform"
    p["genres"] = ["operation"]
    completeness = inventory_ui_pages_completeness(p)
    return p, completeness


def _wire_touch7(profile: dict) -> dict:
    out = deepcopy(profile)
    out["runs_platform"] = [
        {
            "platform_key": "czone_2_0",
            "host_kind": "display",
            "optional": False,
            "note": "Touch 7 runs CZone 2.0 application UI",
        },
        {
            "platform_key": "czone_2_0",
            "host_kind": "mobile_app",
            "optional": True,
            "note": "iPad / CZone app — vessel-optional alternate host",
        },
    ]
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Validate ui_pages completeness; do not write vessel fixtures",
    )
    args = parser.parse_args()

    path = SCRATCH / "czone_2_0.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    platform, completeness = _prepare(raw)

    print("ui_pages completeness:")
    print(json.dumps(completeness, indent=2))
    if not completeness["complete"]:
        parts = []
        if completeness.get("missing"):
            parts.append(f"missing tiles={completeness['missing']}")
        if completeness.get("empty_actions"):
            parts.append(f"empty_actions={completeness['empty_actions']}")
        if completeness.get("thin_actions"):
            parts.append(f"thin_actions={completeness['thin_actions']}")
        print("FAIL — " + ("; ".join(parts) or "incomplete"), file=sys.stderr)
        if args.check_only:
            return 1

    path.write_text(
        json.dumps(platform, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    if args.check_only:
        return 0 if completeness["complete"] else 1

    for folder in (OUTREMER, POST):
        profiles_path = folder / "profiles.json"
        profiles = json.loads(profiles_path.read_text(encoding="utf-8"))
        profiles["czone_2_0"] = deepcopy(platform)
        if "czone_touch_7" in profiles:
            profiles["czone_touch_7"] = _wire_touch7(profiles["czone_touch_7"])
        profiles_path.write_text(
            json.dumps(profiles, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

        eq_path = folder / "equipment.json"
        eq = json.loads(eq_path.read_text(encoding="utf-8"))
        keys = {e.get("device_key") for e in eq.get("equipment") or []}
        if "czone_2_0" not in keys:
            eq["equipment"].insert(
                1,
                {
                    "device_key": "czone_2_0",
                    "manufacturer": "CZone",
                    "model": "CZone 2.0",
                    "description": "CZone 2.0 digital switching application (platform)",
                    "system_category": "electrical_dc",
                    "entity_kind": "platform",
                    "quantity": 1,
                    "instance_handling": "interchangeable",
                    "provenance": "Quick Start Guide V1.1 extract",
                },
            )
        eq["notes"] = (
            "Touch 7 runs_platform czone_2_0; platform_version_unconfirmed + "
            "config_unsourced until version photo/.zcf. Climate gate: vessel has "
            "230V aircon (folio 10) but CZone-supported HVAC integration unknown "
            "— AC-present ≠ CZone-supported-HVAC."
        )
        eq["platform_version_confirmations"] = []
        eq["hub_operation_sources"] = []
        # Record AC presence without claiming CZone HVAC integration.
        notes = list(eq.get("installation_notes") or [])
        if not any(
            "czone-supported" in str(n.get("note") or "").lower()
            or "supported hvac" in str(n.get("note") or "").lower()
            for n in notes
            if isinstance(n, dict)
        ):
            notes.append(
                {
                    "applies_to": ["czone_2_0"],
                    "source": "AC schematic folio 10",
                    "note": (
                        "230V air conditioning present (aft cabin aircon + AC pump) "
                        "but whether HVAC is CZone-integrated 'supported HVAC' is "
                        "unknown — Climate page stays unresolved "
                        "(AC-present ≠ CZone-supported-HVAC)."
                    ),
                }
            )
        eq["installation_notes"] = notes
        eq_path.write_text(
            json.dumps(eq, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

        exp_path = folder / "expected.json"
        if exp_path.is_file():
            exp = json.loads(exp_path.read_text(encoding="utf-8"))
            roles = exp.setdefault("roles", {})
            roles["czone_2_0"] = "PLATFORM"
            req = [
                f
                for f in (exp.get("required_flags") or [])
                if not (
                    isinstance(f, dict)
                    and f.get("flag") == "hub_operation_unsourced"
                    and f.get("device") == "czone_touch_7"
                )
            ]
            for flag in (
                {
                    "flag": "platform_version_unconfirmed",
                    "device": "czone_touch_7",
                    "platform_key": "czone_2_0",
                },
                {"flag": "config_unsourced", "device": "czone_touch_7"},
            ):
                if not any(
                    isinstance(f, dict)
                    and f.get("flag") == flag["flag"]
                    and f.get("device") == flag["device"]
                    for f in req
                ):
                    req.append(flag)
            exp["required_flags"] = req
            notes = exp.setdefault("notes", {})
            notes["czone_2_0"] = (
                "platform ui_pages from V1.1 extract; Climate gated "
                "supported_hvac (AC present ≠ integrated)"
            )
            exp_path.write_text(
                json.dumps(exp, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

    print(
        "Wired vessel; ui_pages=",
        [p.get("name") for p in platform.get("ui_pages") or []],
    )
    print("documented_version=", platform.get("documented_version"))
    print("expected tiles=", list(CZONE_2_0_INTRO_PAGE_TILES))
    return 0 if completeness["complete"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
