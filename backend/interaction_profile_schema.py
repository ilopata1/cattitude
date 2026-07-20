"""Interaction profile schema (Stage 1) — allowed keys, JSON Schema, path helpers.

``needed_for`` may reference **any** profile field path (control surfaces,
data_roles capabilities, etc.). Conditional capabilities are resolved in Stage 2.
"""

from __future__ import annotations

import re
from typing import Any

# ---------------------------------------------------------------------------
# Allowed keys (additionalProperties: false at every object level)
# ---------------------------------------------------------------------------

DEVICE_KEYS = frozenset({"manufacturer", "model", "category_freeform"})

# Catalog entity kind — physical device (default) vs shared software platform.
ENTITY_KINDS = frozenset({"device", "platform"})

RUNS_PLATFORM_KEYS = frozenset(
    {
        "platform_key",
        "host_kind",
        "optional",
        "note",
    }
)

CONTROL_SURFACE_KEYS = frozenset(
    {
        "surface",
        "location_class",
        "optional_accessory",
        "label_verbatim",
        "path",
        "vote_margin",
    }
)

OPERATOR_ACTION_KEYS = frozenset(
    {
        "action",
        "audience",
        "context",
        "options",
        # Stage 4 / field-pack: when/why for guest instructions (optional)
        "occasion",
        # Stage 1.6 provenance (code-added; not emitted by extraction schema)
        "source",
        "derived_from",
        # Stage 1 stability (code-added on voted items)
        "vote_margin",
        "deterministic_fill",
    }
)

NETWORK_SPEAK_KEYS = frozenset(
    {
        "name_verbatim",
        "physical_or_wireless",
        "vote_margin",
        # Stage 2 / vessel overlays
        "edge_provenance",
        "vessel_artifact_source",
        "derived_from",
        "counterpart_note",
    }
)
NETWORK_BRIDGE_KEYS = frozenset({"from", "to"})
NETWORK_KEYS = frozenset({"speaks", "bridges"})

DATA_ROLE_KEYS = frozenset(
    {
        "exposes_data_to_network",
        "displays_data_from_other_devices",
        "controllable_from_network",
    }
)

REQUIREMENT_KINDS = frozenset(
    {
        "device",
        "cable_or_consumable",
        "software_app",
        "commissioning_tool",
    }
)

REQUIRES_DEVICE_KEYS = frozenset(
    {
        "description_verbatim",
        "needed_for",
        "requirement_kind",
        # Stage 1.5/1.6 provenance (code-added)
        "source",
        "derived_from",
        # Stage 1 stability + needed_for normalize (code-added)
        "vote_margin",
        "needed_for_normalized_from",
        # Platform ui_page gate expansion (code-added)
        "functional_class",
        "gate_verbatim",
    }
)

UI_PAGE_KEYS = frozenset(
    {
        "name",
        "purpose",
        "appears_if_gate",
        "actions",
    }
)

UI_PAGE_GATE_KEYS = frozenset(
    {
        "verbatim",
        "description_verbatim",
        "functional_class",
    }
)

UI_PAGE_ACTION_KEYS = frozenset(
    {
        "action",
        "audience",
        "context",
        "occasion",
        "source",
    }
)

ALARM_SEVERITY_KEYS = frozenset(
    {
        "level_verbatim",
        "color_verbatim",
    }
)

SAFETY_ROLE_KEYS = frozenset(
    {
        "is_protective_device",
        "has_manual_override",
        "has_emergency_procedure",
    }
)

DESC_ITEM_KEYS = frozenset(
    {
        "description_verbatim",
        "source",
        "derived_from",
        "vote_margin",
    }
)

EVIDENCE_KEYS = frozenset({"supports_field", "manual_section", "note"})

CONFIDENCE_KEYS = frozenset({"overall", "notes"})

PROFILE_KEYS = frozenset(
    {
        "device",
        "control_surfaces",
        "operator_actions",
        "networks",
        "data_roles",
        "requires_devices",
        "safety_role",
        "protected_by",
        "protects",
        "supply_requirements",
        "evidence",
        "confidence",
        # Multi-select document genres (Stage 1 / 1.5)
        "genres",
        # Catalog entity kind + platform linkage (v4.6 / v4.7)
        "entity_kind",
        "documented_version",
        "runs_platform",
        "ui_pages",
        "alarm_severity",
        # Device surface consolidate audit (v4.22)
        "demoted_ui_pages",
        # Vessel overlays applied in Stage 2 (annotation)
        "vessel_artifact_facts",
        # Stage 1.5 annotation (added by validator; not from extraction)
        "validation_flags",
        "needs_rextraction",
        "repairs",
        "coverage",
        "group_utilization",
        "merge_conflicts",
        "extraction_votes",
        "instability_triage",
        # Cross-model adjudication (code/audit)
        "cross_model_diff",
        "extraction_pending_review",
        "source",
        # Field-pack migration epoch (v4.19+)
        "profile_schema_version",
    }
)

# Keys allowed on an *extracted* profile (validator treats these as unknown if present
# before annotation).
EXTRACTED_PROFILE_KEYS = PROFILE_KEYS - {
    "validation_flags",
    "needs_rextraction",
    "repairs",
    "coverage",
    "group_utilization",
    "merge_conflicts",
    "extraction_votes",
    "instability_triage",
    "vessel_artifact_facts",
    "demoted_ui_pages",
}

# Internal taxonomy tokens — never valid as category_freeform.
SYSTEM_CATEGORY_TOKENS = frozenset(
    {
        "propulsion",
        "fuel_system",
        "electrical_dc",
        "electrical_ac_shore_power",
        "freshwater_system",
        "sanitation",
        "bilge_and_drainage",
        "steering",
        "anchoring_ground_tackle",
        "rigging_sail_handling",
        "sails",
        "navigation_electronics",
        "communications",
        "refrigeration_galley",
        "hvac_climate",
        "safety_equipment",
        "tenders_davits",
        "stabilisation",
        "entertainment_connectivity",
        "hull_and_structure",
    }
)

# Legacy safety keys seen in early spike output — reject as unknown_field.
LEGACY_SAFETY_KEYS = frozenset({"is_emergency_control", "can_isolate_power"})

_PATH_SEGMENT = re.compile(r"([A-Za-z_][A-Za-z0-9_]*)(?:\[(\d+)\])?")


def parse_field_path(path: str) -> list[tuple[str, int | None]]:
    """Parse ``control_surfaces[0].optional_accessory`` into segments."""
    path = (path or "").strip()
    if not path:
        return []
    segments: list[tuple[str, int | None]] = []
    for part in path.split("."):
        part = part.strip()
        if not part:
            return []
        match = _PATH_SEGMENT.fullmatch(part)
        if not match:
            return []
        name, index_s = match.group(1), match.group(2)
        segments.append((name, int(index_s) if index_s is not None else None))
    return segments


def resolve_field_path(
    profile: dict[str, Any], path: str
) -> tuple[bool, Any, str | None]:
    """Return (ok, value, error_detail)."""
    segments = parse_field_path(path)
    if not segments:
        return False, None, "empty or malformed path"
    cur: Any = profile
    walked: list[str] = []
    for name, index in segments:
        walked.append(f"{name}[{index}]" if index is not None else name)
        if not isinstance(cur, dict) or name not in cur:
            return False, None, f"missing {'.'.join(walked)}"
        cur = cur[name]
        if index is not None:
            if not isinstance(cur, list):
                return False, None, f"not a list at {'.'.join(walked)}"
            if index < 0 or index >= len(cur):
                return False, None, f"index out of range at {'.'.join(walked)}"
            cur = cur[index]
    return True, cur, None


def set_field_path(profile: dict[str, Any], path: str, value: Any) -> bool:
    """Set a value at path; return False if path does not resolve to a parent."""
    segments = parse_field_path(path)
    if not segments:
        return False
    cur: Any = profile
    for name, index in segments[:-1]:
        if not isinstance(cur, dict) or name not in cur:
            return False
        cur = cur[name]
        if index is not None:
            if not isinstance(cur, list) or index < 0 or index >= len(cur):
                return False
            cur = cur[index]
    last_name, last_index = segments[-1]
    if last_index is None:
        if not isinstance(cur, dict):
            return False
        cur[last_name] = value
        return True
    if not isinstance(cur, dict) or last_name not in cur:
        return False
    lst = cur[last_name]
    if not isinstance(lst, list) or last_index < 0 or last_index >= len(lst):
        return False
    lst[last_index] = value
    return True


def path_points_at_control_surface(path: str) -> bool:
    segments = parse_field_path(path)
    return (
        len(segments) >= 1
        and segments[0][0] == "control_surfaces"
        and segments[0][1] is not None
        and (len(segments) == 1 or (len(segments) == 2 and segments[1][0] == "path"))
    )


def control_surface_index_from_path(path: str) -> int | None:
    segments = parse_field_path(path)
    if not segments or segments[0][0] != "control_surfaces":
        return None
    return segments[0][1]


# ---------------------------------------------------------------------------
# Strict JSON Schema for structured extraction (additionalProperties: false)
# ---------------------------------------------------------------------------

_STRING = {"type": "string"}
_BOOL = {"type": "boolean"}


def _obj(properties: dict[str, Any], required: list[str] | None = None) -> dict[str, Any]:
    props = dict(properties)
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": props,
        "required": required if required is not None else list(props.keys()),
    }


INTERACTION_PROFILE_JSON_SCHEMA: dict[str, Any] = _obj(
    {
        "device": _obj(
            {
                "manufacturer": _STRING,
                "model": _STRING,
                "category_freeform": _STRING,
            }
        ),
        "entity_kind": _STRING,
        "documented_version": _STRING,
        "ui_pages": {
            "type": "array",
            "items": _obj(
                {
                    "name": _STRING,
                    "purpose": _STRING,
                    "appears_if_gate": _obj(
                        {
                            "verbatim": _STRING,
                            "description_verbatim": _STRING,
                            "functional_class": _STRING,
                        }
                    ),
                    "actions": {
                        "type": "array",
                        "items": _obj(
                            {
                                "action": _STRING,
                                "audience": _STRING,
                                "context": _STRING,
                                "occasion": _STRING,
                            }
                        ),
                    },
                }
            ),
        },
        "alarm_severity": {
            "type": "array",
            "items": _obj(
                {
                    "level_verbatim": _STRING,
                    "color_verbatim": _STRING,
                }
            ),
        },
        "control_surfaces": {
            "type": "array",
            "items": _obj(
                {
                    "surface": _STRING,
                    "location_class": _STRING,
                    "optional_accessory": _BOOL,
                    "label_verbatim": _STRING,
                    "path": _STRING,
                }
            ),
        },
        "operator_actions": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "action": _STRING,
                    "audience": _STRING,
                    "context": _STRING,
                    "options": {"type": "array", "items": _STRING},
                    "occasion": _STRING,
                },
                "required": ["action", "audience", "context"],
            },
        },
        "networks": _obj(
            {
                "speaks": {
                    "type": "array",
                    "items": _obj(
                        {
                            "name_verbatim": _STRING,
                            "physical_or_wireless": _STRING,
                        }
                    ),
                },
                "bridges": {
                    "type": "array",
                    "items": _obj({"from": _STRING, "to": _STRING}),
                },
            }
        ),
        "data_roles": _obj(
            {
                "exposes_data_to_network": _BOOL,
                "displays_data_from_other_devices": _BOOL,
                "controllable_from_network": _BOOL,
            }
        ),
        "requires_devices": {
            "type": "array",
            "items": _obj(
                {
                    "description_verbatim": _STRING,
                    # Non-empty profile field path, e.g. control_surfaces[0] or
                    # data_roles.exposes_data_to_network
                    "needed_for": _STRING,
                    # device | cable_or_consumable | software_app | commissioning_tool
                    "requirement_kind": _STRING,
                }
            ),
        },
        "safety_role": _obj(
            {
                "is_protective_device": _BOOL,
                "has_manual_override": _BOOL,
                "has_emergency_procedure": _BOOL,
            }
        ),
        "protected_by": {
            "type": "array",
            "items": _obj({"description_verbatim": _STRING}),
        },
        "protects": {
            "type": "array",
            "items": _obj({"description_verbatim": _STRING}),
        },
        "supply_requirements": {
            "type": "array",
            "items": _obj({"description_verbatim": _STRING}),
        },
        "evidence": {
            "type": "array",
            "items": _obj(
                {
                    "supports_field": _STRING,
                    "manual_section": _STRING,
                    "note": _STRING,
                }
            ),
        },
        "confidence": _obj(
            {
                "overall": {"type": "number"},
                "notes": _STRING,
            }
        ),
    },
    required=[
        "device",
        "control_surfaces",
        "operator_actions",
        "networks",
        "data_roles",
        "requires_devices",
        "safety_role",
        "protected_by",
        "protects",
        "supply_requirements",
        "evidence",
        "confidence",
        "entity_kind",
        "documented_version",
        "ui_pages",
        "alarm_severity",
    ],
)
