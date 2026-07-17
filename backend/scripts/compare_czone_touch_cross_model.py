"""Cross-model diff: CZone Touch 7 vs archived Touch 10 extract.

Material divergence on MATERIAL_FIELD_ROOTS → stop / report; cosmetic drifts noted.

Usage (from backend/):
  python scripts/compare_czone_touch_cross_model.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile_instability import MATERIAL_FIELD_ROOTS, COSMETIC_FIELD_ROOTS
from interaction_profile_merge import fuzzy_text_similar

SCRATCH = _BACKEND / "fixtures" / "pipeline" / "scratch"


def _load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _norm_actions(profile: dict[str, Any]) -> list[tuple[str, str, str]]:
    rows = []
    for a in profile.get("operator_actions") or []:
        if not isinstance(a, dict):
            continue
        rows.append(
            (
                str(a.get("action") or "").strip().lower(),
                str(a.get("audience") or ""),
                str(a.get("context") or ""),
            )
        )
    return sorted(rows)


def _norm_surfaces(profile: dict[str, Any]) -> list[tuple[str, str, bool]]:
    rows = []
    for s in profile.get("control_surfaces") or []:
        if not isinstance(s, dict):
            continue
        rows.append(
            (
                str(s.get("surface") or ""),
                str(s.get("location_class") or ""),
                bool(s.get("optional_accessory")),
            )
        )
    return sorted(rows)


def _norm_speaks(profile: dict[str, Any]) -> list[str]:
    return sorted(
        {
            str(s.get("name_verbatim") or "").strip().lower()
            for s in ((profile.get("networks") or {}).get("speaks") or [])
            if isinstance(s, dict) and s.get("name_verbatim")
        }
    )


def _data_roles(profile: dict[str, Any]) -> dict[str, Any]:
    return dict(profile.get("data_roles") or {})


def _safety(profile: dict[str, Any]) -> dict[str, Any]:
    return dict(profile.get("safety_role") or {})


def compare(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    material: list[dict[str, Any]] = []
    cosmetic: list[dict[str, Any]] = []

    def mat(field: str, detail: str) -> None:
        material.append({"field": field, "detail": detail})

    def cos(field: str, detail: str) -> None:
        cosmetic.append({"field": field, "detail": detail})

    # device model/manufacturer expected to differ — note as material only if
    # category_freeform / role shape diverges beyond model rename.
    da, db = a.get("device") or {}, b.get("device") or {}
    if str(da.get("manufacturer") or "").lower() != str(db.get("manufacturer") or "").lower():
        mat("device.manufacturer", f"{da.get('manufacturer')!r} vs {db.get('manufacturer')!r}")
    # model always differs Touch 7 vs 10 — record as expected cross-model, not stop
    cos(
        "device.model",
        f"expected cross-model: {da.get('model')!r} vs {db.get('model')!r}",
    )

    if _data_roles(a) != _data_roles(b):
        mat("data_roles", f"{_data_roles(a)} vs {_data_roles(b)}")
    if _safety(a) != _safety(b):
        mat("safety_role", f"{_safety(a)} vs {_safety(b)}")

    sa, sb = _norm_surfaces(a), _norm_surfaces(b)
    if sa != sb:
        mat("control_surfaces", f"{sa} vs {sb}")

    speaks_a, speaks_b = set(_norm_speaks(a)), set(_norm_speaks(b))
    if speaks_a != speaks_b:
        mat(
            "networks.speaks",
            f"only_a={sorted(speaks_a - speaks_b)} only_b={sorted(speaks_b - speaks_a)}",
        )

    bridges_a = (a.get("networks") or {}).get("bridges") or []
    bridges_b = (b.get("networks") or {}).get("bridges") or []
    if bool(bridges_a) != bool(bridges_b) or len(bridges_a) != len(bridges_b):
        mat("networks.bridges", f"{bridges_a} vs {bridges_b}")

    aa, bb = _norm_actions(a), _norm_actions(b)
    # Pair by fuzzy action text
    unmatched_b = list(bb)
    for act_a, aud_a, ctx_a in aa:
        best_i = None
        best_score = 0.0
        for i, (act_b, aud_b, ctx_b) in enumerate(unmatched_b):
            if fuzzy_text_similar(act_a, act_b):
                best_i = i
                break
            # track for reporting
            best_score = max(best_score, 0.0)
        if best_i is None:
            mat("operator_actions", f"Touch7-only action: {act_a!r} ({aud_a}/{ctx_a})")
            continue
        act_b, aud_b, ctx_b = unmatched_b.pop(best_i)
        if aud_a != aud_b or ctx_a != ctx_b:
            mat(
                "operator_actions",
                f"audience/context diverge for ~{act_a!r}: "
                f"({aud_a}/{ctx_a}) vs ({aud_b}/{ctx_b})",
            )
    for act_b, aud_b, ctx_b in unmatched_b:
        mat("operator_actions", f"Touch10-only action: {act_b!r} ({aud_b}/{ctx_b})")

    req_a = [
        str(r.get("description_verbatim") or "").lower()
        for r in (a.get("requires_devices") or [])
        if isinstance(r, dict)
    ]
    req_b = [
        str(r.get("description_verbatim") or "").lower()
        for r in (b.get("requires_devices") or [])
        if isinstance(r, dict)
    ]
    if sorted(req_a) != sorted(req_b):
        mat("requires_devices", f"{sorted(req_a)} vs {sorted(req_b)}")

    return {
        "material": material,
        "cosmetic": cosmetic,
        "material_stop": bool(material),
        "material_field_roots": sorted(MATERIAL_FIELD_ROOTS),
        "cosmetic_field_roots": sorted(COSMETIC_FIELD_ROOTS),
    }


def draft_summary(profile: dict[str, Any], inp: dict[str, Any] | None) -> list[str]:
    lines: list[str] = []
    cov = (inp or {}).get("coverage") or {}
    lines.append(
        f"coverage={cov.get('headings_covered_count')}/{cov.get('heading_count')} "
        f"frac={cov.get('heading_coverage_fraction')} low={cov.get('coverage_low')}"
    )
    sv = (inp or {}).get("stability_voting") or {}
    lines.append(
        f"stability n={sv.get('n_completed')} unstable={sv.get('unstable_flag_count')}"
    )
    triage = profile.get("instability_triage") or (inp or {}).get("instability_triage")
    lines.append(f"triage={triage}")
    lines.append(f"device={profile.get('device')}")
    for s in profile.get("control_surfaces") or []:
        lines.append(f"surface: {s}")
    lines.append(f"data_roles={profile.get('data_roles')}")
    lines.append(f"speaks={(profile.get('networks') or {}).get('speaks')}")
    lines.append(f"bridges={(profile.get('networks') or {}).get('bridges')}")
    for a in profile.get("operator_actions") or []:
        lines.append(
            f"action: {a.get('action')} | {a.get('audience')} | {a.get('context')}"
        )
        act = str(a.get("action") or "").lower()
        if a.get("audience") in ("installer_or_technician", "either") or "config" in act:
            lines.append(f"  config_dependent_note: {a}")
    lines.append(f"requires={profile.get('requires_devices')}")
    lines.append(f"safety={profile.get('safety_role')}")
    lines.append(f"needs_rextraction={profile.get('needs_rextraction')}")
    return lines


def main() -> int:
    t7 = SCRATCH / "czone_touch_7.json"
    t10 = SCRATCH / "czone_touch_10.json"
    if not t7.is_file():
        print(f"missing {t7}", file=sys.stderr)
        return 1
    if not t10.is_file():
        print(f"missing {t10}", file=sys.stderr)
        return 1
    p7 = _load(t7)
    p10 = _load(t10)
    inp7 = _load(SCRATCH / "czone_touch_7_input.json") if (SCRATCH / "czone_touch_7_input.json").is_file() else {}
    diff = compare(p7, p10)
    print("== Touch 7 draft summary ==")
    print("\n".join(draft_summary(p7, inp7)))
    print()
    print("== Cross-model diff vs Touch 10 (archived) ==")
    print(json.dumps(diff, indent=2))
    if diff["material"]:
        print(
            "NOTE - content differs from Touch 10; disposition="
            f"{(_load(t7).get('cross_model_diff') or {}).get('disposition')!r} "
            f"rationale={(_load(t7).get('cross_model_diff') or {}).get('rationale')!r}"
        )
        closed = (_load(t7).get("cross_model_diff") or {}).get("material_stop")
        if closed == "closed":
            print(
                "OK - material_stop closed (document_depth_difference / "
                "config-defined operation, not device divergence)"
            )
            return 0
        print("STOP - material divergence vs Touch 10 (review before promoting hub profile)")
        return 2
    print("OK - no material divergence beyond expected model rename")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
