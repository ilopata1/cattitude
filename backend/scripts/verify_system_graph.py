"""Exact-match Stage 2 regression for the Outremer fixture.

Usage (from backend/):
  python scripts/verify_system_graph.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from interaction_profile import load_profiles_file
from system_graph import build_vessel_graph, normalize_network_name

FIXTURE_DIR = _BACKEND / "fixtures" / "pipeline" / "outremer"


def _load_json(name: str) -> Any:
    return json.loads((FIXTURE_DIR / name).read_text(encoding="utf-8"))


def _flag_match(actual: list[dict[str, Any]], expected: dict[str, Any]) -> bool:
    return any(
        all(item.get(k) == v for k, v in expected.items()) for item in actual
    )


def _xref_match(actual: list[dict[str, Any]], expected: dict[str, Any]) -> bool:
    return any(
        all(item.get(k) == v for k, v in expected.items()) for item in actual
    )


def main() -> int:
    failures: list[str] = []

    def check(cond: bool, msg: str) -> None:
        if not cond:
            failures.append(msg)

    # --- unit: network normalization ---
    check(normalize_network_name("MasterBus") == "MASTERBUS", "alias MasterBus")
    check(normalize_network_name("NMEA 2000") == "NMEA2000", "alias NMEA 2000")
    check(
        normalize_network_name("WeirdNet").startswith("UNKNOWN:"),
        "unknown nets kept",
    )

    # --- unit: requires_devices alternatives (or / comma) ---
    from system_graph import _fuzzy_present

    alt_equipment = [
        {
            "device_key": "cerbo",
            "manufacturer": "Victron Energy",
            "model": "Cerbo GX",
            "description": "GX monitor",
        }
    ]
    check(
        _fuzzy_present("GX device or GlobalLink 520", alt_equipment),
        "Cerbo GX must satisfy 'GX device or GlobalLink 520'",
    )
    check(
        not _fuzzy_present("GlobalLink 520", alt_equipment),
        "Cerbo GX must not satisfy GlobalLink-only alternative alone",
    )

    equipment_doc = _load_json("equipment.json")
    equipment = equipment_doc["equipment"]
    relations = list(equipment_doc.get("relations") or [])
    profiles = load_profiles_file(FIXTURE_DIR / "profiles.json")
    expected = _load_json("expected.json")

    result = build_vessel_graph(
        equipment,
        profiles,
        relations=relations,
        equipment_doc=equipment_doc,
    )
    summary = result.summary()

    for device_key, role in expected["roles"].items():
        got = summary["roles"].get(device_key)
        check(got == role, f"role {device_key}: {got!r} != {role!r}")

    for device_key, section in expected["sections"].items():
        got = summary["sections"].get(device_key) or {}
        check(
            got.get("value") == section["value"],
            f"section {device_key}: {got.get('value')!r} != {section['value']!r}",
        )
        check(
            got.get("source") == section["source"],
            f"section source {device_key}: {got.get('source')!r}",
        )

    # Control paths: required pairs (ignore fallback_surfaces extras).
    path_pairs = {
        (p["target"], p["taught_via"]) for p in summary["control_paths"]
    }
    for path in expected["control_paths"]:
        pair = (path["target"], path["taught_via"])
        check(pair in path_pairs, f"missing control_path {pair}; have {path_pairs}")

    for rel in expected.get("required_relations") or []:
        check(
            any(
                r.get("kind") == rel.get("kind")
                and set(r.get("members") or []) == set(rel.get("members") or [])
                for r in (summary.get("relations") or [])
                if isinstance(r, dict)
            ),
            f"missing relation {rel}; have {summary.get('relations')}",
        )

    for flag in expected["required_flags"]:
        check(
            _flag_match(summary["flags"], flag),
            f"missing flag {flag}; have {summary['flags']}",
        )

    for flag in expected["forbidden_flags"]:
        check(
            not _flag_match(summary["flags"], flag),
            f"unexpected flag {flag} in {summary['flags']}",
        )

    xref_dicts = summary["cross_references"]
    for xref in expected["required_cross_references"]:
        check(
            _xref_match(xref_dicts, xref),
            f"missing xref {xref}; have {xref_dicts}",
        )

    # Protection xrefs present when per-instance protected_by hints resolve.
    protection = [x for x in xref_dicts if x.get("kind") == "protection"]
    check(
        any(str(x.get("to_device") or "").startswith("class_t") for x in protection),
        f"expected Class T protection xrefs; got {protection}",
    )

    # Retired nodes must not appear (vessel reconciliation batch B).
    for retired in ("balmar_mc624", "czone_touch_10", "czone_system"):
        check(
            retired not in summary["roles"],
            f"retired device {retired} still in roles",
        )

    # Alpha Pro stubs: MasterBus endpoints pending extraction.
    for alpha_key in ("alpha_pro_iii_port", "alpha_pro_iii_stbd"):
        check(
            summary["roles"].get(alpha_key) == "ENDPOINT",
            f"{alpha_key} role expected ENDPOINT; got {summary['roles'].get(alpha_key)!r}",
        )
        alpha_dev = result.devices.get(alpha_key)
        check(
            alpha_dev is not None
            and "MASTERBUS" in set(alpha_dev.normalized_speaks),
            f"{alpha_key} must speak MasterBus",
        )

    # --- Stage 2 resolver: tier-3 over-match negatives + positive control ---
    from system_graph import resolve_requirement
    from vessel_instances import expand_equipment_instances

    expanded_eq, expanded_profiles, _rels = expand_equipment_instances(
        equipment, profiles, top_level_relations=relations
    )

    # Tier-3 "external safety relay" → ml_switch* only when that switch is fitted.
    has_ml_switch = any(
        str(row.get("catalog_key") or row.get("device_key") or "").startswith("ml_switch")
        or str(row.get("device_key") or "").startswith("ml_switch")
        for row in expanded_eq
        if isinstance(row, dict)
    )
    relay_desc = "external safety relay"
    rejected: list[dict[str, Any]] = []
    relay_hit = resolve_requirement(
        relay_desc,
        expanded_eq,
        exclude_keys={"mli_ultra_1"},
        profiles=expanded_profiles,
        rejected_out=rejected,
    )
    print("RESOLVER (Stage 2 tier-3 over-match):")
    print(
        f"  requirement={relay_desc!r} → satisfied={relay_hit is not None} "
        f"resolved_to={(relay_hit or {}).get('device_key')!r} "
        f"tier={(relay_hit or {}).get('resolution_tier')!r} "
        f"score={(relay_hit or {}).get('resolution_score')!r} "
        f"evidence={(relay_hit or {}).get('evidence')!r}"
    )
    for cand in rejected:
        print(
            f"  rejected: {cand.get('device_key')!r} class={cand.get('class_id')!r} "
            f"score={cand.get('score')!r}<{cand.get('threshold')!r} "
            f"failed={cand.get('failed_criteria')!r} reason={cand.get('reason')!r}"
        )

    if has_ml_switch:
        check(
            relay_hit is not None
            and str(relay_hit.get("device_key") or "").startswith("ml_switch"),
            f"tier3 positive: external safety relay → ml_switch*; got {relay_hit!r}",
        )
        check(
            relay_hit is not None and relay_hit.get("resolution_tier") == 3,
            f"tier3 positive: expected resolution_tier 3; got {relay_hit!r}",
        )
    else:
        # Without ML-Series on the vessel, "external safety relay" must not
        # latch onto Touch ("digital switching"), ACR, Class-T, or busbars.
        check(
            relay_hit is None,
            f"tier3 must not resolve safety relay without ml_switch; got {relay_hit!r}",
        )

    rejected_by_key = {str(c.get("device_key")): c for c in rejected}
    plain = rejected_by_key.get("plain_battery_switch")
    check(
        plain is not None,
        "tier3 negative: plain_battery_switch must appear in rejected_candidates",
    )
    if plain is not None:
        check(
            float(plain["score"]) < float(plain["threshold"]),
            f"plain_battery_switch score below threshold: {plain}",
        )
        check(
            "no remote command path" in (plain.get("failed_criteria") or []),
            f"plain_battery_switch failing criterion: {plain}",
        )
    class_t_rej = next(
        (c for k, c in rejected_by_key.items() if k.startswith("class_t")),
        None,
    )
    check(
        class_t_rej is not None,
        "tier3 negative: class_t* must appear in rejected_candidates",
    )
    if class_t_rej is not None:
        check(
            float(class_t_rej["score"]) < float(class_t_rej["threshold"]),
            f"class_t score below threshold: {class_t_rej}",
        )
        check(
            "protective but not a switch" in (class_t_rej.get("failed_criteria") or []),
            f"class_t failing criterion: {class_t_rej}",
        )
    if has_ml_switch:
        check(
            not str((relay_hit or {}).get("device_key") or "").startswith("class_t")
            and (relay_hit or {}).get("device_key")
            not in {"plain_battery_switch", "busbar"},
            f"tier3 must not over-match negatives; got {relay_hit!r}",
        )

    # Tier-2 family-only: Configuration Tool must NOT resolve to CZone hub.
    from interaction_profile_kinds import classify_requirement_kind

    check(
        classify_requirement_kind("CZone Configuration Tool") == "commissioning_tool",
        "CZone Configuration Tool kind backstop",
    )
    check(
        classify_requirement_kind("VictronConnect app") == "software_app",
        "VictronConnect app kind backstop",
    )
    check(
        classify_requirement_kind("VE.Direct cable") == "cable_or_consumable",
        "VE.Direct cable kind backstop",
    )
    check(
        classify_requirement_kind("GX device") == "device",
        "GX device kind backstop",
    )
    tool_hit = resolve_requirement(
        "CZone Configuration Tool",
        expanded_eq,
        exclude_keys={"mli_ultra_1"},
        profiles=expanded_profiles,
    )
    check(
        tool_hit is None
        or tool_hit.get("device_key") not in {"czone_system", "czone_touch_7"},
        f"tier2 must not match Configuration Tool → czone hub; got {tool_hit!r}",
    )

    # OR-split backstop via normalize_profile.
    from interaction_profile import normalize_profile

    split_prof = normalize_profile(
        {
            "device": {"manufacturer": "Victron", "model": "MPPT", "category_freeform": ""},
            "control_surfaces": [],
            "operator_actions": [],
            "networks": {"speaks": [], "bridges": []},
            "data_roles": {
                "exposes_data_to_network": True,
                "displays_data_from_other_devices": False,
                "controllable_from_network": False,
            },
            "requires_devices": [
                {
                    "description_verbatim": "GX device or GlobalLink 520",
                    "needed_for": "data_roles.exposes_data_to_network",
                }
            ],
            "safety_role": {
                "is_protective_device": False,
                "has_manual_override": False,
                "has_emergency_procedure": False,
            },
            "protected_by": [],
            "protects": [],
            "supply_requirements": [],
            "evidence": [],
            "confidence": {"overall": 0.5, "notes": ""},
        }
    )
    split_descs = [
        str(r.get("description_verbatim") or "")
        for r in (split_prof.get("requires_devices") or [])
    ]
    check(
        split_descs == ["GX device", "GlobalLink 520"],
        f"normalize must OR-split GX alts; got {split_descs}",
    )

    # --- per-instance protection path (resolved_to_hint on distinct MLI units) ---
    prot = [
        x.as_dict()
        for x in result.cross_references
        if x.kind == "protection"
    ]
    check(
        any(
            x.get("kind") == "protection"
            and x.get("in_section") == "batteries"
            and str(x.get("to_device") or "").startswith("class_t")
            for x in prot
        ),
        f"per-instance protection xref Class T missing: {prot}",
    )
    if has_ml_switch:
        check(
            any(
                x.get("kind") == "protection"
                and x.get("in_section") == "batteries"
                and str(x.get("to_device") or "").startswith("ml_switch")
                for x in prot
            ),
            f"per-instance protection xref ML switch missing: {prot}",
        )
    else:
        check(
            not any(
                str(x.get("to_device") or "").startswith("ml_switch") for x in prot
            ),
            f"ML switch protection xref must be absent after ACR inventory; got {prot}",
        )

    # --- conditional capability via needed_for (general rule, any equipment) ---
    # Same device profile: capability true + requires_devices → data_roles path.
    # (i) vessel without the dependency → capability inactive → ISLAND (own UI,
    #     no path to a hub).
    # (ii) vessel with a monitoring hub that shares the network → capability
    #     active → ENDPOINT (reaches hub).
    tests_dir = _BACKEND / "tests" / "fixtures"
    cond_device = json.loads(
        (tests_dir / "conditional_capability_device.json").read_text(encoding="utf-8")
    )
    hub_line = json.loads(
        (tests_dir / "conditional_capability_hub_line_item.json").read_text(
            encoding="utf-8"
        )
    )
    hub_profile = json.loads(
        (tests_dir / "conditional_capability_hub_profile.json").read_text(
            encoding="utf-8"
        )
    )

    cond_key = "conditional_device"
    # Isolate from the full vessel: Zeus Bluetooth would otherwise make the
    # conditional device an ENDPOINT even when its GX dependency is unsatisfied.
    cond_line = {
        "device_key": cond_key,
        "manufacturer": cond_device["device"]["manufacturer"],
        "model": cond_device["device"]["model"],
        "description": cond_device["device"].get("category_freeform")
        or "charge controller",
        "system_category": "electrical_dc",
    }
    base_equipment = [cond_line]
    base_profiles = {cond_key: cond_device}

    without_hub = build_vessel_graph(base_equipment, base_profiles)
    without_summary = without_hub.summary()
    check(
        without_summary["roles"].get(cond_key) == "ISLAND",
        f"conditional device without dependency must be ISLAND; got "
        f"{without_summary['roles'].get(cond_key)!r}",
    )
    resolved_exposes = (
        without_hub.devices[cond_key].profile.get("data_roles") or {}
    ).get("exposes_data_to_network")
    check(
        resolved_exposes is False,
        "unsatisfied needed_for must force exposes_data_to_network=False",
    )
    check(
        any(
            f.get("flag") == "unresolved_dependency" and f.get("device") == cond_key
            for f in without_summary["flags"]
        ),
        "unsatisfied needed_for must emit unresolved_dependency",
    )

    with_hub_equipment = base_equipment + [hub_line]
    with_hub_profiles = dict(base_profiles)
    with_hub_profiles[str(hub_line["device_key"])] = hub_profile
    with_hub = build_vessel_graph(with_hub_equipment, with_hub_profiles)
    with_summary = with_hub.summary()
    check(
        with_summary["roles"].get(cond_key) == "ENDPOINT",
        f"conditional device with hub dependency must be ENDPOINT; got "
        f"{with_summary['roles'].get(cond_key)!r}",
    )
    hub_key = str(hub_line["device_key"])
    check(
        with_summary["roles"].get(hub_key) == "HUB",
        f"monitoring hub fixture must classify as HUB; got "
        f"{with_summary['roles'].get(hub_key)!r}",
    )
    resolved_exposes_on = (
        with_hub.devices[cond_key].profile.get("data_roles") or {}
    ).get("exposes_data_to_network")
    check(
        resolved_exposes_on is True,
        "satisfied needed_for must keep exposes_data_to_network=True",
    )

    # --- OR alternatives: separate requires_devices rows, same needed_for ---
    or_key = "or_alt_device"
    or_profile = {
        "device": {
            "manufacturer": "Example",
            "model": "Networked Charger",
            "category_freeform": "solar MPPT charge controller",
        },
        "control_surfaces": [
            {
                "surface": "mobile_app_bluetooth",
                "location_class": "wireless",
                "optional_accessory": False,
                "label_verbatim": "app",
                "path": "control_surfaces[0]",
            }
        ],
        "operator_actions": [
            {
                "action": "monitor charger via app",
                "audience": "operator",
                "context": "daily",
            }
        ],
        "networks": {
            "speaks": [
                {
                    "name_verbatim": "VE.Direct",
                    "physical_or_wireless": "wired",
                }
            ],
            "bridges": [],
        },
        "data_roles": {
            "exposes_data_to_network": True,
            "displays_data_from_other_devices": False,
            "controllable_from_network": False,
        },
        "requires_devices": [
            {
                "description_verbatim": "GX device",
                "needed_for": "data_roles.exposes_data_to_network",
            },
            {
                "description_verbatim": "GlobalLink 520",
                "needed_for": "data_roles.exposes_data_to_network",
            },
        ],
        "safety_role": {
            "is_protective_device": False,
            "has_manual_override": False,
            "has_emergency_procedure": False,
        },
        "protected_by": [],
        "protects": [],
        "supply_requirements": [],
        "evidence": [],
        "confidence": {"overall": 0.9, "notes": ""},
    }
    cerbo_line = {
        "device_key": "cerbo_gx",
        "manufacturer": "Victron Energy",
        "model": "Cerbo GX",
        "description": "Victron Cerbo GX",
        "system_category": "electrical_dc",
    }
    cerbo_profile = {
        "device": {
            "manufacturer": "Victron Energy",
            "model": "Cerbo GX",
            "category_freeform": "GX device monitoring hub",
        },
        "control_surfaces": [
            {
                "surface": "touchscreen",
                "location_class": "remote_wired",
                "optional_accessory": False,
                "label_verbatim": "GX Touch",
                "path": "control_surfaces[0]",
            }
        ],
        "operator_actions": [
            {
                "action": "view system status",
                "audience": "operator",
                "context": "daily",
            }
        ],
        "networks": {
            "speaks": [
                {
                    "name_verbatim": "VE.Direct",
                    "physical_or_wireless": "wired",
                }
            ],
            "bridges": [],
        },
        "data_roles": {
            "exposes_data_to_network": True,
            "displays_data_from_other_devices": True,
            "controllable_from_network": False,
        },
        "requires_devices": [],
        "safety_role": {
            "is_protective_device": False,
            "has_manual_override": False,
            "has_emergency_procedure": False,
        },
        "protected_by": [],
        "protects": [],
        "supply_requirements": [],
        "evidence": [],
        "confidence": {"overall": 0.9, "notes": ""},
    }

    or_equipment_base = list(equipment) + [
        {
            "device_key": or_key,
            "manufacturer": "Example",
            "model": "Networked Charger",
            "description": "solar MPPT charge controller",
            "system_category": "electrical_dc",
        }
    ]
    or_profiles_base = dict(profiles)
    or_profiles_base[or_key] = or_profile

    or_neither = build_vessel_graph(or_equipment_base, or_profiles_base)
    or_neither_sum = or_neither.summary()
    check(
        or_neither_sum["roles"].get(or_key) == "ISLAND",
        f"OR neither-present must be ISLAND; got {or_neither_sum['roles'].get(or_key)!r}",
    )
    check(
        (or_neither.devices[or_key].profile.get("data_roles") or {}).get(
            "exposes_data_to_network"
        )
        is False,
        "OR neither-present must force exposes_data_to_network=False",
    )
    check(
        any(
            f.get("flag") == "unresolved_dependency" and f.get("device") == or_key
            for f in or_neither_sum["flags"]
        ),
        "OR neither-present must emit unresolved_dependency",
    )

    or_with_cerbo_eq = or_equipment_base + [cerbo_line]
    or_with_cerbo_pr = dict(or_profiles_base)
    or_with_cerbo_pr["cerbo_gx"] = cerbo_profile
    or_active = build_vessel_graph(or_with_cerbo_eq, or_with_cerbo_pr)
    or_active_sum = or_active.summary()
    check(
        (or_active.devices[or_key].profile.get("data_roles") or {}).get(
            "exposes_data_to_network"
        )
        is True,
        "OR any-satisfied (Cerbo GX) must keep exposes_data_to_network=True",
    )
    check(
        or_active_sum["roles"].get(or_key) == "ENDPOINT",
        f"OR any-satisfied must be ENDPOINT; got {or_active_sum['roles'].get(or_key)!r}",
    )
    check(
        not any(
            f.get("flag") == "unresolved_dependency" and f.get("device") == or_key
            for f in or_active_sum["flags"]
        ),
        "OR any-satisfied must not emit unresolved_dependency for that path",
    )

    if failures:
        print("FAIL")
        for item in failures:
            print(f"  - {item}")
        return 1

    print("OK - Stage 2 Outremer + conditional capability + OR-alt checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
