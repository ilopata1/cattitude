"""Targeted evidence repair pass (Stage 1.5 companion).

When ``evidence_incomplete`` fires, ask the LLM once to emit evidence objects
for exactly the named fields; merge into the profile; caller re-validates.
"""

from __future__ import annotations

import json
from typing import Any, Callable

from interaction_profile_validate import validation_flag_names


RepairCompleteFn = Callable[[str], dict[str, Any]]


def incomplete_evidence_fields(profile: dict[str, Any]) -> list[str]:
    """Field paths that need evidence (true data_roles + each requires_devices)."""
    from interaction_profile_validate import missing_priority_evidence_paths

    return missing_priority_evidence_paths(profile)


def _is_priority_supports_field(field: str) -> bool:
    f = (field or "").strip().lower()
    return (
        f.startswith("requires_devices")
        or f.startswith("data_roles.")
        or f.startswith("safety_role.")
    )


def merge_evidence_entries(
    profile: dict[str, Any],
    new_entries: list[dict[str, Any]],
    *,
    max_evidence: int = 8,
) -> dict[str, Any]:
    """Append evidence for fields not yet covered; preserve existing rows.

    When at the cap, drop non-priority rows to make room for priority
    (data_roles / requires_devices / safety_role) repair entries.
    """
    out = dict(profile)
    existing = [
        dict(e) for e in (out.get("evidence") or []) if isinstance(e, dict)
    ]
    covered = {
        str(e.get("supports_field") or "").strip()
        for e in existing
        if str(e.get("supports_field") or "").strip()
    }
    for item in new_entries:
        if not isinstance(item, dict):
            continue
        supports = str(item.get("supports_field") or "").strip()
        section = str(item.get("manual_section") or "").strip()
        note = str(item.get("note") or "").strip()
        if not supports or not section or not note:
            continue
        if supports in covered:
            continue
        if len(existing) >= max_evidence:
            if not _is_priority_supports_field(supports):
                continue
            dropped = False
            for i in range(len(existing) - 1, -1, -1):
                other = str(existing[i].get("supports_field") or "").strip()
                if not _is_priority_supports_field(other):
                    del existing[i]
                    covered.discard(other)
                    dropped = True
                    break
            if not dropped:
                continue
        existing.append(
            {
                "supports_field": supports,
                "manual_section": section,
                "note": note,
            }
        )
        covered.add(supports)
    out["evidence"] = existing
    return out


def build_evidence_repair_prompt(
    profile: dict[str, Any],
    excerpts: list[dict[str, Any]],
    missing_fields: list[str],
) -> str:
    return "\n".join(
        [
            "You repair missing evidence on an interaction profile.",
            "Emit ONLY a JSON object: {\"evidence\": [ ... ]}.",
            "Each evidence item must be "
            "{supports_field, manual_section, note}.",
            "manual_section: section title/heading from the excerpts (verbatim).",
            "note: <=12-word paraphrase — never copy manual sentences.",
            "Emit evidence entries for EXACTLY these supports_field values "
            "(one entry each, no others):",
            json.dumps(missing_fields, indent=2),
            "",
            "PROFILE (read-only; do not rewrite other fields):",
            json.dumps(profile, indent=2),
            "",
            "MANUAL EXCERPTS (only permitted facts):",
            json.dumps(excerpts, indent=2),
            "",
            "Respond with valid JSON only.",
        ]
    )


def repair_incomplete_evidence(
    profile: dict[str, Any],
    excerpts: list[dict[str, Any]],
    *,
    complete: RepairCompleteFn,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """One-shot evidence repair. Returns (merged_profile, repair_meta)."""
    missing = incomplete_evidence_fields(profile)
    meta: dict[str, Any] = {
        "attempted": False,
        "missing_fields": missing,
        "added": [],
    }
    if not missing:
        return profile, meta

    meta["attempted"] = True
    prompt = build_evidence_repair_prompt(profile, excerpts, missing)
    raw = complete(prompt)
    entries = raw.get("evidence") if isinstance(raw, dict) else None
    if not isinstance(entries, list):
        meta["error"] = "repair response missing evidence array"
        return profile, meta

    before = {
        str(e.get("supports_field") or "").strip()
        for e in (profile.get("evidence") or [])
        if isinstance(e, dict)
    }
    merged = merge_evidence_entries(profile, entries)
    after = {
        str(e.get("supports_field") or "").strip()
        for e in (merged.get("evidence") or [])
        if isinstance(e, dict)
    }
    meta["added"] = sorted(after - before)
    return merged, meta


def should_attempt_evidence_repair(profile: dict[str, Any]) -> bool:
    return "evidence_incomplete" in validation_flag_names(profile)


NETWORK_QUERY_HINTS = (
    "network",
    "masterbus",
    "communication",
    "nmea",
    "bluetooth",
    "remote",
    "panel",
    "app",
    "operation",
    "display",
    "controls",
    "configuration",
    "dip",
)


def _excerpts_for_absence_repair(
    excerpts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Prefer network/operation excerpts; fall back to all if filter empty."""
    selected: list[dict[str, Any]] = []
    for item in excerpts:
        if not isinstance(item, dict):
            continue
        blob = f"{item.get('query') or ''} {item.get('text') or ''}".lower()
        if any(hint in blob for hint in NETWORK_QUERY_HINTS):
            selected.append(item)
    return selected or [e for e in excerpts if isinstance(e, dict)]


def should_attempt_absence_repair(profile: dict[str, Any]) -> bool:
    from interaction_profile_validate import ABSENCE_REPAIR_FLAGS

    return bool(validation_flag_names(profile) & ABSENCE_REPAIR_FLAGS)


def build_absence_repair_prompt(
    profile: dict[str, Any],
    excerpts: list[dict[str, Any]],
    flags: list[str],
) -> str:
    return "\n".join(
        [
            "You repair under-extracted interaction profile fields.",
            "Emit ONLY a JSON object with any of these keys you can justify",
            "from the excerpts:",
            '  {"control_surfaces": [...], "data_roles": {...},',
            '   "requires_devices": [...], "device": {"category_freeform": "..."}}',
            "Rules:",
            "- Re-evaluate control_surfaces and data_roles from the excerpts.",
            "- If MasterBus/network monitoring or control is described, set the",
            "  matching data_roles true (and requires_devices when conditional).",
            "- Built-in on-device controls (main switch, front display) →",
            "  optional_accessory: false.",
            "- Optional remote panel / MasterView / MasterAdjust display →",
            "  optional_accessory: true AND a requires_devices entry with",
            "  needed_for pointing at that surface path.",
            "- category_freeform: manual product category words only — NEVER",
            "  registry enum values like electrical_dc.",
            "- Do not invent operator_actions here.",
            "- Use only the provided excerpts.",
            "",
            "FLAGS TO ADDRESS:",
            json.dumps(flags, indent=2),
            "",
            "PROFILE (partial; fields below may be wrong/empty):",
            json.dumps(
                {
                    "device": profile.get("device"),
                    "control_surfaces": profile.get("control_surfaces"),
                    "networks": profile.get("networks"),
                    "data_roles": profile.get("data_roles"),
                    "requires_devices": profile.get("requires_devices"),
                    "operator_actions": profile.get("operator_actions"),
                },
                indent=2,
            ),
            "",
            "MANUAL EXCERPTS (network/operation scope):",
            json.dumps(excerpts, indent=2),
            "",
            "Respond with valid JSON only.",
        ]
    )


def merge_absence_repair(
    profile: dict[str, Any], patch: dict[str, Any]
) -> dict[str, Any]:
    """Merge control_surfaces / data_roles / requires_devices / category_freeform."""
    out = dict(profile)
    if not isinstance(patch, dict):
        return out

    if isinstance(patch.get("control_surfaces"), list) and patch["control_surfaces"]:
        surfaces: list[dict[str, Any]] = []
        for idx, item in enumerate(patch["control_surfaces"]):
            if not isinstance(item, dict):
                continue
            surfaces.append(
                {
                    "surface": str(item.get("surface") or "other").strip(),
                    "location_class": str(item.get("location_class") or "unknown").strip(),
                    "optional_accessory": bool(item.get("optional_accessory")),
                    "label_verbatim": str(item.get("label_verbatim") or "").strip(),
                    "path": str(item.get("path") or f"control_surfaces[{idx}]").strip(),
                }
            )
        if surfaces:
            out["control_surfaces"] = surfaces

    roles = patch.get("data_roles")
    if isinstance(roles, dict):
        base = dict(out.get("data_roles") or {})
        for key in (
            "exposes_data_to_network",
            "displays_data_from_other_devices",
            "controllable_from_network",
        ):
            if key in roles:
                base[key] = bool(roles.get(key))
        out["data_roles"] = base

    if isinstance(patch.get("requires_devices"), list) and patch["requires_devices"]:
        requires: list[dict[str, str]] = []
        for item in patch["requires_devices"]:
            if not isinstance(item, dict):
                continue
            desc = str(item.get("description_verbatim") or "").strip()
            needed = str(item.get("needed_for") or "").strip()
            if desc and needed:
                requires.append(
                    {"description_verbatim": desc, "needed_for": needed}
                )
        if requires:
            out["requires_devices"] = requires

    device_patch = patch.get("device") if isinstance(patch.get("device"), dict) else {}
    category = str(device_patch.get("category_freeform") or "").strip()
    if category:
        device = dict(out.get("device") or {})
        device["category_freeform"] = category
        out["device"] = device
    return out


def repair_absence_flags(
    profile: dict[str, Any],
    excerpts: list[dict[str, Any]],
    *,
    complete: RepairCompleteFn,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """One-shot repair for action_without_surface / speaks_but_inert / category."""
    from interaction_profile_validate import ABSENCE_REPAIR_FLAGS

    names = sorted(validation_flag_names(profile) & ABSENCE_REPAIR_FLAGS)
    meta: dict[str, Any] = {"attempted": False, "flags": names}
    if not names:
        return profile, meta

    scoped = _excerpts_for_absence_repair(excerpts)
    meta["attempted"] = True
    meta["excerpt_count"] = len(scoped)
    prompt = build_absence_repair_prompt(profile, scoped, names)
    raw = complete(prompt)
    if not isinstance(raw, dict):
        meta["error"] = "absence repair returned non-object"
        return profile, meta

    # Strip taxonomic category from the current profile before merge if flagged.
    cleaned = dict(profile)
    if "category_freeform_provenance" in names:
        device = dict(cleaned.get("device") or {})
        device["category_freeform"] = ""
        cleaned["device"] = device

    merged = merge_absence_repair(cleaned, raw)
    meta["patched_keys"] = sorted(
        k
        for k in ("control_surfaces", "data_roles", "requires_devices", "device")
        if k in raw
    )
    return merged, meta
