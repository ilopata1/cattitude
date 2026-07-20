"""Stage 2 — deterministic vessel system graph from interaction profiles.

Pure functions only. No LLM. Not wired into ``generate_module`` yet.

Pipeline steps:
  2.1 network name normalization
  2.2 accessory / dependency resolution
  2.3 graph + role classification
  2.4 control paths
  2.5 structural flags
  2.6 guide section assignment (keyword lookup → SYSTEM_IDS)
  2.7 cross-references (control / protection / power_dependency)

See ``guide-pipeline-plan.md`` and ``fixtures/pipeline/outremer/``.
"""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from interaction_profile import normalize_profile
from interaction_profile_kinds import (
    classify_requirement_kind,
    split_requirement_alternatives,
)
from interaction_profile_schema import (
    control_surface_index_from_path,
    resolve_field_path,
    set_field_path,
)

NETWORK_ALIASES: dict[str, str] = {
    "masterbus": "MASTERBUS",
    "czone": "CZONE",
    "nmea 2000": "NMEA2000",
    "nmea2000": "NMEA2000",
    "n2k": "NMEA2000",
    "ve.direct": "VEDIRECT",
    "ve direct": "VEDIRECT",
    "ve.can": "VECAN",
    "bluetooth": "BLUETOOTH",
    "ble": "BLUETOOTH",
    "can": "CAN",
    "canbus": "CAN",
    "wifi": "WIFI",
    "wi-fi": "WIFI",
    "wlan": "WIFI",
    "ethernet": "ETHERNET",
    "usb": "USB",
    "usb2.0": "USB",
    "usb 2.0": "USB",
}

# Map to existing Know chapter ids (SYSTEM_IDS) — do not invent a parallel taxonomy.
SECTION_LOOKUP: dict[str, tuple[str, ...]] = {
    "batteries": (
        "battery",
        "bms",
        "lithium",
        "charger",
        "inverter",
        "combi",
        "multiplus",
        "alternator",
        "regulator",
        "solar",
        "mppt",
        "smartsolar",
        "wind generator",
        "silentwind",
        "shore power",
        "genset",
        "generator",
        "dc-dc",
        "fuel cell",
        "mli",
        "alpha pro",
        "alpha",
        "alternator regulator",
    ),
    "controls": (
        "touch 7",
        "touch 10",
        "czone touch",
        "czone 2.0",
        "czone 2",
    ),
    "electrical": (
        "busbar",
        "fuse",
        "breaker",
        "battery switch",
        "ml switch",
        "acr",
        "charging relay",
        "automatic charging",
        "digital switching",
        "output interface",
        "distribution",
        "isolation",
        "galvanic",
        "class t",
        "coi",
        "masterbus-czone",
        "masterbus bridge",
        "usb interface",
        "panel",
    ),
    "nav": (
        "chartplotter",
        "mfd",
        "autopilot",
        "radar",
        "ais",
        "vhf",
        "instrument",
        "compass",
        "gps",
        "sonar",
        "depth",
        "wind sensor",
        "nmea display",
        "zeus",
    ),
    "water": (
        "watermaker",
        "desalinator",
        "fresh water pump",
        "accumulator",
        "water heater",
        "calorifier",
        "tank sender",
        "bilge pump",
        "water filter",
    ),
    "engines": (
        "engine",
        "saildrive",
        "gearbox",
        "throttle",
        "propeller",
        "fuel filter",
        "fuel pump",
        "exhaust",
        "raw water",
    ),
    "sails": (
        "winch",
        "furler",
        "mast",
        "boom",
        "vang",
        "sail",
        "halyard",
        "traveller",
        "hydraulic rig",
        "bowsprit",
    ),
    "anchoring": (
        "windlass",
        "anchor",
        "chain counter",
        "rode",
        "bridle",
    ),
    "safety": (
        "life raft",
        "epirb",
        "plb",
        "pfd",
        "lifejacket",
        "flare",
        "fire extinguisher",
        "fire suppression",
        "mob",
        "gas detector",
        "co detector",
        "smoke",
    ),
    "heads": (
        "toilet",
        "head",
        "holding tank",
        "macerator",
        "waste",
        "grey water",
    ),
    "galley": (
        "stove",
        "hob",
        "oven",
        "refrigerator",
        "fridge",
        "freezer",
        "icemaker",
        "microwave",
        "dishwasher",
        "induction",
    ),
    "ac": (
        "air conditioning",
        "aircon",
        "heater",
        "heating",
        "diesel heater",
        "ventilation",
        "dehumidifier",
    ),
    "dinghy": (
        "tender",
        "dinghy",
        "outboard",
        "davit",
        "swim platform",
        "passerelle",
        "crane",
    ),
}

_STATION_SURFACES = frozenset(
    {
        "touchscreen",
        "remote_panel_accessory",
        "mobile_app_wifi_cloud",
        "web_interface",
    }
)
# Surfaces that can mark a vessel HUB (command station). Monitoring-only
# remote panels on batteries/chargers must not create a second HUB merely
# because they share a network with a controllable ENDPOINT.
_HUB_STATION_SURFACES = frozenset(
    {
        "touchscreen",
        "mobile_app_wifi_cloud",
        "web_interface",
    }
)
# UI that can define an ISLAND when the device cannot reach a hub.
_ISLAND_SURFACES = _STATION_SURFACES | frozenset({"mobile_app_bluetooth"})
_OPERATOR_CONTEXTS = frozenset({"daily", "situational"})
_OPERATOR_AUDIENCES = frozenset({"operator", "either"})


def _has_island_ui(device: ComputedDevice) -> bool:
    """Standalone operator UX — not bare emergency/physical protectives."""
    if any(
        s.get("active") and s.get("surface") in _ISLAND_SURFACES
        for s in device.active_surfaces
    ):
        return True
    has_physical = any(
        s.get("active") and s.get("surface") == "physical_controls"
        for s in device.active_surfaces
    )
    if not has_physical:
        return False
    return any(
        a.get("context") in _OPERATOR_CONTEXTS
        and a.get("audience") in _OPERATOR_AUDIENCES
        for a in (device.profile.get("operator_actions") or [])
    )

_LOW_CONFIDENCE = 0.6
_SECTION_SCORE_MARGIN = 0.0  # equal top scores → section_low_margin


@dataclass
class ControlPath:
    target: str
    taught_via: str
    fallback_surfaces: list[str] = field(default_factory=list)
    edge_provenance_weakest: str | None = None
    edge_provenance_tiers: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "target": self.target,
            "taught_via": self.taught_via,
            "fallback_surfaces": list(self.fallback_surfaces),
        }
        if self.edge_provenance_weakest:
            d["edge_provenance_weakest"] = self.edge_provenance_weakest
        if self.edge_provenance_tiers:
            d["edge_provenance_tiers"] = list(self.edge_provenance_tiers)
        return d


@dataclass
class ComputedDevice:
    device_key: str
    line_item: dict[str, Any]
    profile: dict[str, Any]
    role: str = "ENDPOINT"
    section: str | None = None
    section_source: str = "unassigned"
    section_flag: str | None = None
    active_surfaces: list[dict[str, Any]] = field(default_factory=list)
    resolved_requires: list[dict[str, Any]] = field(default_factory=list)
    normalized_speaks: list[str] = field(default_factory=list)
    normalized_bridges: list[tuple[str, str]] = field(default_factory=list)
    # Parallel provenance for each speak / bridge edge (same order).
    speak_provenances: list[str] = field(default_factory=list)
    bridge_provenances: list[str] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)


@dataclass
class CrossRef:
    kind: str
    in_section: str
    to_device: str
    note: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "in_section": self.in_section,
            "to_device": self.to_device,
            "note": self.note,
        }


@dataclass
class VesselGraphResult:
    devices: dict[str, ComputedDevice]
    control_paths: list[ControlPath]
    cross_references: list[CrossRef]
    flags: list[dict[str, Any]]
    network_components: dict[str, str]  # normalized net → root component id
    relations: list[dict[str, Any]] = field(default_factory=list)

    def summary(self) -> dict[str, Any]:
        return {
            "roles": {k: d.role for k, d in self.devices.items()},
            "sections": {
                k: {
                    "value": d.section,
                    "source": d.section_source,
                    "flag": d.section_flag,
                }
                for k, d in self.devices.items()
            },
            "control_paths": [p.as_dict() for p in self.control_paths],
            "cross_references": [x.as_dict() for x in self.cross_references],
            "relations": list(self.relations),
            "flags": list(self.flags),
            "active_surfaces": {
                k: [
                    {
                        "path": s.get("path"),
                        "surface": s.get("surface"),
                        "active": s.get("active"),
                    }
                    for s in d.active_surfaces
                ]
                for k, d in self.devices.items()
            },
        }


def normalize_network_name(name_verbatim: str) -> str:
    key = name_verbatim.strip().lower()
    if not key:
        return "UNKNOWN:"
    return NETWORK_ALIASES.get(key, f"UNKNOWN:{key}")


def _tokens(text: str) -> set[str]:
    return {t for t in "".join(ch if ch.isalnum() else " " for ch in text.lower()).split() if t}


_FUZZY_STOPWORDS = frozenset(
    {
        "a",
        "an",
        "the",
        "and",
        "or",
        "device",
        "unit",
        "module",
        "system",
        "cable",
        "digital",
        "output",
        "input",
        "remote",
        "panel",
        "control",
        "display",
        "tool",
        "configuration",
    }
)


def _split_description_alternatives(description: str) -> list[str]:
    """Split ``GX device or GlobalLink 520`` / comma lists into alternatives."""
    return split_requirement_alternatives(description)


def _content_tokens(text: str) -> set[str]:
    return {t for t in _tokens(text) if t not in _FUZZY_STOPWORDS and len(t) >= 2}


def _fuzzy_match_one(
    description: str,
    equipment: list[dict[str, Any]],
    *,
    exclude_keys: set[str],
) -> bool:
    return _resolve_match_one(description, equipment, exclude_keys=exclude_keys) is not None


# Curated family membership for resolver tier 2 (exact family → equipment cues).
# No token-subset / overlap fallback — membership must be declared here.
FAMILY_ALIASES: list[dict[str, Any]] = [
    {
        "family_id": "victron_gx",
        "req_phrases": ("gx device", "cerbo gx", "venus gx", "octopus gx"),
        "equipment_tokens": (
            "cerbo",
            "gx device",
            "venus",
            "octopus gx",
            "cerbo gx",
        ),
    },
    {
        "family_id": "victron_globallink",
        "req_phrases": ("globallink 520", "global link 520", "globallink"),
        "equipment_tokens": ("globallink", "global link"),
    },
    {
        "family_id": "mastervolt_charger",
        "req_phrases": (
            "mastervolt battery charger",
            "mastervolt charger",
            "mass combi",
        ),
        "equipment_tokens": ("mass combi", "combi pro", "charge master"),
    },
    {
        "family_id": "blue_sea_ml",
        "req_phrases": ("ml-series", "ml series", "blue sea ml"),
        "equipment_tokens": ("ml-series", "ml series", "ml switch"),
    },
]


def _family_alias_match(
    description: str,
    equipment: list[dict[str, Any]],
    *,
    exclude_keys: set[str],
) -> dict[str, Any] | None:
    """Tier 2: curated FAMILY_ALIASES membership only."""
    desc_l = (description or "").strip().lower()
    if not desc_l:
        return None
    for fam in FAMILY_ALIASES:
        if not any(p in desc_l for p in fam["req_phrases"]):
            continue
        for row in equipment:
            key = str(row.get("device_key") or "")
            if key in exclude_keys:
                continue
            hay = _equipment_hay(row)
            if any(tok in hay for tok in fam["equipment_tokens"]):
                return {
                    "device_key": key,
                    "resolution_tier": 2,
                    "evidence": (
                        f"tier2 family {fam['family_id']}: requirement "
                        f"{description!r} → {row.get('manufacturer')} "
                        f"{row.get('model')}"
                    ),
                }
    return None


# Capability-class synonyms for resolver tier 3 (generic wording → list device).
_RESOLVER_CLASSES: list[dict[str, Any]] = [
    {
        "class_id": "external_safety_relay",
        "functional_class": "power_disconnect",
        "req_triggers": (
            "safety relay",
            "external safety relay",
            "battery safety relay",
            "contactor",
        ),
        # Prefer remote-commandable isolation switches (ML-Series), not
        # passive lugs/busbars, fuse holders, or plain local-only switches.
        "target_model_tokens": ("ml-series", "ml series", "ml switch"),
        "target_desc_tokens": ("battery switch", "isolation", "ml switch"),
        "require_remote_command": True,
        "near_miss_tokens": (
            "battery switch",
            "isolation switch",
            "safety relay",
            "contactor",
            "fuse holder",
            "class t",
            "busbar",
        ),
    },
    {
        "class_id": "class_t_fuse",
        "functional_class": "overcurrent_protection",
        "req_triggers": ("class t", "t-fuse", "t fuse", "battery fuse"),
        "target_model_tokens": ("class t", "t-fuse"),
        "target_desc_tokens": ("class t", "fuse holder", "fuse"),
        "require_remote_command": False,
        "near_miss_tokens": ("fuse", "class t"),
    },
]

# Tier-3 accept cutoff (scores forced below this when hard criteria fail).
_TIER3_ACCEPT_THRESHOLD = 0.7


def _equipment_hay(row: dict[str, Any]) -> str:
    return " ".join(
        str(row.get(k) or "")
        for k in ("manufacturer", "model", "description", "device_key")
    ).lower()


def _has_remote_command_path(
    row: dict[str, Any],
    profile: dict[str, Any] | None,
) -> bool:
    """True when the device can be commanded remotely (network / remote surface).

    Local-only rotary / on-device switches do not qualify even with
    has_manual_override / isolation capability.
    """
    if isinstance(profile, dict):
        roles = profile.get("data_roles") or {}
        if roles.get("controllable_from_network"):
            return True
        networks = profile.get("networks") or {}
        if networks.get("speaks") or networks.get("bridges"):
            return True
        for surface in profile.get("control_surfaces") or []:
            if not isinstance(surface, dict):
                continue
            if surface.get("location_class") in {"remote_wired", "wireless"} and (
                surface.get("active", True) is not False
            ):
                return True
        return False
    # No profile: only ML-family equipment hints imply remote coil / BMS path.
    hay = _equipment_hay(row)
    return any(t in hay for t in ("ml-series", "ml series", "ml switch"))


def _is_switch_or_relay_disconnect(
    row: dict[str, Any],
    profile: dict[str, Any] | None,
) -> bool:
    """Power-disconnect switch/relay (not a fuse holder or busbar)."""
    hay = _equipment_hay(row)
    if any(t in hay for t in ("fuse", "class t")) and not any(
        t in hay for t in ("switch", "relay", "contactor", "ml-series", "ml series")
    ):
        return False
    if "busbar" in hay and "switch" not in hay:
        return False
    # Require switch/relay language on the equipment line — presence of any
    # control surface alone must not classify e.g. wind controllers as disconnects.
    # Word boundaries so "digital switching" (Touch / CZone UI) is not a disconnect.
    return bool(
        re.search(
            r"\b(switch|relay|contactor|isolation|ml-series|ml series)\b",
            hay,
            flags=re.IGNORECASE,
        )
    )


def _tier3_score_candidate(
    cls: dict[str, Any],
    row: dict[str, Any],
    profiles: dict[str, dict[str, Any]] | None,
) -> dict[str, Any] | None:
    """Score a tier-3 candidate; return None if it is not a near-miss for this class."""
    key = str(row.get("device_key") or "")
    profile = (profiles or {}).get(key) if profiles else None
    if profile is not None and not isinstance(profile, dict):
        profile = None
    hay = _equipment_hay(row)
    model_hit = any(t in hay for t in cls["target_model_tokens"])
    desc_hit = any(t in hay for t in cls["target_desc_tokens"])
    near_hit = any(t in hay for t in cls.get("near_miss_tokens") or ())
    switch_like = _is_switch_or_relay_disconnect(row, profile)
    if not (model_hit or desc_hit or near_hit or switch_like):
        return None

    failed: list[str] = []
    score = 0.0
    if model_hit:
        score += 0.4
    elif desc_hit:
        score += 0.35
    elif switch_like:
        score += 0.25
    elif near_hit:
        score += 0.15

    if cls.get("require_remote_command"):
        if switch_like:
            score += 0.2
        else:
            failed.append("protective but not a switch")
            score = min(score, 0.45)
        if _has_remote_command_path(row, profile):
            score += 0.4
        else:
            failed.append("no remote command path")
            score = min(score, 0.45)
    else:
        if model_hit or desc_hit:
            score += 0.4

    score = round(min(score, 1.0), 3)
    accepted = score >= _TIER3_ACCEPT_THRESHOLD and not failed
    return {
        "device_key": key,
        "class_id": cls["class_id"],
        "functional_class": cls.get("functional_class"),
        "score": score,
        "threshold": _TIER3_ACCEPT_THRESHOLD,
        "failed_criteria": failed,
        "accepted": accepted,
        "manufacturer": row.get("manufacturer"),
        "model": row.get("model"),
    }


def _resolve_match_one(
    description: str,
    equipment: list[dict[str, Any]],
    *,
    exclude_keys: set[str],
    profiles: dict[str, dict[str, Any]] | None = None,
    rejected_out: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    """Return best match ``{device_key, resolution_tier, evidence}`` or None.

    Tiers:
      1 — manufacturer+model (or model) literal appears in the requirement text
      2 — curated FAMILY_ALIASES membership only (no token-subset fallback)
      3 — capability-class synonym (e.g. \"safety relay\" → Blue Sea ML-Series)

    When ``rejected_out`` is provided, tier-3 near-misses that fail hard criteria
    (or score below threshold) are appended for unresolved / nearest-miss reports.
    """
    desc = (description or "").strip()
    if not desc:
        return None
    desc_l = desc.lower()

    # Tier 1: model / manufacturer+model literal.
    for row in equipment:
        key = str(row.get("device_key") or "")
        if key in exclude_keys:
            continue
        model = str(row.get("model") or "").strip()
        mfr = str(row.get("manufacturer") or "").strip()
        if model and len(model) >= 3 and model.lower() in desc_l:
            evidence = f"tier1 model literal {model!r} in requirement"
            return {
                "device_key": key,
                "resolution_tier": 1,
                "evidence": evidence,
            }
        # Tier-1 light: distinctive multi-word model lead (e.g. "Class T") in text.
        model_l = model.lower()
        if model_l.startswith("class t") and "class t" in desc_l:
            return {
                "device_key": key,
                "resolution_tier": 1,
                "evidence": "tier1 Class T lead in requirement",
            }
        if model_l.startswith("ml-") and ("ml-series" in desc_l or "ml series" in desc_l):
            return {
                "device_key": key,
                "resolution_tier": 1,
                "evidence": "tier1 ML-Series lead in requirement",
            }
        combo = f"{mfr} {model}".strip().lower()
        if mfr and model and len(combo) >= 5 and combo in desc_l:
            return {
                "device_key": key,
                "resolution_tier": 1,
                "evidence": f"tier1 manufacturer+model {combo!r}",
            }

    # Tier 2: curated FAMILY_ALIASES only (no token-subset / overlap).
    fam_hit = _family_alias_match(
        desc, equipment, exclude_keys=exclude_keys
    )
    if fam_hit is not None:
        return fam_hit

    # Tier 3: capability-class synonyms with remote-command / switch filters.
    best_accept: dict[str, Any] | None = None
    for cls in _RESOLVER_CLASSES:
        if not any(trig in desc_l for trig in cls["req_triggers"]):
            continue
        for row in equipment:
            key = str(row.get("device_key") or "")
            if key in exclude_keys:
                continue
            scored = _tier3_score_candidate(cls, row, profiles)
            if scored is None:
                continue
            if scored["accepted"]:
                if best_accept is None or float(scored["score"]) > float(
                    best_accept["score"]
                ):
                    best_accept = scored
            elif rejected_out is not None:
                rejected_out.append(
                    {
                        "device_key": scored["device_key"],
                        "class_id": scored["class_id"],
                        "functional_class": scored.get("functional_class"),
                        "score": scored["score"],
                        "threshold": scored["threshold"],
                        "failed_criteria": list(scored["failed_criteria"]),
                        "reason": "; ".join(scored["failed_criteria"])
                        or "tier3 score below threshold",
                    }
                )
        if best_accept is not None:
            return {
                "device_key": best_accept["device_key"],
                "resolution_tier": 3,
                "evidence": (
                    f"tier3 class {best_accept['class_id']}: requirement {desc!r} → "
                    f"{best_accept.get('manufacturer')} {best_accept.get('model')} "
                    f"(score={best_accept['score']})"
                ),
                "resolution_score": best_accept["score"],
            }
    return None


def _fuzzy_present(
    description: str,
    equipment: list[dict[str, Any]],
    *,
    exclude_keys: set[str] | None = None,
    profiles: dict[str, dict[str, Any]] | None = None,
) -> bool:
    """Conservative match; ``or`` / comma alternatives succeed if any matches."""
    excluded = exclude_keys or set()
    alternatives = _split_description_alternatives(description) or [description]
    return any(
        _resolve_match_one(
            alt, equipment, exclude_keys=excluded, profiles=profiles
        )
        is not None
        for alt in alternatives
    )


def resolve_requirement(
    description: str,
    equipment: list[dict[str, Any]],
    *,
    exclude_keys: set[str] | None = None,
    profiles: dict[str, dict[str, Any]] | None = None,
    rejected_out: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    """Best alternative match with tier + evidence (or None).

    When ``rejected_out`` is provided, appends tier-3 nearest-miss / rejected
    candidates (e.g. plain local switch missing a remote command path).
    """
    excluded = exclude_keys or set()
    alternatives = _split_description_alternatives(description) or [description]
    best: dict[str, Any] | None = None
    for alt in alternatives:
        hit = _resolve_match_one(
            alt,
            equipment,
            exclude_keys=excluded,
            profiles=profiles,
            rejected_out=rejected_out,
        )
        if hit is None:
            continue
        if best is None or int(hit["resolution_tier"]) < int(best["resolution_tier"]):
            best = hit
    return best


def resolve_dependencies(
    profiles: dict[str, dict[str, Any]],
    equipment: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Resolve requires_devices against the vessel list; apply conditional fields.

    - Processes only ``requirement_kind=device`` against equipment (tiers 1–3).
    - ``software_app`` targeting a built-in surface: auto-satisfied (downloadable).
    - ``cable_or_consumable`` / ``commissioning_tool``: recorded, never resolved,
      never contribute to ``unresolved_dependency``.
    - Annotates ``resolved_to``, ``resolution_tier``, ``resolution_evidence``.
    - Annotates ``rejected_candidates`` for tier-3 near-misses (over-match).
    - Multiple ``device`` entries sharing ``needed_for`` are **OR alternatives**.
    Stage 2 role classification must read these **resolved** values only.
    """
    resolved: dict[str, dict[str, Any]] = {}
    for key, raw in profiles.items():
        profile = normalize_profile(raw)
        exclude = {key}
        requires_out: list[dict[str, Any]] = []
        surfaces = profile.get("control_surfaces") or []
        for req in profile.get("requires_devices") or []:
            item = dict(req)
            desc = str(item.get("description_verbatim") or "")
            kind = str(item.get("requirement_kind") or "").strip()
            if kind not in {
                "device",
                "cable_or_consumable",
                "software_app",
                "commissioning_tool",
            }:
                kind = classify_requirement_kind(desc)
            item["requirement_kind"] = kind
            path = str(item.get("needed_for") or "").strip()

            if kind != "device":
                item.pop("resolved_to", None)
                item.pop("resolution_tier", None)
                item.pop("resolution_score", None)
                item.pop("rejected_candidates", None)
                if kind == "software_app":
                    idx = control_surface_index_from_path(path)
                    builtin = False
                    if idx is not None and 0 <= idx < len(surfaces):
                        surf = surfaces[idx]
                        if isinstance(surf, dict):
                            sk = str(surf.get("surface") or "")
                            label = str(surf.get("label_verbatim") or "").lower()
                            gateway = "gateway" in label
                            # Built-in / downloadable phone apps (even if extract
                            # wrongly set optional_accessory) auto-satisfy.
                            if sk.startswith("mobile_app") and not gateway:
                                builtin = True
                            elif not surf.get("optional_accessory"):
                                builtin = True
                    if builtin:
                        item["satisfied"] = True
                        item["resolution_evidence"] = (
                            "software_app auto-satisfied (downloadable / built-in)"
                        )
                    else:
                        item["satisfied"] = False
                        item["resolution_evidence"] = (
                            "software_app recorded; not vessel-resolved"
                        )
                else:
                    # cable_or_consumable / commissioning_tool
                    item["satisfied"] = False
                    item["resolution_evidence"] = (
                        f"{kind} recorded for reference; not vessel-resolved"
                    )
                requires_out.append(item)
                continue

            rejected: list[dict[str, Any]] = []
            hit = resolve_requirement(
                desc,
                equipment,
                exclude_keys=exclude,
                profiles=profiles,
                rejected_out=rejected,
            )
            # Platform Climate gate: AC-present ≠ CZone-supported HVAC.
            if (
                hit
                and str(item.get("functional_class") or "").strip()
                == "supported_hvac"
            ):
                row = next(
                    (
                        e
                        for e in equipment
                        if str(e.get("device_key") or "")
                        == str(hit.get("device_key") or "")
                    ),
                    None,
                )
                integrated = bool(
                    row
                    and (
                        row.get("czone_supported_hvac") is True
                        or row.get("hvac_czone_integrated") is True
                        or str(row.get("integration") or "").lower()
                        in {"czone", "czone_supported"}
                    )
                )
                if not integrated:
                    rejected.append(
                        {
                            "device_key": hit.get("device_key"),
                            "reason": (
                                "AC-present ≠ CZone-supported HVAC "
                                "(functional_class=supported_hvac)"
                            ),
                        }
                    )
                    hit = None
            item["satisfied"] = hit is not None
            if hit:
                item["resolved_to"] = hit["device_key"]
                item["resolution_tier"] = hit["resolution_tier"]
                item["resolution_evidence"] = hit["evidence"]
                if "resolution_score" in hit:
                    item["resolution_score"] = hit["resolution_score"]
            else:
                item.pop("resolved_to", None)
                item.pop("resolution_tier", None)
                item.pop("resolution_evidence", None)
                item.pop("resolution_score", None)
            seen_keys: set[str] = set()
            uniq: list[dict[str, Any]] = []
            for cand in rejected:
                ck = str(cand.get("device_key") or "")
                if ck in seen_keys:
                    continue
                seen_keys.add(ck)
                uniq.append(cand)
            if uniq:
                item["rejected_candidates"] = uniq
            else:
                item.pop("rejected_candidates", None)
            requires_out.append(item)
        profile["requires_devices"] = requires_out

        # OR: path → True if any *device* require for that needed_for is satisfied.
        # software_app auto-satisfy activates built-in surfaces only (handled above).
        path_satisfied: dict[str, bool] = defaultdict(bool)
        for req in requires_out:
            path = str(req.get("needed_for") or "").strip()
            if (
                path
                and req.get("requirement_kind") == "device"
                and req.get("satisfied")
            ):
                path_satisfied[path] = True
            # Auto-satisfied software_app also counts for its surface path.
            if (
                path
                and req.get("requirement_kind") == "software_app"
                and req.get("satisfied")
            ):
                path_satisfied[path] = True

        # Optional / equipment-gated control surfaces (path → surface.active).
        surfaces_out: list[dict[str, Any]] = []
        for surface in profile.get("control_surfaces") or []:
            item = dict(surface)
            surface_kind = str(item.get("surface") or "")
            path = str(item.get("path") or "")
            label = str(item.get("label_verbatim") or "").strip()
            gateway_backed = any(
                path
                and str(r.get("needed_for") or "").strip() == path
                and "gateway" in str(r.get("description_verbatim") or "").lower()
                for r in requires_out
            ) or ("gateway" in label.lower())
            equipment_gated = any(
                path
                and str(r.get("needed_for") or "").strip() == path
                and r.get("requirement_kind") == "device"
                for r in requires_out
            )
            # Built-in phone apps are not vessel line-items. Gateway-backed
            # mobile apps (Balmar Bluetooth Gateway, etc.) still resolve.
            if surface_kind.startswith("mobile_app") and not gateway_backed:
                item["active"] = True
                item["optional_accessory"] = False
            elif item.get("optional_accessory") or gateway_backed or equipment_gated:
                via_req = bool(path_satisfied.get(path))
                via_label = bool(label) and _fuzzy_present(
                    label, equipment, exclude_keys=exclude, profiles=profiles
                )
                item["active"] = bool(via_req or via_label)
                if not item["active"]:
                    item["inactive_reason"] = (
                        "unresolved_equipment_gate"
                        if equipment_gated and not item.get("optional_accessory")
                        else "unresolved_optional_accessory"
                    )
            else:
                item["active"] = True
            surfaces_out.append(item)
        profile["control_surfaces"] = surfaces_out

        # Conditional boolean capabilities: force False only when NO *device*
        # alternative for that needed_for path is satisfied.
        device_paths = {
            str(r.get("needed_for") or "").strip()
            for r in requires_out
            if r.get("requirement_kind") == "device"
            and str(r.get("needed_for") or "").strip()
        }
        for path in device_paths:
            ok, value, _err = resolve_field_path(profile, path)
            if not ok:
                continue
            idx = control_surface_index_from_path(path)
            if idx is not None:
                continue
            any_device = any(
                r.get("requirement_kind") == "device"
                and str(r.get("needed_for") or "").strip() == path
                and r.get("satisfied")
                for r in requires_out
            )
            if isinstance(value, bool) and not any_device:
                set_field_path(profile, path, False)

        resolved[key] = profile
    return resolved


# Back-compat alias used by earlier spike call sites / docs.
resolve_accessories = resolve_dependencies


class _UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}

    def add(self, x: str) -> None:
        self.parent.setdefault(x, x)

    def find(self, x: str) -> str:
        self.add(x)
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


def _build_network_components(
    devices: dict[str, ComputedDevice],
) -> dict[str, str]:
    uf = _UnionFind()
    device_nets: dict[str, set[str]] = defaultdict(set)

    for key, device in devices.items():
        for net in device.normalized_speaks:
            uf.add(net)
            device_nets[key].add(net)
        for frm, to in device.normalized_bridges:
            uf.union(frm, to)
            device_nets[key].add(frm)
            device_nets[key].add(to)

    return {net: uf.find(net) for net in list(uf.parent.keys())}


def _device_components(
    device: ComputedDevice, components: dict[str, str]
) -> set[str]:
    nets = set(device.normalized_speaks)
    for frm, to in device.normalized_bridges:
        nets.add(frm)
        nets.add(to)
    return {components[n] for n in nets if n in components}


def _shares_reachable_network(
    a: ComputedDevice, b: ComputedDevice, components: dict[str, str]
) -> bool:
    return bool(_device_components(a, components) & _device_components(b, components))


def _has_active_ui(device: ComputedDevice) -> bool:
    return _has_island_ui(device)


def _has_station_ui(device: ComputedDevice) -> bool:
    return any(
        s.get("active")
        and s.get("surface") in _HUB_STATION_SURFACES
        and s.get("location_class") in {"remote_wired", "wireless", "on_device"}
        for s in device.active_surfaces
    )


def _commands_others(
    device: ComputedDevice,
    devices: dict[str, ComputedDevice],
    components: dict[str, str],
) -> bool:
    for other_key, other in devices.items():
        if other_key == device.device_key:
            continue
        if not other.profile.get("data_roles", {}).get("controllable_from_network"):
            continue
        if _shares_reachable_network(device, other, components):
            return True
    return False


def classify_roles(
    devices: dict[str, ComputedDevice], components: dict[str, str]
) -> None:
    # Sweep 0: non-physical platforms (shared software UI).
    for device in devices.values():
        kind = str(
            device.profile.get("entity_kind")
            or device.line_item.get("entity_kind")
            or "device"
        ).strip().lower()
        if kind == "platform":
            device.role = "PLATFORM"

    # Sweep 1: identify HUBs.
    hubs: list[str] = []
    for device in devices.values():
        if device.role == "PLATFORM":
            continue
        data_roles = device.profile.get("data_roles") or {}
        station = _has_station_ui(device)
        hubish = station and (
            bool(data_roles.get("displays_data_from_other_devices"))
            or _commands_others(device, devices, components)
        )
        if hubish:
            device.role = "HUB"
            hubs.append(device.device_key)

    hub_devices = [devices[k] for k in hubs]

    # Sweep 2: everyone else relative to hubs.
    for device in devices.values():
        if device.role in {"HUB", "PLATFORM"}:
            continue
        surfaces = device.active_surfaces
        actions = device.profile.get("operator_actions") or []
        bridges = device.normalized_bridges
        active_surfaces = [s for s in surfaces if s.get("active")]

        if bridges and not actions:
            device.role = "BRIDGE"
            continue
        if not active_surfaces and not actions:
            device.role = "PASSIVE"
            continue
        reaches_hub = any(
            _shares_reachable_network(device, hub, components) for hub in hub_devices
        )
        if _has_active_ui(device) and hub_devices and not reaches_hub:
            device.role = "ISLAND"
            continue
        if _has_active_ui(device) and not hub_devices:
            device.role = "ISLAND"
            continue
        device.role = "ENDPOINT"


def assign_section(device: ComputedDevice) -> None:
    text = " ".join(
        [
            str((device.profile.get("device") or {}).get("category_freeform") or ""),
            str(device.line_item.get("description") or ""),
            str(device.line_item.get("manufacturer") or ""),
            str(device.line_item.get("model") or ""),
            str(device.line_item.get("system_category") or "").replace("_", " "),
        ]
    ).lower()

    scores: dict[str, int] = {}
    for section_id, keywords in SECTION_LOOKUP.items():
        score = sum(1 for kw in keywords if kw in text)
        if score:
            scores[section_id] = score

    if not scores:
        device.section = None
        device.section_source = "unassigned"
        device.section_flag = "section_unassigned"
        return

    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
    best_section, best_score = ranked[0]
    device.section = best_section
    device.section_source = "lookup"
    if len(ranked) > 1 and ranked[1][1] >= best_score - _SECTION_SCORE_MARGIN:
        # Equal (or within margin) — still pick best but flag for Stage 3.
        if ranked[1][1] == best_score:
            device.section_flag = "section_low_margin"
        else:
            device.section_flag = None
    else:
        device.section_flag = None


def _device_edge_provenances(device: ComputedDevice) -> list[str]:
    tiers = list(device.speak_provenances) + list(device.bridge_provenances)
    # Also read live from profile in case lists are empty.
    nets = device.profile.get("networks") or {}
    for s in nets.get("speaks") or []:
        if isinstance(s, dict) and s.get("edge_provenance"):
            tiers.append(str(s.get("edge_provenance")))
    for b in nets.get("bridges") or []:
        if isinstance(b, dict) and b.get("edge_provenance"):
            tiers.append(str(b.get("edge_provenance")))
        if isinstance(b, dict) and b.get("edge_provenance_secondary"):
            tiers.append(str(b.get("edge_provenance_secondary")))
    return tiers


def _path_edge_provenances(
    target: ComputedDevice,
    hub: ComputedDevice,
    devices: dict[str, ComputedDevice],
    components: dict[str, str],
) -> list[str]:
    """Collect provenance tiers on devices that glue target↔hub together."""
    shared = _device_components(target, components) & _device_components(hub, components)
    if not shared:
        return []
    tiers: list[str] = []
    for device in devices.values():
        if not (_device_components(device, components) & shared):
            continue
        # Bridges on intermediate BRIDGE/ENDPOINT devices matter most.
        tiers.extend(_device_edge_provenances(device))
    return tiers


def control_paths(
    devices: dict[str, ComputedDevice], components: dict[str, str]
) -> tuple[list[ControlPath], list[dict[str, Any]]]:
    from interaction_profile_edge_provenance import (
        normalize_edge_provenance,
        weakest_provenance,
    )

    hubs = [d for d in devices.values() if d.role == "HUB"]
    paths: list[ControlPath] = []
    flags: list[dict[str, Any]] = []

    for device in devices.values():
        if device.role == "HUB":
            continue
        if not device.profile.get("data_roles", {}).get("controllable_from_network"):
            continue
        matched = False
        fallback = [
            str(s.get("surface"))
            for s in device.active_surfaces
            if s.get("active")
        ]
        for hub in hubs:
            if device.device_key == hub.device_key:
                continue
            if _shares_reachable_network(device, hub, components):
                tiers = _path_edge_provenances(device, hub, devices, components)
                weakest = weakest_provenance(tiers)
                # Paths that only traverse diagram_inference edges are weak.
                solely_diagram = bool(tiers) and all(
                    normalize_edge_provenance(t) == "diagram_inference" for t in tiers
                )
                # Also weak when weakest is diagram_inference and no self_claimed
                # speak on the target itself to the shared net.
                path = ControlPath(
                    target=device.device_key,
                    taught_via=hub.device_key,
                    fallback_surfaces=fallback,
                    edge_provenance_weakest=weakest,
                    edge_provenance_tiers=sorted(
                        {normalize_edge_provenance(t) for t in tiers}
                    ),
                )
                paths.append(path)
                if solely_diagram or (
                    weakest == "diagram_inference"
                    and "self_claimed" not in path.edge_provenance_tiers
                    and "counterpart_claim" not in path.edge_provenance_tiers
                ):
                    flags.append(
                        {
                            "flag": "edge_provenance_weak",
                            "device": device.device_key,
                            "taught_via": hub.device_key,
                            "edge_provenance_weakest": weakest,
                        }
                    )
                matched = True
        if not matched:
            flags.append(
                {
                    "flag": "controllable_but_unreachable",
                    "device": device.device_key,
                }
            )
    return paths, flags


def _hub_domain_notes(device: ComputedDevice) -> list[str]:
    """Heuristic domain cues for hub_domain_split judgment (not a merge)."""
    notes: list[str] = []
    profile = device.profile if isinstance(device.profile, dict) else {}
    cat = str((profile.get("device") or {}).get("category_freeform") or "").lower()
    model = str((profile.get("device") or {}).get("model") or "").lower()
    desc = str(device.line_item.get("description") or "").lower()
    blob = f"{cat} {model} {desc}"
    if any(
        t in blob
        for t in ("chart", "plotter", "mfd", "nav", "display", "zeus", "radar")
    ):
        notes.append("navigation / display domain")
    if any(t in blob for t in ("switch", "touch", "czone", "power", "digital")):
        notes.append("switching / power domain")
    runs = profile.get("runs_platform") or []
    seen_plat: set[str] = set()
    for r in runs:
        if not isinstance(r, dict):
            continue
        pk = str(r.get("platform_key") or "").strip()
        if pk and pk not in seen_plat:
            seen_plat.add(pk)
            notes.append(f"hosts platform {pk}")
    pages = [
        str(p.get("name") or "").strip()
        for p in (profile.get("ui_pages") or [])
        if isinstance(p, dict) and str(p.get("name") or "").strip()
    ]
    czone_pages = [n for n in pages if "czone" in n.lower()]
    if czone_pages:
        notes.append(
            "documented CZone window on ui_pages: " + ", ".join(czone_pages)
        )
    speaks = [
        str(s.get("name_verbatim") or "").strip()
        for s in ((profile.get("networks") or {}).get("speaks") or [])
        if isinstance(s, dict) and str(s.get("name_verbatim") or "").strip()
    ]
    if speaks:
        notes.append("speaks " + ", ".join(speaks))
    if not notes:
        notes.append("domain cues sparse — inspect surfaces/pages")
    return notes


def hub_domain_split_judgment(
    hubs: list[ComputedDevice],
) -> dict[str, Any]:
    """Articulate multi-hub domains without resolving/merging hubs.

    First-occurrence judgment when ``multiple_hubs`` fires. Does not pick a
    single hub — records per-hub domain notes for human adjudication.
    """
    domains: list[dict[str, Any]] = []
    lines: list[str] = [
        "multiple_hubs: vessel has more than one HUB. Domain split judgment "
        "(raw articulation — do not treat as resolved):"
    ]
    for hub in hubs:
        notes = _hub_domain_notes(hub)
        domains.append({"device": hub.device_key, "domain_notes": notes})
        lines.append(f"  - {hub.device_key}: " + "; ".join(notes))
    return {
        "flag": "hub_domain_split",
        "devices": [h.device_key for h in hubs],
        "domains": domains,
        "judgment": "\n".join(lines),
    }


def structural_flags(
    devices: dict[str, ComputedDevice],
    extra: list[dict[str, Any]] | None = None,
    *,
    hub_operation_sourced: bool = False,
    platform_versions_confirmed: set[str] | None = None,
) -> list[dict[str, Any]]:
    flags: list[dict[str, Any]] = list(extra or [])
    confirmed = {str(k).strip() for k in (platform_versions_confirmed or set()) if str(k).strip()}
    hubs = [d for d in devices.values() if d.role == "HUB"]
    if not hubs:
        flags.append({"flag": "no_hub_found"})
    elif len(hubs) > 1:
        flags.append(
            {
                "flag": "multiple_hubs",
                "devices": [d.device_key for d in hubs],
            }
        )
        flags.append(hub_domain_split_judgment(hubs))

    # Platform-backed hubs: split former hub_operation_unsourced (v4.6).
    for hub in hubs:
        runs = [
            r
            for r in (hub.profile.get("runs_platform") or [])
            if isinstance(r, dict) and str(r.get("platform_key") or "").strip()
        ]
        if runs:
            for edge in runs:
                pk = str(edge.get("platform_key") or "").strip()
                plat = devices.get(pk)
                doc_ver = ""
                if plat is not None:
                    doc_ver = str(plat.profile.get("documented_version") or "").strip()
                if pk not in confirmed:
                    flags.append(
                        {
                            "flag": "platform_version_unconfirmed",
                            "device": hub.device_key,
                            "platform_key": pk,
                            "documented_version": doc_ver or None,
                            "detail": (
                                "Platform documented_version not confirmed on this "
                                "vessel (settings-page photo or config artifact)"
                            ),
                        }
                    )
            if not hub_operation_sourced:
                flags.append(
                    {
                        "flag": "config_unsourced",
                        "device": hub.device_key,
                        "detail": (
                            "Boat-specific modes/favourites/alarms unsourced — "
                            "need device_configuration (.zcf) or owner "
                            "screen-walkthrough (tier 5). Circuit inventory may "
                            "already be sourced from an adjudicated channel_map."
                        ),
                    }
                )
            continue

        # Legacy: setup-only hub with no platform edge.
        vflags = hub.profile.get("validation_flags") or []
        if any(
            isinstance(f, dict) and f.get("flag") == "config_defined_operation"
            for f in vflags
        ) and not hub_operation_sourced:
            flags.append(
                {
                    "flag": "hub_operation_unsourced",
                    "device": hub.device_key,
                    "detail": (
                        "config_defined_operation hub — guide operate sections "
                        "gated until device_configuration (tier 4) or owner "
                        "screen-walkthrough (tier 5)"
                    ),
                }
            )

    # Orphan bridges: one side's network has no other member.
    net_members: dict[str, set[str]] = defaultdict(set)
    for device in devices.values():
        for net in device.normalized_speaks:
            net_members[net].add(device.device_key)
        for frm, to in device.normalized_bridges:
            net_members[frm].add(device.device_key)
            net_members[to].add(device.device_key)

    for device in devices.values():
        if device.role != "BRIDGE":
            continue
        for frm, to in device.normalized_bridges:
            left = net_members.get(frm, set()) - {device.device_key}
            right = net_members.get(to, set()) - {device.device_key}
            if not left or not right:
                flags.append(
                    {
                        "flag": "orphan_bridge",
                        "device": device.device_key,
                        "from": frm,
                        "to": to,
                    }
                )

    for device in devices.values():
        # unresolved_dependency: per needed_for path, OR among *device* kinds
        # only — cable/software/commissioning never raise this flag.
        by_path: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for req in device.profile.get("requires_devices") or []:
            if not isinstance(req, dict):
                continue
            kind = str(req.get("requirement_kind") or "").strip()
            if not kind:
                kind = classify_requirement_kind(
                    str(req.get("description_verbatim") or "")
                )
            if kind != "device":
                continue
            path = str(req.get("needed_for") or "").strip()
            if path:
                by_path[path].append(req)
        for path, group in by_path.items():
            if group and not any(r.get("satisfied") for r in group):
                flags.append(
                    {
                        "flag": "unresolved_dependency",
                        "device": device.device_key,
                        "needed_for": path,
                    }
                )

        if any(n.startswith("UNKNOWN:") for n in device.normalized_speaks):
            flags.append(
                {
                    "flag": "network_alias_gap",
                    "device": device.device_key,
                }
            )
        for frm, to in device.normalized_bridges:
            if frm.startswith("UNKNOWN:") or to.startswith("UNKNOWN:"):
                flags.append(
                    {
                        "flag": "network_alias_gap",
                        "device": device.device_key,
                    }
                )

        overall = (device.profile.get("confidence") or {}).get("overall")
        if isinstance(overall, (int, float)) and overall < _LOW_CONFIDENCE:
            flags.append(
                {
                    "flag": "low_confidence_profile",
                    "device": device.device_key,
                }
            )

        if device.role == "PASSIVE":
            safety = device.profile.get("safety_role") or {}
            if not any(bool(safety.get(k)) for k in safety):
                flags.append(
                    {
                        "flag": "suspected_installer_line_item",
                        "device": device.device_key,
                    }
                )

        if device.role == "ISLAND":
            daily = any(
                a.get("context") == "daily"
                and a.get("audience") in {"operator", "either"}
                for a in (device.profile.get("operator_actions") or [])
            )
            if daily:
                flags.append(
                    {
                        "flag": "island_with_daily_use",
                        "device": device.device_key,
                    }
                )

        if device.section_flag:
            flags.append(
                {
                    "flag": device.section_flag,
                    "device": device.device_key,
                }
            )

    # Deduplicate flag dicts.
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for item in flags:
        key = json_stable(item)
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def json_stable(obj: Any) -> str:
    import json

    return json.dumps(obj, sort_keys=True, default=str)


def cross_references(
    devices: dict[str, ComputedDevice],
    paths: list[ControlPath],
) -> list[CrossRef]:
    xrefs: list[CrossRef] = []
    section_of = {k: d.section for k, d in devices.items()}

    for path in paths:
        t_sec = section_of.get(path.target)
        h_sec = section_of.get(path.taught_via)
        if not t_sec or not h_sec or t_sec == h_sec:
            continue
        hub_name = (
            f"{devices[path.taught_via].line_item.get('manufacturer', '')} "
            f"{devices[path.taught_via].line_item.get('model', '')}"
        ).strip()
        xrefs.append(
            CrossRef(
                kind="control",
                in_section=t_sec,
                to_device=path.taught_via,
                note=f"operated from {hub_name or path.taught_via}",
            )
        )
        xrefs.append(
            CrossRef(
                kind="hosts_control",
                in_section=h_sec,
                to_device=path.target,
                note="",
            )
        )

    # Protection / power_dependency only when Stage 1 hints resolve to devices.
    for key, device in devices.items():
        profiles_for_match = {k: d.profile for k, d in devices.items()}
        equipment_rows = [
            {
                "device_key": k,
                "manufacturer": d.line_item.get("manufacturer"),
                "model": d.line_item.get("model"),
                "description": d.line_item.get("description"),
            }
            for k, d in devices.items()
            if k != key
        ]

        def _prot_match(description: str) -> str | None:
            hit = resolve_requirement(
                description,
                equipment_rows,
                exclude_keys={key},
                profiles=profiles_for_match,
            )
            return str(hit["device_key"]) if hit else None

        for hint in device.profile.get("protected_by") or []:
            if not isinstance(hint, dict):
                continue
            # Per-instance vessel facts may pin the protector explicitly.
            pinned = str(hint.get("resolved_to_hint") or "").strip()
            if pinned and pinned in devices:
                match = pinned
            else:
                match = _prot_match(str(hint.get("description_verbatim") or ""))
            if not match:
                continue
            a_sec, b_sec = section_of.get(key), section_of.get(match)
            if a_sec and b_sec and a_sec != b_sec:
                xrefs.append(
                    CrossRef(
                        kind="protection",
                        in_section=a_sec,
                        to_device=match,
                        note=f"protective device located in {b_sec}",
                    )
                )
        # Tier-3 style: commandable external disconnect required by BMS also
        # counts as a protection dependency for cross-section xrefs.
        for req in device.resolved_requires or device.profile.get("requires_devices") or []:
            if not isinstance(req, dict) or not req.get("satisfied"):
                continue
            desc = str(req.get("description_verbatim") or "").lower()
            if not any(
                t in desc
                for t in ("safety relay", "external safety", "class t", "battery fuse")
            ):
                continue
            match = str(req.get("resolved_to") or "") or _prot_match(
                str(req.get("description_verbatim") or "")
            )
            if not match:
                continue
            a_sec, b_sec = section_of.get(key), section_of.get(match)
            if a_sec and b_sec and a_sec != b_sec:
                xrefs.append(
                    CrossRef(
                        kind="protection",
                        in_section=a_sec,
                        to_device=match,
                        note=f"protective device located in {b_sec}",
                    )
                )
        for hint in device.profile.get("protects") or []:
            match = _prot_match(str(hint.get("description_verbatim") or ""))
            if not match:
                continue
            a_sec, b_sec = section_of.get(match), section_of.get(key)
            if a_sec and b_sec and a_sec != b_sec:
                xrefs.append(
                    CrossRef(
                        kind="protection",
                        in_section=a_sec,
                        to_device=key,
                        note=f"protective device located in {b_sec}",
                    )
                )
        for hint in device.profile.get("supply_requirements") or []:
            match = _prot_match(str(hint.get("description_verbatim") or ""))
            if not match:
                continue
            a_sec, b_sec = section_of.get(key), section_of.get(match)
            if a_sec and b_sec and a_sec != b_sec:
                xrefs.append(
                    CrossRef(
                        kind="power_dependency",
                        in_section=a_sec,
                        to_device=match,
                        note="",
                    )
                )
    return xrefs


def _match_device(
    description: str, devices: dict[str, ComputedDevice], *, exclude: str
) -> str | None:
    equipment = [
        {
            "device_key": k,
            "manufacturer": d.line_item.get("manufacturer"),
            "model": d.line_item.get("model"),
            "description": d.line_item.get("description"),
        }
        for k, d in devices.items()
        if k != exclude
    ]
    profiles = {k: d.profile for k, d in devices.items()}
    hit = resolve_requirement(
        description, equipment, exclude_keys={exclude}, profiles=profiles
    )
    return str(hit["device_key"]) if hit else None


def build_vessel_graph(
    equipment: list[dict[str, Any]],
    profiles: dict[str, dict[str, Any]],
    *,
    allow_rextraction_queue: bool = False,
    relations: list[dict[str, Any]] | None = None,
    vessel_artifact_facts: list[dict[str, Any]] | None = None,
    equipment_doc: dict[str, Any] | None = None,
) -> VesselGraphResult:
    """Run Stage 2 for one vessel.

    ``equipment`` items need ``device_key`` plus optional manufacturer/model/
    description/system_category. ``profiles`` is ``{device_key: profile}``
    (catalog keys for distinct multi-unit rows). Distinct inventory rows are
    expanded to per-instance nodes before role/path/xref computation.

    Profiles with ``needs_rextraction: true`` raise unless
    ``allow_rextraction_queue`` is set (debug only).
    """
    from vessel_artifacts import (
        apply_vessel_artifact_facts,
        vessel_confirmed_platform_versions,
        vessel_has_hub_operation_source,
    )
    from vessel_instances import (
        attach_relations_to_result,
        expand_equipment_instances,
    )

    profiles = apply_vessel_artifact_facts(
        dict(profiles),
        list(vessel_artifact_facts or [])
        or list((equipment_doc or {}).get("vessel_artifact_facts") or []),
    )

    equipment, profiles, rels = expand_equipment_instances(
        list(equipment),
        dict(profiles),
        top_level_relations=list(relations or []),
    )

    by_key = {str(row["device_key"]): row for row in equipment if row.get("device_key")}
    missing = [k for k in by_key if k not in profiles]
    if missing:
        raise ValueError(f"Missing profiles for device_key(s): {missing}")

    blocked = [
        k
        for k, p in profiles.items()
        if k in by_key and isinstance(p, dict) and p.get("needs_rextraction")
    ]
    if blocked and not allow_rextraction_queue:
        raise ValueError(
            "Stage 1.5 blocking flags — re-extract before Stage 2: "
            + ", ".join(blocked)
        )

    from interaction_profile_edge_provenance import (
        annotate_self_claimed_networks,
        apply_counterpart_network_claims,
        normalize_edge_provenance,
    )

    # Annotate edge provenance before dependency resolution / graph build.
    profiles = apply_counterpart_network_claims(
        {
            k: annotate_self_claimed_networks(dict(v))
            for k, v in profiles.items()
        }
    )

    resolved = resolve_dependencies(profiles, equipment)
    devices: dict[str, ComputedDevice] = {}
    for key, line_item in by_key.items():
        profile = resolved[key]
        speak_rows = [
            s
            for s in (profile.get("networks") or {}).get("speaks") or []
            if isinstance(s, dict) and str(s.get("name_verbatim") or "").strip()
        ]
        bridge_rows = [
            b
            for b in (profile.get("networks") or {}).get("bridges") or []
            if isinstance(b, dict)
            and str(b.get("from") or "").strip()
            and str(b.get("to") or "").strip()
        ]
        speaks = [
            normalize_network_name(str(s.get("name_verbatim") or ""))
            for s in speak_rows
        ]
        bridges = [
            (
                normalize_network_name(str(b.get("from") or "")),
                normalize_network_name(str(b.get("to") or "")),
            )
            for b in bridge_rows
        ]
        speak_provenances = [
            normalize_edge_provenance(str(s.get("edge_provenance") or ""))
            for s in speak_rows
        ]
        bridge_provenances = [
            normalize_edge_provenance(str(b.get("edge_provenance") or ""))
            for b in bridge_rows
        ]
        device = ComputedDevice(
            device_key=key,
            line_item=line_item,
            profile=profile,
            active_surfaces=list(profile.get("control_surfaces") or []),
            resolved_requires=list(profile.get("requires_devices") or []),
            normalized_speaks=speaks,
            normalized_bridges=bridges,
            speak_provenances=speak_provenances,
            bridge_provenances=bridge_provenances,
        )
        assign_section(device)
        devices[key] = device

    components = _build_network_components(devices)
    classify_roles(devices, components)
    paths, path_flags = control_paths(devices, components)
    hub_sourced = vessel_has_hub_operation_source(equipment_doc)
    confirmed_platforms = vessel_confirmed_platform_versions(equipment_doc)
    flags = structural_flags(
        devices,
        extra=path_flags,
        hub_operation_sourced=hub_sourced,
        platform_versions_confirmed=confirmed_platforms,
    )
    xrefs = cross_references(devices, paths)

    return VesselGraphResult(
        devices=devices,
        control_paths=paths,
        cross_references=xrefs,
        flags=flags,
        network_components=components,
        relations=attach_relations_to_result(rels),
    )
