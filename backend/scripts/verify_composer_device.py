"""Unit checks for guide_composer_device helpers.

Usage (from backend/):
  python scripts/verify_composer_device.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from guide_composer_device import (
    build_device_index,
    catalog_base,
    catalog_key_for,
    chartplotter_capability_phrase,
    discharge_valve_quantity_phrase,
    guest_manufacturer_model_for_catalog,
    guest_role_phrase,
    heads_section_member_keys,
    inverter_charger_group_phrase,
    keys_for_catalog_prefix,
    nav_zeus_hub_keys,
    propulsion_engines_reference,
    section_plant_key,
)

OUTREMER = _BACKEND / "fixtures" / "pipeline" / "outremer"


def main() -> int:
    failures: list[str] = []
    equipment_doc = json.loads((OUTREMER / "equipment.json").read_text(encoding="utf-8"))
    profiles = json.loads((OUTREMER / "profiles.json").read_text(encoding="utf-8"))
    index = build_device_index(equipment_doc)

    if catalog_base("mli_ultra_2") != "mli_ultra":
        failures.append("catalog_base strips instance suffix")
    if catalog_base("alpha_pro_iii_port") != "alpha_pro_iii":
        failures.append("catalog_base strips port/stbd suffix")

    if catalog_key_for("coi_2", index) != "coi":
        failures.append("instance key resolves parent catalog_key")
    if catalog_key_for("class_t_3", index) != "class_t":
        failures.append("class_t instance resolves catalog_key")

    full_keys = [
        "coi_1",
        "coi_2",
        "class_t_1",
        "class_t_2",
        "blue_sea_acr",
    ]
    coi = keys_for_catalog_prefix(full_keys, index, "coi")
    if coi != ["coi_1", "coi_2"]:
        failures.append(f"keys_for_catalog_prefix coi got {coi}")

    mm = guest_manufacturer_model_for_catalog("class_t", equipment_doc, profiles, index=index)
    if mm != ("Blue Sea", "Class T"):
        failures.append(f"class_t guest mm got {mm!r}")

    mm_coi = guest_manufacturer_model_for_catalog("coi", equipment_doc, profiles, index=index)
    if mm_coi != ("CZone", "Combination Output Interface"):
        failures.append(f"coi guest mm got {mm_coi!r}")

    role_touch = guest_role_phrase("czone_touch_7", index)
    if role_touch != "the touchscreen":
        failures.append(f"czone_touch_7 role got {role_touch!r}")

    phrase_two = inverter_charger_group_phrase(
        2,
        equipment_doc,
        profiles,
        index=index,
    )
    if "two inverter-chargers" not in phrase_two:
        failures.append(f"combi group phrase (2) got {phrase_two!r}")

    from system_graph import build_vessel_graph

    graph = build_vessel_graph(
        list(equipment_doc["equipment"]),
        profiles,
        relations=list(equipment_doc.get("relations") or []),
        equipment_doc=equipment_doc,
        vessel_artifact_facts=equipment_doc.get("vessel_artifact_facts"),
    )
    full_keys = [
        k for k, d in graph.devices.items() if d.section == "nav" and d.role in {"HUB", "PLATFORM", "ENDPOINT", "ISLAND"}
    ]
    zeus = nav_zeus_hub_keys(full_keys, graph, index)
    if zeus != ["bg_zeus_sr_1", "bg_zeus_sr_2"]:
        failures.append(f"nav zeus hubs got {zeus}")

    cp = chartplotter_capability_phrase(
        zeus, equipment_doc, profiles, index=index, first_use=set()
    )
    if "two chartplotters" not in cp or "Zeus SR 12" not in cp:
        failures.append(f"chartplotter phrase got {cp!r}")

    eng = section_plant_key(["nanni_n4_65"], index, "nanni", "engine")
    if eng != "nanni_n4_65":
        failures.append(f"section_plant_key engines got {eng!r}")

    wm = section_plant_key(["dessalator_duo"], index, "dessalator", "watermaker")
    if wm != "dessalator_duo":
        failures.append(f"section_plant_key water got {wm!r}")

    valves, toilets = heads_section_member_keys(
        ["blackwater_tank_discharge_valve", "tecma_compass_eco"], index
    )
    if valves != ["blackwater_tank_discharge_valve"] or toilets != ["tecma_compass_eco"]:
        failures.append(f"heads_section_member_keys got valves={valves} toilets={toilets}")

    eng_ref = propulsion_engines_reference(
        "nanni_n4_65",
        2,
        equipment_doc,
        profiles,
        index=index,
        first_use=set(),
    )
    if "the engines" not in eng_ref or "N4.65" not in eng_ref:
        failures.append(f"propulsion_engines_reference got {eng_ref!r}")

    valve_phrase = discharge_valve_quantity_phrase(
        "blackwater_tank_discharge_valve",
        3,
        equipment_doc,
        profiles,
        index=index,
    )
    if "3 blackwater tank discharge valves" not in valve_phrase:
        failures.append(f"discharge_valve_quantity_phrase got {valve_phrase!r}")

    role_wm = guest_role_phrase("dessalator_duo", index)
    if role_wm != "the watermaker":
        failures.append(f"dessalator_duo role got {role_wm!r}")

    if failures:
        print("FAIL:")
        for line in failures:
            print(f"  - {line}")
        return 1

    print("OK — guide_composer_device helpers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
