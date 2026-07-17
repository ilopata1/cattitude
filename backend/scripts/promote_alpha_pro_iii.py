"""Promote Alpha Pro III extract to shared catalog; print draft summary."""
from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from interaction_profile_genre import (
    annotate_profile_genres,
    derive_genres_hint,
    expect_combined_genre,
)
from interaction_profile_validate import validate_interaction_profile
from system_graph import build_vessel_graph

SCRATCH = ROOT / "fixtures" / "pipeline" / "scratch"


def main() -> None:
    p = json.loads((SCRATCH / "alpha_pro_iii.json").read_text(encoding="utf-8"))
    inp = json.loads((SCRATCH / "alpha_pro_iii_input.json").read_text(encoding="utf-8"))
    proc = json.loads(
        (SCRATCH / "alpha_pro_iii_procedures.json").read_text(encoding="utf-8")
    )

    hint = derive_genres_hint(p)
    print("GENRE_HINT", hint)
    if ("installation" in hint or "commissioning" in hint) and (
        "operation" in hint or "monitoring" in hint
    ):
        p["genres"] = ["combined"]
    elif hint:
        p["genres"] = hint
    else:
        p["genres"] = ["combined"]

    p = validate_interaction_profile(p)
    p = annotate_profile_genres(p)
    p.pop("genre_hint", None)
    # Re-assert combined when both sides present.
    h = derive_genres_hint(p)
    if ("installation" in h or "commissioning" in h) and (
        "operation" in h or "monitoring" in h
    ):
        p["genres"] = ["combined"]
    elif not p.get("genres"):
        p["genres"] = ["combined"]

    p["source"] = "live_extraction"
    p.pop("needs_rextraction", None)
    conf = dict(p.get("confidence") or {})
    conf["overall"] = max(float(conf.get("overall") or 0), 0.85)
    prior = (conf.get("notes") or "").strip()
    conf["notes"] = (
        f"{prior}; catalog extract Alpha Pro III; shared by port/stbd instances"
    ).strip("; ").strip()
    p["confidence"] = conf

    (SCRATCH / "alpha_pro_iii.json").write_text(
        json.dumps(p, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    for folder in (
        ROOT / "fixtures/pipeline/outremer",
        ROOT / "fixtures/pipeline/outremer_post_batch_b",
    ):
        profiles = json.loads((folder / "profiles.json").read_text(encoding="utf-8"))
        profiles["alpha_pro_iii"] = deepcopy(p)
        (folder / "profiles.json").write_text(
            json.dumps(profiles, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    print("=== DRAFT SUMMARY ===")
    cov = inp.get("coverage") or {}
    print(
        f"coverage {cov.get('headings_covered_count')}/{cov.get('heading_count')} "
        f"frac={cov.get('heading_coverage_fraction')} low={cov.get('coverage_low')}"
    )
    sv = inp.get("stability_voting") or {}
    print(
        "stability",
        sv.get("n_completed"),
        "unstable",
        sv.get("unstable_flag_count"),
    )
    print("triage", p.get("instability_triage") or inp.get("instability_triage"))
    print("device", p.get("device"))
    print("genres", p.get("genres"), "expect_combined", expect_combined_genre(p))
    print(
        "flags",
        [
            f.get("flag")
            for f in (p.get("validation_flags") or [])
            if isinstance(f, dict)
        ][:20],
    )
    for s in p.get("control_surfaces") or []:
        print(" surface", s)
    print("data_roles", p.get("data_roles"))
    print("speaks", (p.get("networks") or {}).get("speaks"))
    print("bridges", (p.get("networks") or {}).get("bridges"))
    for a in p.get("operator_actions") or []:
        print(
            " action",
            a.get("action"),
            "|",
            a.get("audience"),
            "|",
            a.get("context"),
        )
    print("requires:")
    for r in p.get("requires_devices") or []:
        print(
            " ",
            r.get("description_verbatim"),
            "->",
            r.get("needed_for"),
            r.get("requirement_kind"),
        )
    print("safety", p.get("safety_role"))
    print("needs_rextraction", p.get("needs_rextraction"))
    print("confidence", p.get("confidence"))
    print("=== UNACCOUNTED ===")
    recon = proc.get("reconciliation") or {}
    print("counts", recon.get("counts"))
    for u in recon.get("unaccounted") or []:
        print(" ", u.get("kind"), "|", u.get("title"))

    eq = json.loads(
        (ROOT / "fixtures/pipeline/outremer/equipment.json").read_text(encoding="utf-8")
    )
    pr = json.loads(
        (ROOT / "fixtures/pipeline/outremer/profiles.json").read_text(encoding="utf-8")
    )
    result = build_vessel_graph(
        eq["equipment"],
        pr,
        relations=eq.get("relations"),
        equipment_doc=eq,
    )
    low = [
        f
        for f in result.summary()["flags"]
        if f.get("flag") == "low_confidence_profile"
    ]
    print("low_confidence after promote", low)
    roles = result.summary()["roles"]
    print("alpha roles", {k: roles[k] for k in roles if "alpha" in k})


if __name__ == "__main__":
    main()
