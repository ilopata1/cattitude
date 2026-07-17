"""Stage 3 — content tier assignment (deterministic preview).

Guide-content tiers (operate → monitor → situational → emergency → reference)
are assigned from Stage 2 computed facts. Full Stage 3 will be a small LLM over
the same facts; this module is the offline / fixture stand-in used by the
vessel regression harness.
"""

from __future__ import annotations

from typing import Any

from system_graph import ComputedDevice, VesselGraphResult

CONTENT_TIERS = (
    "operate",
    "monitor",
    "situational",
    "emergency",
    "reference",
)


def assign_content_tiers(result: VesselGraphResult) -> dict[str, dict[str, Any]]:
    """Return ``{device_key: {tier, reasons, section}}`` for every device."""
    out: dict[str, dict[str, Any]] = {}
    for key, device in result.devices.items():
        tier, reasons = _tier_for(device, result)
        out[key] = {
            "tier": tier,
            "reasons": reasons,
            "section": device.section,
            "section_source": device.section_source,
            "role": device.role,
        }
    return out


def _tier_for(
    device: ComputedDevice, result: VesselGraphResult
) -> tuple[str, list[str]]:
    reasons: list[str] = []
    role = device.role
    actions = [
        a for a in (device.profile.get("operator_actions") or []) if isinstance(a, dict)
    ]
    safety = device.profile.get("safety_role") or {}
    daily_ops = [
        a
        for a in actions
        if a.get("context") == "daily" and a.get("audience") in {"operator", "either"}
    ]
    emergency = [
        a
        for a in actions
        if a.get("context") == "emergency"
        and a.get("audience") in {"operator", "either"}
    ]
    situational = [a for a in actions if a.get("context") == "situational"]

    if role == "PLATFORM":
        reasons.append("shared software platform UI → operate")
        return "operate", reasons

    if role == "HUB" and _has_station_ui(device):
        vflags = device.profile.get("validation_flags") or []
        config_defined = any(
            isinstance(f, dict) and f.get("flag") == "config_defined_operation"
            for f in vflags
        )
        if config_defined:
            reasons.append(
                "HUB with station UI → operate (config_defined_operation: "
                "guide sections gated on device_configuration / walkthrough)"
            )
        else:
            reasons.append("HUB with station UI → operate")
        return "operate", reasons

    if role == "BRIDGE" or (
        role == "PASSIVE"
        and not any(bool(safety.get(k)) for k in safety)
        and not actions
    ):
        reasons.append(f"{role} / non-interactive → reference")
        return "reference", reasons

    if role == "PASSIVE" and safety.get("is_protective_device"):
        reasons.append("passive protective hardware → emergency")
        return "emergency", reasons

    if safety.get("is_protective_device") and emergency:
        reasons.append("protective device with emergency actions → emergency")
        # Still allow monitor+emergency devices (MLI) to surface as monitor when
        # they also expose daily operator monitoring.
        if daily_ops and device.profile.get("data_roles", {}).get(
            "exposes_data_to_network"
        ):
            reasons.append("also daily monitor + telemetry → monitor (primary)")
            return "monitor", reasons
        return "emergency", reasons

    if daily_ops:
        reasons.append("daily operator actions → monitor")
        return "monitor", reasons

    if situational and not daily_ops:
        reasons.append("situational-only operator actions → situational")
        return "situational", reasons

    if emergency:
        reasons.append("emergency actions without daily use → emergency")
        return "emergency", reasons

    if role == "ISLAND":
        reasons.append("ISLAND fallback → monitor")
        return "monitor", reasons

    reasons.append("default reference")
    return "reference", reasons


def _has_station_ui(device: ComputedDevice) -> bool:
    """Operate-station UI (touchscreen / dedicated station remote), not phone apps."""
    return any(
        s.get("active")
        and s.get("surface") in {"touchscreen", "web_interface"}
        for s in device.active_surfaces
    )
