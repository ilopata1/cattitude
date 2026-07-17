"""Requirement kinds + OR-alternative expand for requires_devices (v4.0).

Kinds:
  device | cable_or_consumable | software_app | commissioning_tool

Stage 2 resolves only ``device``. Other kinds are recorded for reference
(software_app on a built-in surface is auto-satisfied as downloadable).
"""

from __future__ import annotations

import re
from typing import Any

REQUIREMENT_KINDS = frozenset(
    {
        "device",
        "cable_or_consumable",
        "software_app",
        "commissioning_tool",
    }
)

_OR_SPLIT_RE = re.compile(r"\s+or\s+|,(?![^()]*\))", re.IGNORECASE)
_REQ_EVIDENCE_RE = re.compile(r"^requires_devices\[(\d+)\]")

# Deterministic backstop cues (stale profiles / stubs without re-extraction).
_APP_CUES = re.compile(
    r"\b(?:app|apps|software)\b|\bvictronconnect\b|\bmasteradjust\b",
    re.I,
)
_TOOL_CUES = re.compile(
    r"\b(?:configuration\s+tool|config\s+tool|commissioning\s+tool|"
    r"setup\s+tool|programming\s+tool)\b|\bmasteradjust\b",
    re.I,
)
_CABLE_CUES = re.compile(
    r"\b(?:cable|cord|wire|dongle|usb\s+interface|smart\s+dongle|"
    r"connector\s+kit|deutsch\s+connector)\b",
    re.I,
)


def classify_requirement_kind(description: str) -> str:
    """Classify a requires_devices description (deterministic backstop)."""
    text = (description or "").strip()
    if not text:
        return "device"
    # Commissioning tools before generic "software" (MasterAdjust is both).
    if _TOOL_CUES.search(text):
        return "commissioning_tool"
    if _APP_CUES.search(text) and not _CABLE_CUES.search(text):
        return "software_app"
    if _CABLE_CUES.search(text):
        return "cable_or_consumable"
    return "device"


def normalize_requirement_description(description: str) -> str:
    """Normalize for exact-key dedupe (case / whitespace)."""
    return " ".join((description or "").strip().lower().split())


def split_requirement_alternatives(description: str) -> list[str]:
    """Split ``GX device or GlobalLink 520`` / comma lists into alternatives."""
    desc = (description or "").strip()
    if not desc:
        return []
    parts = [p.strip() for p in _OR_SPLIT_RE.split(desc) if p.strip()]
    # Avoid splitting short noise ("on or off" style) — require ≥2 meaningful alts.
    if len(parts) < 2:
        return [desc]
    return parts


def _merge_require_entries(
    kept: dict[str, Any], incoming: dict[str, Any]
) -> dict[str, Any]:
    """Keep first description/needed_for; union provenance fields."""
    out = dict(kept)
    for key in ("source", "derived_from", "requirement_kind"):
        if not out.get(key) and incoming.get(key):
            out[key] = incoming[key]
    # Preserve earliest non-empty kind; do not overwrite a good classify.
    return out


def expand_requirement_alternatives(
    requires: list[Any],
) -> tuple[list[dict[str, Any]], list[int]]:
    """OR-expand then exact-dedupe on (norm desc, needed_for, kind).

    Returns ``(entries, old_index_map)`` where ``old_index_map[i]`` is the new
    index for the original (pre-expand) requires entry ``i`` (used to rewrite
    evidence ``supports_field`` paths).
    """
    # Phase 1: expand OR phrases; track which original index each row came from.
    expanded: list[tuple[int, dict[str, Any]]] = []
    for orig_i, req in enumerate(requires or []):
        if not isinstance(req, dict):
            continue
        desc = str(req.get("description_verbatim") or "").strip()
        if not desc:
            continue
        needed = str(req.get("needed_for") or "").strip()
        kind = str(req.get("requirement_kind") or "").strip()
        if kind not in REQUIREMENT_KINDS:
            kind = classify_requirement_kind(desc)
        parts = split_requirement_alternatives(desc)
        for part in parts:
            entry = dict(req)
            entry["description_verbatim"] = part
            entry["needed_for"] = needed
            entry["requirement_kind"] = (
                kind
                if len(parts) == 1
                else classify_requirement_kind(part)
            )
            expanded.append((orig_i, entry))

    # Phase 2: exact-key dedupe.
    seen: dict[tuple[str, str, str], int] = {}
    out: list[dict[str, Any]] = []
    # orig index → first new index that absorbed it
    orig_to_new: dict[int, int] = {}
    for orig_i, entry in expanded:
        key = (
            normalize_requirement_description(
                str(entry.get("description_verbatim") or "")
            ),
            str(entry.get("needed_for") or "").strip().lower(),
            str(entry.get("requirement_kind") or "device"),
        )
        if key in seen:
            new_i = seen[key]
            out[new_i] = _merge_require_entries(out[new_i], entry)
            orig_to_new.setdefault(orig_i, new_i)
            continue
        new_i = len(out)
        seen[key] = new_i
        out.append(entry)
        orig_to_new.setdefault(orig_i, new_i)

    old_index_map = [
        orig_to_new[i] for i in range(len(requires or [])) if i in orig_to_new
    ]
    # Full map for every original index (missing → -1).
    full_map = [orig_to_new.get(i, -1) for i in range(len(requires or []))]
    return out, full_map


def rewrite_requires_evidence_paths(
    evidence: list[Any],
    old_to_new: list[int],
) -> list[Any]:
    """Remap ``supports_field: requires_devices[i]`` after dedupe/expand.

    Non-dict evidence rows (e.g. raw string dumps) are preserved so validators
    can still flag ``evidence_shape_invalid`` / ``evidence_verbatim``.
    """
    out: list[Any] = []
    for item in evidence or []:
        if not isinstance(item, dict):
            out.append(item)
            continue
        entry = dict(item)
        field = str(entry.get("supports_field") or "").strip()
        m = _REQ_EVIDENCE_RE.match(field)
        if m:
            old_i = int(m.group(1))
            if 0 <= old_i < len(old_to_new) and old_to_new[old_i] >= 0:
                entry["supports_field"] = f"requires_devices[{old_to_new[old_i]}]"
        out.append(entry)
    seen: set[tuple[str, str]] = set()
    uniq: list[Any] = []
    for entry in out:
        if not isinstance(entry, dict):
            uniq.append(entry)
            continue
        key = (
            str(entry.get("supports_field") or "").strip().lower(),
            " ".join(str(entry.get("note") or "").lower().split()),
        )
        if key in seen:
            continue
        seen.add(key)
        uniq.append(entry)
    return uniq


_SPEAKS_NEEDED_RE = re.compile(r"^networks\.speaks\[\d+\]$")


def normalize_speaks_needed_for(
    profile: dict[str, Any],
) -> list[dict[str, str]]:
    """Rewrite ``needed_for: networks.speaks[N]`` → realizing data_roles path.

    Speaks entries are unconditional (the port exists). Dependency for *using*
    the port targets the capability flag it enables. Prefer
    ``exposes_data_to_network``, then ``controllable_from_network``, then
    ``displays_data_from_other_devices``. If none are true →
    ``needed_for_unmappable`` flag (entry kept with original path).
    """
    if not isinstance(profile, dict):
        return []
    roles = profile.get("data_roles") if isinstance(profile.get("data_roles"), dict) else {}
    flags: list[dict[str, str]] = []
    requires = list(profile.get("requires_devices") or [])
    out: list[dict[str, Any]] = []
    for i, req in enumerate(requires):
        if not isinstance(req, dict):
            continue
        entry = dict(req)
        path = str(entry.get("needed_for") or "").strip()
        if not _SPEAKS_NEEDED_RE.match(path):
            out.append(entry)
            continue
        target: str | None = None
        if roles.get("exposes_data_to_network") is True:
            target = "data_roles.exposes_data_to_network"
        elif roles.get("controllable_from_network") is True:
            target = "data_roles.controllable_from_network"
        elif roles.get("displays_data_from_other_devices") is True:
            target = "data_roles.displays_data_from_other_devices"
        if target:
            entry["needed_for"] = target
            entry["needed_for_normalized_from"] = path
            out.append(entry)
        else:
            flags.append(
                {
                    "flag": "needed_for_unmappable",
                    "severity": "warning",
                    "detail": (
                        f"requires_devices[{i}] needed_for {path!r} has no "
                        "true data_roles capability to map to"
                    ),
                    "field_path": f"requires_devices[{i}].needed_for",
                }
            )
            out.append(entry)
    profile["requires_devices"] = out
    return flags


def annotate_requirement_kinds(
    requires: list[Any],
    *,
    overwrite: bool = False,
) -> list[dict[str, Any]]:
    """Ensure each entry has ``requirement_kind`` (classify when missing)."""
    out: list[dict[str, Any]] = []
    for req in requires or []:
        if not isinstance(req, dict):
            continue
        entry = dict(req)
        existing = str(entry.get("requirement_kind") or "").strip()
        if overwrite or existing not in REQUIREMENT_KINDS:
            entry["requirement_kind"] = classify_requirement_kind(
                str(entry.get("description_verbatim") or "")
            )
        out.append(entry)
    return out


def finalize_requires_devices(
    requires: list[Any],
    *,
    evidence: list[Any] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]] | None]:
    """OR-expand → exact dedupe → annotate kinds.

    When ``evidence`` is provided, remaps ``requires_devices[i]`` support paths
    and returns the rewritten evidence list; otherwise evidence is ``None``.
    """
    annotated_in = annotate_requirement_kinds(requires)
    expanded, old_to_new = expand_requirement_alternatives(annotated_in)
    out = annotate_requirement_kinds(expanded)
    if evidence is None:
        return out, None
    return out, rewrite_requires_evidence_paths(evidence, old_to_new)


def finalize_profile_requires(profile: dict[str, Any]) -> list[dict[str, str]]:
    """Normalize speaks needed_for, then OR-expand/dedupe; return warning flags."""
    if not isinstance(profile, dict):
        return []
    flags = normalize_speaks_needed_for(profile)
    requires, evidence = finalize_requires_devices(
        list(profile.get("requires_devices") or []),
        evidence=list(profile.get("evidence") or []),
    )
    profile["requires_devices"] = requires
    if evidence is not None:
        profile["evidence"] = evidence
    # Second expand pass is idempotent; re-normalize only if needed_for changed
    # after dedupe (noop). Collapse same desc/kind across former speaks→role.
    requires2, evidence2 = finalize_requires_devices(
        list(profile.get("requires_devices") or []),
        evidence=list(profile.get("evidence") or []),
    )
    profile["requires_devices"] = requires2
    if evidence2 is not None:
        profile["evidence"] = evidence2
    return flags
