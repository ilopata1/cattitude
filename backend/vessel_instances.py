"""Vessel inventory instance expansion (interchangeable vs distinct).

Policy
------
- ``interchangeable`` (default): keep a single ``device_key`` + ``quantity``.
  Identical units share one graph node (e.g. SmartSolar 75/15 ×2).
- ``distinct``: expand to per-instance nodes. Shared catalog profile
  (``catalog_key`` / parent ``device_key``); per-instance vessel facts live on
  the line item (label, installation_notes, protected_by overlays, side).

Stage 4 may re-group identical-role instances for prose; that is a rendering
decision, not a graph decision.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any


def instance_handling_of(row: dict[str, Any]) -> str:
    raw = str(row.get("instance_handling") or "").strip().lower()
    if raw in {"distinct", "interchangeable"}:
        return raw
    # Already-expanded siblings (e.g. alpha_pro_iii_port) with a catalog_key.
    if row.get("catalog_key") and row.get("device_key") != row.get("catalog_key"):
        return "distinct"
    return "interchangeable"


def catalog_key_of(row: dict[str, Any]) -> str:
    return str(row.get("catalog_key") or row.get("device_key") or "").strip()


def _overlay_profile(
    catalog_profile: dict[str, Any],
    *,
    instance_row: dict[str, Any],
) -> dict[str, Any]:
    """Deep-copy catalog profile; apply per-instance vessel fact overlays."""
    profile = deepcopy(catalog_profile)
    # protected_by / protects / requires overlays from instance vessel facts
    for field in ("protected_by", "protects", "requires_devices"):
        overlay = instance_row.get(field)
        if overlay is not None:
            profile[field] = deepcopy(overlay)
    # Soft-bind resolved_hint → description when present (resolver still fuzzy)
    notes = instance_row.get("installation_notes")
    if notes:
        profile.setdefault("vessel_installation_notes", deepcopy(notes))
    label = instance_row.get("instance_label") or instance_row.get("side")
    if label:
        conf = dict(profile.get("confidence") or {})
        prior = (conf.get("notes") or "").strip()
        conf["notes"] = f"{prior}; instance={label}".strip("; ").strip()
        profile["confidence"] = conf
    return profile


def expand_equipment_instances(
    equipment: list[dict[str, Any]],
    profiles: dict[str, dict[str, Any]],
    *,
    top_level_relations: list[dict[str, Any]] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], list[dict[str, Any]]]:
    """Expand distinct inventory rows into per-instance graph nodes.

    Returns ``(expanded_equipment, expanded_profiles, relations)``.
    Interchangeable rows pass through unchanged (quantity retained on line item).
    """
    expanded_eq: list[dict[str, Any]] = []
    expanded_profiles: dict[str, dict[str, Any]] = {}
    relations: list[dict[str, Any]] = list(top_level_relations or [])

    for row in equipment:
        if not isinstance(row, dict) or not row.get("device_key"):
            continue
        handling = instance_handling_of(row)
        catalog = catalog_key_of(row)
        if catalog not in profiles:
            raise ValueError(
                f"Missing catalog profile for {catalog!r} "
                f"(device_key={row.get('device_key')!r})"
            )
        catalog_profile = profiles[catalog]

        if handling != "distinct":
            key = str(row["device_key"])
            expanded_eq.append(deepcopy(row))
            if key not in expanded_profiles:
                expanded_profiles[key] = deepcopy(catalog_profile)
            continue

        instances = list(row.get("instances") or [])
        qty = int(row.get("quantity") or 0)
        if not instances and qty > 1 and str(row["device_key"]) == catalog:
            # Synthesize numbered instances when only quantity is given.
            instances = [
                {
                    "instance_key": f"{catalog}_{i}",
                    "instance_label": f"unit {i}",
                    "unit_index": i,
                }
                for i in range(1, qty + 1)
            ]
        if not instances:
            # Already a single distinct sibling (port/stbd) — pass through.
            key = str(row["device_key"])
            unit = deepcopy(row)
            unit["catalog_key"] = catalog
            unit["instance_handling"] = "distinct"
            unit.setdefault("quantity", 1)
            expanded_eq.append(unit)
            expanded_profiles[key] = _overlay_profile(catalog_profile, instance_row=unit)
            continue

        member_keys: list[str] = []
        for i, inst in enumerate(instances, start=1):
            if not isinstance(inst, dict):
                continue
            unit_key = str(
                inst.get("instance_key") or f"{catalog}_{inst.get('unit_index') or i}"
            )
            unit = deepcopy(row)
            # Drop parent-only expansion fields from the graph line item.
            for drop in ("instances", "relations"):
                unit.pop(drop, None)
            unit["device_key"] = unit_key
            unit["catalog_key"] = catalog
            unit["instance_handling"] = "distinct"
            unit["quantity"] = 1
            unit["unit_index"] = int(inst.get("unit_index") or i)
            if inst.get("instance_label"):
                unit["instance_label"] = inst["instance_label"]
            if inst.get("side"):
                unit["side"] = inst["side"]
            if inst.get("installation_notes") is not None:
                unit["installation_notes"] = deepcopy(inst["installation_notes"])
            for field in ("protected_by", "protects", "requires_devices"):
                if inst.get(field) is not None:
                    unit[field] = deepcopy(inst[field])
            # Keep catalog description for section lookup; label stays on
            # instance_label only (do not append — avoids section keyword drift).
            expanded_eq.append(unit)
            expanded_profiles[unit_key] = _overlay_profile(
                catalog_profile, instance_row=unit
            )
            member_keys.append(unit_key)

        for rel in row.get("relations") or []:
            if not isinstance(rel, dict):
                continue
            r = deepcopy(rel)
            if not r.get("members") and member_keys:
                r["members"] = list(member_keys)
            relations.append(r)

    # Drop orphan catalog-only profile keys that are no longer equipment keys
    # (keep them if still referenced as a passthrough key).
    return expanded_eq, expanded_profiles, relations


def attach_relations_to_result(
    relations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Normalize relation dicts for VesselGraphResult.summary()."""
    out: list[dict[str, Any]] = []
    for rel in relations:
        if not isinstance(rel, dict):
            continue
        kind = str(rel.get("kind") or "").strip()
        members = [str(m) for m in (rel.get("members") or []) if m]
        if not kind or len(members) < 2:
            continue
        out.append(
            {
                "kind": kind,
                "members": members,
                "note": str(rel.get("note") or rel.get("evidence") or ""),
            }
        )
    return out
