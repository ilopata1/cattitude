"""Promote Touch 7 extract to vessel hub; close material_stop; update fixtures."""
from __future__ import annotations

import json
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


def main() -> None:
    raw = json.loads((SCRATCH / "czone_touch_7.json").read_text(encoding="utf-8"))
    profile = deepcopy(raw)
    profile["genres"] = ["installation", "commissioning"]
    profile["source"] = "live_extraction"
    profile["cross_model_diff"] = {
        "vs": "czone_touch_10",
        "vs_archive": "fixtures/pipeline/scratch/czone_touch_10.json",
        "disposition": "document_depth_difference",
        "rationale": (
            "document depth / config-defined operation, not device divergence "
            "(owner review: Touch 7 PDF ~23pp, ~4pp operation, all first-setup)"
        ),
        "material_stop": "closed",
        "family_operational_shape_reference": "czone_touch_10",
    }
    profile.pop("needs_rextraction", None)
    profile.pop("extraction_pending_review", None)
    # Re-validate to attach config_defined_operation (replacing profile_genre_incomplete).
    profile = validate_interaction_profile(profile)
    profile = annotate_profile_genres(profile)
    profile.pop("genre_hint", None)
    # Ensure flag present even if validator path skipped station heuristic.
    flags = [
        dict(f) for f in (profile.get("validation_flags") or []) if isinstance(f, dict)
    ]
    flags = [
        f
        for f in flags
        if f.get("flag")
        not in {"profile_genre_incomplete", "genre_content_mismatch", "unknown_field"}
        or (
            f.get("flag") == "unknown_field"
            and "genre_hint" not in str(f.get("detail") or "")
        )
    ]
    # Drop genre_hint unknown_field leftovers from prior promotes.
    flags = [
        f
        for f in flags
        if not (
            f.get("flag") == "unknown_field"
            and "genre_hint" in str(f.get("detail") or "")
        )
    ]
    flags = [f for f in flags if f.get("flag") != "genre_content_mismatch"]
    if not any(f.get("flag") == "config_defined_operation" for f in flags):
        flags.append(
            {
                "flag": "config_defined_operation",
                "detail": (
                    "Station UI present; manual documents first-setup only — "
                    "day-to-day operation is config-defined"
                ),
            }
        )
    profile["validation_flags"] = flags
    profile["genres"] = ["installation", "commissioning"]
    profile.pop("genre_hint", None)

    (SCRATCH / "czone_touch_7.json").write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    for folder in (OUTREMER, POST):
        profiles_path = folder / "profiles.json"
        profiles = json.loads(profiles_path.read_text(encoding="utf-8"))
        profiles.pop("czone_system", None)
        profiles["czone_touch_7"] = deepcopy(profile)
        profiles_path.write_text(
            json.dumps(profiles, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

        eq_path = folder / "equipment.json"
        eq = json.loads(eq_path.read_text(encoding="utf-8"))
        eq["vessel_artifact_facts"] = [
            {
                "device_key": "czone_touch_7",
                "assertions": [
                    {
                        "kind": "network_speak",
                        "name_verbatim": "CZone",
                        "physical_or_wireless": "wired",
                        "source": "folio 2E TAC + system topology",
                    },
                    {
                        "kind": "data_role",
                        "field": "displays_data_from_other_devices",
                        "value": True,
                        "source": "folio 2E TAC + system topology",
                    },
                ],
            }
        ]
        eq["hub_operation_sources"] = []
        eq["notes"] = (
            "Primary Stage 2 vessel fixture (outremer_post_batch_b). "
            "Touch 7 hub: catalog extract + vessel_artifact facts; "
            "hub_operation_unsourced until device_configuration or walkthrough."
        )
        eq_path.write_text(
            json.dumps(eq, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

        exp_path = folder / "expected.json"
        if exp_path.is_file():
            exp = json.loads(exp_path.read_text(encoding="utf-8"))
            req = list(exp.get("required_flags") or [])
            if not any(
                f.get("flag") == "hub_operation_unsourced" for f in req if isinstance(f, dict)
            ):
                req.append(
                    {"flag": "hub_operation_unsourced", "device": "czone_touch_7"}
                )
            exp["required_flags"] = req
            notes = dict(exp.get("notes") or {})
            notes["touch7"] = (
                "material_stop closed: document_depth_difference; "
                "config_defined_operation; vessel_artifact CZone + displays_data"
            )
            notes["czone_system"] = "retired — hub is czone_touch_7"
            exp["notes"] = notes
            exp_path.write_text(
                json.dumps(exp, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
            )

    # Close compare script disposition note
    note = SCRATCH / "czone_touch_7_MATERIAL_STOP_CLOSED.md"
    note.write_text(
        "# Touch 7 material_stop — closed\n\n"
        "**Rationale:** document depth / config-defined operation, not device divergence.\n\n"
        "**Disposition vs Touch 10:** `document_depth_difference` "
        "(Touch 10 archive remains family operational-shape reference).\n\n"
        "**Vessel hub:** catalog profile + vessel_artifact facts "
        "(CZone speak, displays_data=true) from folio 2E + topology.\n",
        encoding="utf-8",
    )
    print("promoted czone_touch_7; vessel_artifact facts set; material_stop closed")
    print(
        "flags",
        [f.get("flag") for f in profile.get("validation_flags") or [] if isinstance(f, dict)],
    )
    print("genres", profile.get("genres"))


if __name__ == "__main__":
    main()
