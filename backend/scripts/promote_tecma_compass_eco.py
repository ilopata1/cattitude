"""Promote Tecma Compass Eco scratch extract into Outremer vessel fixtures.

Source: \"Compass Eco Manual\" (INSTALLATION AND USE MANUAL, EN/FR/ES combined,
50 pp; manual_work 821045ee-...; file hash matches owner Downloads PDF).

Live Stage 1 extraction captured the ECO Rocker switch and Add Water action,
but omitted the Flush action that the same OPERATION section documents (and
that the extraction evidence already cites). Flush is added here as a narrow,
source-grounded §1.D adjudication (Playbook 1; PRINCIPLES §2/§8). The raw
scratch extraction is left pristine as the honest record of the model output.

Usage (from backend/):
  python scripts/promote_tecma_compass_eco.py
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
LAST_GREEN = ROOT / "fixtures" / "pipeline" / "last_green" / "tecma_compass_eco"

DEVICE_KEY = "tecma_compass_eco"
STEM = "tecma_compass_eco"

EQUIPMENT_ID = "797ee578-df79-48e4-9127-7440b4daef94"
MANUAL_WORK_ID = "821045ee-7234-4011-a17f-03e66ae6836d"

FIXTURE_AUTH = (
    "Fixture-Auth: chat Tecma Compass Eco Stage 1 extract — live extraction "
    "promoted; Flush (lower ECO Rocker switch) added as source-grounded §1.D "
    "adjudication (extraction omission; evidence already cited OPERATION §7)"
)

_FLUSH_ACTION = {
    "action": "activate 'Flush' function by pressing lower switch",
    "audience": "operator",
    "context": "daily",
    "occasion": "to flush the toilet after use",
    "source": "adjudicated_extraction_omission",
}

_FLUSH_EVIDENCE = {
    "supports_field": (
        "operator_actions[action=\"activate 'Flush' function by pressing "
        "lower switch\"]"
    ),
    "manual_section": "7. OPERATION",
    "note": "adjudicated: Flush on lower ECO Rocker switch omitted by extraction",
}


def _prepare(raw: dict) -> dict:
    profile = deepcopy(raw)
    profile["source"] = "live_extraction"
    profile["entity_kind"] = "device"

    device = dict(profile.get("device") or {})
    device["manufacturer"] = "Tecma"
    device["model"] = "Compass Eco electric head"
    device.setdefault("category_freeform", "electric marine toilet")
    profile["device"] = device

    actions = list(profile.get("operator_actions") or [])
    has_flush = any(
        isinstance(a, dict)
        and "flush" in str(a.get("action") or "").lower()
        for a in actions
    )
    if not has_flush:
        actions.append(dict(_FLUSH_ACTION))
        profile["operator_actions"] = actions

    evidence = list(profile.get("evidence") or [])
    if not any(
        isinstance(e, dict)
        and "Flush" in str(e.get("supports_field") or "")
        and "adjudicated" in str(e.get("note") or "")
        for e in evidence
    ):
        evidence.append(dict(_FLUSH_EVIDENCE))
    profile["evidence"] = evidence

    # Installation + operation genres (EN section of combined install/use PDF).
    profile["genres"] = ["installation", "operation"]
    profile.pop("needs_rextraction", None)

    profile = validate_interaction_profile(profile)

    flags = list(profile.get("validation_flags") or [])
    flags.append(
        {
            "flag": "extraction_omission_adjudicated",
            "severity": "info",
            "detail": (
                "Added Flush (lower ECO Rocker) from OPERATION §7 "
                "(grounded; see evidence). " + FIXTURE_AUTH
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
            "Compass Eco Manual — INSTALLATION AND USE MANUAL "
            "(EN/FR/ES combined, 50 pp; file hash "
            "9820eeddc670f04042f4f16a7c0aad7dec8d041607e16b5e65127552ea47f84b)"
        ),
        "fixture_auth": FIXTURE_AUTH,
        "review": {
            "status": "pending_human_review",
            "verdict": "promoted_for_heads_founding",
            "reviewed_by": "agent (Playbook 1 promote)",
            "date": "2026-07-25",
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
        notes = dict(exp.get("notes") or {})
        notes[DEVICE_KEY] = (
            "live Stage 1 extraction promoted (" + FIXTURE_AUTH + "); "
            "INSTALLATION AND USE MANUAL; standalone ISLAND in heads section; "
            "ECO Rocker Add Water + Flush; quantity on vessel pending owner "
            "confirmation; pending human review"
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
        "flags",
        [f.get("flag") for f in (profile.get("validation_flags") or [])],
    )


if __name__ == "__main__":
    main()
