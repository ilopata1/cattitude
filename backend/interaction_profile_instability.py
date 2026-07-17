"""Classify Stage 1 stability votes as material vs cosmetic instability.

Material field roots (vote disagreement is a regression risk):
  operator_actions (content/context/audience), data_roles, control_surfaces,
  safety_role, requires_devices, networks — plus protective/supply requirement
  lists (protects / protected_by / supply_requirements).

Cosmetic:
  evidence wording / confidence notes; **presence-only** disagreements under
  union-with-provenance (kept items with ``vote_margin`` < N/N); fuzzy
  operator_action phrasing drift within merge tolerance.

Material: attribute/scalar conflicts (context, audience, needed_for,
optional_accessory, booleans, category, …).

Only material votes keep ``extraction_unstable`` on the profile; cosmetic are
re-tagged ``extraction_unstable_cosmetic`` (warnings) and recorded with margins.
"""

from __future__ import annotations

from typing import Any

from interaction_profile_merge import fuzzy_text_similar

MATERIAL_FIELD_ROOTS = frozenset(
    {
        "operator_actions",
        "data_roles",
        "control_surfaces",
        "safety_role",
        "requires_devices",
        "networks",
        "protects",
        "protected_by",
        "supply_requirements",
        "device",
    }
)

COSMETIC_FIELD_ROOTS = frozenset({"evidence", "confidence"})


def _root(field_path: str) -> str:
    path = str(field_path or "").strip()
    if not path:
        return ""
    return path.split(".", 1)[0].split("[", 1)[0]


def _non_null_variants(vote: dict[str, Any]) -> list[Any]:
    out: list[Any] = []
    for item in vote.get("variants") or []:
        if not isinstance(item, dict):
            continue
        if item.get("value") is not None:
            out.append(item.get("value"))
    return out


def vote_margin(vote: dict[str, Any], *, n_runs: int | None = None) -> dict[str, Any]:
    """Return presence / majority margin for one extraction_votes row."""
    variants = list(vote.get("variants") or [])
    n = n_runs or len(variants) or 1
    present = sum(
        1
        for v in variants
        if isinstance(v, dict) and v.get("value") is not None
    )
    chosen = vote.get("chosen")
    agree = 0
    for v in variants:
        if not isinstance(v, dict):
            continue
        val = v.get("value")
        if chosen is None and val is None:
            agree += 1
        elif chosen is not None and val is not None:
            if isinstance(chosen, dict) and isinstance(val, dict):
                # Rough: same identity key fields
                if chosen == val:
                    agree += 1
                elif str(chosen.get("action") or "") and fuzzy_text_similar(
                    str(chosen.get("action") or ""),
                    str(val.get("action") or ""),
                ):
                    agree += 1
                elif str(chosen.get("description_verbatim") or "") and fuzzy_text_similar(
                    str(chosen.get("description_verbatim") or ""),
                    str(val.get("description_verbatim") or ""),
                ):
                    agree += 1
                elif chosen.get("surface") and chosen.get("surface") == val.get("surface"):
                    agree += 1
            elif chosen == val:
                agree += 1
    return {
        "n_runs": n,
        "present_in": present,
        "agree_with_chosen": agree,
        "margin": f"{max(present, agree)}/{n}",
    }


def is_cosmetic_vote(vote: dict[str, Any]) -> bool:
    """True when disagreement is cosmetic (evidence, presence, phrasing)."""
    root = _root(str(vote.get("field_path") or ""))
    attr = str(vote.get("attribute") or "")
    if root in COSMETIC_FIELD_ROOTS:
        return True
    # Union-with-provenance: presence flaps are expected, not material.
    if attr == "presence":
        return True
    if root not in MATERIAL_FIELD_ROOTS:
        # Unknown roots: treat as material so we don't hide new flaps.
        return False
    if root == "operator_actions" and attr in {"", "presence"}:
        values = _non_null_variants(vote)
        actions = [
            str(v.get("action") or "")
            for v in values
            if isinstance(v, dict) and str(v.get("action") or "").strip()
        ]
        if len(actions) >= 2:
            for i, a in enumerate(actions):
                for b in actions[i + 1 :]:
                    if not fuzzy_text_similar(a, b, threshold=0.7):
                        return False
            return True
    if attr in {"context", "audience", "needed_for", "optional_accessory"}:
        return False
    return False


def classify_extraction_votes(
    votes: list[dict[str, Any]],
    *,
    n_runs: int | None = None,
) -> dict[str, Any]:
    material: list[dict[str, Any]] = []
    cosmetic: list[dict[str, Any]] = []
    for vote in votes:
        if not isinstance(vote, dict):
            continue
        row = dict(vote)
        row["vote_margin"] = vote_margin(vote, n_runs=n_runs)
        row["instability_class"] = (
            "cosmetic" if is_cosmetic_vote(vote) else "material"
        )
        if row["instability_class"] == "cosmetic":
            cosmetic.append(row)
        else:
            material.append(row)
    return {
        "material": material,
        "cosmetic": cosmetic,
        "material_count": len(material),
        "cosmetic_count": len(cosmetic),
    }


def apply_instability_triage(profile: dict[str, Any]) -> dict[str, Any]:
    """Rewrite validation_flags: keep material ``extraction_unstable`` only."""
    out = dict(profile)
    votes = list(out.get("extraction_votes") or [])
    n_runs = None
    classified = classify_extraction_votes(votes, n_runs=n_runs)
    out["extraction_votes"] = classified["material"] + classified["cosmetic"]
    out["instability_triage"] = {
        "material_count": classified["material_count"],
        "cosmetic_count": classified["cosmetic_count"],
    }

    material_paths = {
        (
            str(v.get("field_path") or ""),
            str(v.get("attribute") or ""),
            str((v.get("chosen") or {}).get("action")
                if isinstance(v.get("chosen"), dict)
                else v.get("chosen")
                or "")[:80],
        )
        for v in classified["material"]
    }

    new_flags: list[dict[str, str]] = []
    for flag in out.get("validation_flags") or []:
        if not isinstance(flag, dict):
            continue
        if flag.get("flag") != "extraction_unstable":
            new_flags.append(dict(flag))
            continue
        # Keep flag if any material vote shares this field_path.
        path = str(flag.get("field_path") or "")
        keep = any(
            str(v.get("field_path") or "") == path for v in classified["material"]
        )
        if keep:
            new_flags.append(dict(flag))
        else:
            cosmetic_flag = dict(flag)
            cosmetic_flag["flag"] = "extraction_unstable_cosmetic"
            cosmetic_flag["severity"] = "warning"
            new_flags.append(cosmetic_flag)
    # Drop none; classified path used above.
    _ = material_paths
    out["validation_flags"] = new_flags
    return out
