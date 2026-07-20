"""v4.28 — gate_verbatim requires are self-evidencing (CZone 2.0 founding).

Founding profile: fixtures/pipeline/scratch/czone_2_0.json

Usage (from backend/):
  python scripts/verify_gate_verbatim_self_evidence.py
"""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_ui_pages import (
    derive_gate_verbatim_evidence,
    expand_ui_pages,
    requires_entry_self_evidencing,
)
from interaction_profile_validate import (
    missing_priority_evidence_paths,
    stage15_gate_passes,
    validate_interaction_profile,
    validation_flag_names,
)

CZONE = _BACKEND / "fixtures" / "pipeline" / "scratch" / "czone_2_0.json"


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    if not CZONE.is_file():
        print(f"FAIL — missing founding fixture {CZONE}")
        return 1

    raw = json.loads(CZONE.read_text(encoding="utf-8"))
    gated = [
        r
        for r in (raw.get("requires_devices") or [])
        if isinstance(r, dict) and requires_entry_self_evidencing(r)
    ]
    check(len(gated) >= 5, f"founding must have >=5 gate_verbatim requires; got {len(gated)}")

    # Completeness skip without evidence rows.
    stripped = deepcopy(raw)
    stripped["evidence"] = [
        e
        for e in (stripped.get("evidence") or [])
        if isinstance(e, dict)
        and not str(e.get("supports_field") or "").startswith("requires_devices")
    ]
    missing = missing_priority_evidence_paths(stripped)
    gated_missing = [m for m in missing if m.startswith("requires_devices")]
    check(
        not gated_missing,
        f"gate_verbatim requires must not be missing_priority; got {gated_missing}",
    )

    # Derive fills evidence when expand/validate runs.
    sample = {
        "entity_kind": "platform",
        "device": {
            "manufacturer": "CZone",
            "model": "2.0",
            "category_freeform": "digital switching",
        },
        "control_surfaces": [],
        "operator_actions": [],
        "networks": {"speaks": [], "bridges": []},
        "data_roles": {
            "exposes_data_to_network": False,
            "displays_data_from_other_devices": False,
            "controllable_from_network": False,
        },
        "requires_devices": [],
        "safety_role": {
            "is_protective_device": False,
            "has_manual_override": False,
            "has_emergency_procedure": False,
        },
        "protected_by": [],
        "protects": [],
        "supply_requirements": [],
        "evidence": [],
        "ui_pages": [
            {
                "name": "AC Mains",
                "purpose": "AC mains",
                "appears_if_gate": {
                    "verbatim": (
                        "The AC Mains page will appear if an AC Mains Interface "
                        "(ACMI) is configured on the system."
                    ),
                    "description_verbatim": "AC Mains Interface (ACMI)",
                    "functional_class": "acmi",
                },
                "actions": [],
            },
            {
                "name": "Climate",
                "purpose": "HVAC",
                "appears_if_gate": {
                    "verbatim": (
                        "The Climate page will appear if a supported air "
                        "conditioner (HVAC) is configured on the system."
                    ),
                    "description_verbatim": "supported air conditioner (HVAC)",
                    "functional_class": "supported_hvac",
                },
                "actions": [],
            },
            {
                "name": "Favourites",
                "purpose": "fav",
                "appears_if_gate": {
                    "verbatim": "",
                    "description_verbatim": "",
                    "functional_class": "",
                },
                "actions": [],
            },
        ],
        "confidence": {"overall": 0.8, "notes": ""},
    }
    expand_ui_pages(sample)
    derive_gate_verbatim_evidence(sample)
    req_paths = {
        str(e.get("supports_field") or "")
        for e in (sample.get("evidence") or [])
        if isinstance(e, dict)
    }
    check(
        "requires_devices[0]" in req_paths or any(
            p.startswith("requires_devices[") for p in req_paths
        ),
        f"expand must derive gate evidence; evidence fields={req_paths}",
    )

    # Live founding re-validate.
    live = deepcopy(raw)
    for key in ("validation_flags", "needs_rextraction", "repairs"):
        live.pop(key, None)
    ann = validate_interaction_profile(live, excerpts=[])
    incomplete = [
        f
        for f in (ann.get("validation_flags") or [])
        if f.get("flag") == "evidence_incomplete"
        and str(f.get("field_path") or "").startswith("requires_devices")
    ]
    check(
        not incomplete,
        f"founding CZone must not flag requires evidence_incomplete; got {incomplete}",
    )
    check(
        "evidence_incomplete" not in validation_flag_names(ann)
        or not any(
            str(f.get("field_path") or "").startswith("requires_devices")
            for f in (ann.get("validation_flags") or [])
            if f.get("flag") == "evidence_incomplete"
        ),
        "self-evidencing requires must pass completeness",
    )

    # Persist scrubbed founding annotations onto scratch.
    CZONE.write_text(
        json.dumps(ann, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    if failures:
        print("FAIL")
        for item in failures:
            print(f"  - {item}")
        return 1
    print("OK — gate_verbatim self-evidence (CZone 2.0 founding)")
    print(f"  gate_passes={stage15_gate_passes(ann)} needs_rextraction={ann.get('needs_rextraction')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
