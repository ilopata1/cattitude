"""Verify publish-time navigation assembly against bundled cattitude.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
_REPO = _BACKEND.parent
sys.path.insert(0, str(_BACKEND))

from guide_navigation import enrich_navigation  # noqa: E402

CATTITUDE_JSON = _REPO / "mobile" / "src" / "data" / "bootstrap" / "cattitude.json"


def main() -> int:
    golden = json.loads(CATTITUDE_JSON.read_text(encoding="utf-8"))
    bootstrap = {
        "vesselId": golden.get("vesselId"),
        "vesselSlug": golden.get("vesselSlug"),
        "branding": golden.get("branding") or {},
        "emergency": golden.get("emergency") or {},
        "systems": golden.get("systems") or {},
        "checklists": golden.get("checklists") or {},
        "fixes": golden.get("fixes") or [],
        "manualTitles": golden.get("manualTitles") or {},
        "ui": {"homeRuleSections": (golden.get("ui") or {}).get("homeRuleSections")},
        "locations": {},
    }
    vessel_type = (bootstrap["branding"] or {}).get("vesselType") or "sailing_catamaran"
    enrich_navigation(bootstrap, vessel_type=vessel_type)

    ui = bootstrap["ui"]
    golden_ui = golden.get("ui") or {}
    failures: list[str] = []

    if ui.get("systemOrder") != golden_ui.get("systemOrder"):
        failures.append("systemOrder mismatch")
    if ui.get("locationLayout") != golden_ui.get("locationLayout"):
        failures.append("locationLayout mismatch")
    if set(ui.get("checklistMeta") or {}) != set(golden_ui.get("checklistMeta") or {}):
        failures.append("checklistMeta keys mismatch")

    do_menu_keys = [
        item["key"]
        for section in ui.get("doMenu") or []
        for item in section.get("items") or []
    ]
    golden_do_menu_keys = [
        item["key"]
        for section in golden_ui.get("doMenu") or []
        for item in section.get("items") or []
    ]
    if do_menu_keys != golden_do_menu_keys:
        failures.append(f"doMenu item keys mismatch: {do_menu_keys} vs {golden_do_menu_keys}")

    if set(bootstrap.get("locations") or {}) != set(golden.get("locations") or {}):
        failures.append("locations zone keys mismatch")

    if failures:
        print("FAILED:")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("OK: navigation assembly matches cattitude.json structure")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
