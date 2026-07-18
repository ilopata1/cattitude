"""Apply vessel_artifact facts onto catalog profiles before Stage 2 roles.

Vessel facts cite commissioning drawings / topology / owner inventory — not
manual extraction. Used when the catalog profile under-states network membership
or hub data roles (e.g. Touch 7 CZone membership + displays_data).

Config-layer subclasses (tier 4):
  - ``device_configuration`` — vendor machine artifacts (``.zcf``); parsers OK
  - ``channel_map`` — builder documentation (human-readable circuit shadow);
    adjudicated LLM extract against ``channel_map_schema`` only — never
    per-builder parsers (see equipment-classification-spec-v4.12)
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

# Tier-4 config-layer source classes (content provenance).
CONFIG_LAYER_SOURCE_CLASSES = frozenset(
    {
        "device_configuration",
        "channel_map",
    }
)


def apply_vessel_artifact_facts(
    profiles: dict[str, dict[str, Any]],
    facts: list[dict[str, Any]] | None,
) -> dict[str, dict[str, Any]]:
    """Return new profiles dict with vessel_artifact assertions applied."""
    out = {k: deepcopy(v) for k, v in profiles.items()}
    for row in facts or []:
        if not isinstance(row, dict):
            continue
        key = str(row.get("device_key") or "").strip()
        if not key or key not in out:
            continue
        profile = out[key]
        applied: list[dict[str, Any]] = list(profile.get("vessel_artifact_facts") or [])
        for assertion in row.get("assertions") or []:
            if not isinstance(assertion, dict):
                continue
            kind = str(assertion.get("kind") or "").strip()
            source = str(assertion.get("source") or "vessel_artifact")
            if kind == "network_speak":
                name = str(assertion.get("name_verbatim") or "").strip()
                if not name:
                    continue
                nets = dict(profile.get("networks") or {})
                speaks = [
                    dict(s)
                    for s in (nets.get("speaks") or [])
                    if isinstance(s, dict)
                ]
                existing = {
                    str(s.get("name_verbatim") or "").strip().lower() for s in speaks
                }
                if name.lower() not in existing:
                    speaks.append(
                        {
                            "name_verbatim": name,
                            "physical_or_wireless": assertion.get(
                                "physical_or_wireless"
                            )
                            or "wired",
                            "edge_provenance": "commissioning_artifact",
                            "vessel_artifact_source": source,
                        }
                    )
                    nets["speaks"] = speaks
                    profile["networks"] = nets
                    applied.append(
                        {
                            "kind": kind,
                            "name_verbatim": name,
                            "source": source,
                        }
                    )
            elif kind == "data_role":
                field = str(assertion.get("field") or "").strip()
                if field not in {
                    "exposes_data_to_network",
                    "displays_data_from_other_devices",
                    "controllable_from_network",
                }:
                    continue
                roles = dict(profile.get("data_roles") or {})
                roles[field] = bool(assertion.get("value"))
                profile["data_roles"] = roles
                applied.append(
                    {
                        "kind": kind,
                        "field": field,
                        "value": roles[field],
                        "source": source,
                    }
                )
        if applied:
            profile["vessel_artifact_facts"] = applied
        out[key] = profile
    return out


def vessel_has_hub_operation_source(equipment_doc: dict[str, Any] | None) -> bool:
    """True when a device_configuration or owner walkthrough source is present."""
    doc = equipment_doc or {}
    for row in doc.get("hub_operation_sources") or []:
        if not isinstance(row, dict):
            continue
        kind = str(row.get("source_class") or row.get("kind") or "").strip().lower()
        if kind in {
            "device_configuration",
            "owner_screen_walkthrough",
            "owner_walkthrough",
        }:
            return True
    for row in doc.get("content_sources") or []:
        if not isinstance(row, dict):
            continue
        kind = str(row.get("source_class") or "").strip().lower()
        if kind in {"device_configuration", "owner_screen_walkthrough"}:
            return True
    return False


def vessel_confirmed_platform_versions(
    equipment_doc: dict[str, Any] | None,
) -> set[str]:
    """Platform keys whose documented_version is confirmed on this vessel."""
    doc = equipment_doc or {}
    out: set[str] = set()
    for row in doc.get("platform_version_confirmations") or []:
        if not isinstance(row, dict):
            continue
        pk = str(row.get("platform_key") or "").strip()
        if pk and (
            row.get("confirmed") is True
            or str(row.get("confirmed_version") or "").strip()
            or str(row.get("source") or "").strip()
        ):
            out.add(pk)
    return out
