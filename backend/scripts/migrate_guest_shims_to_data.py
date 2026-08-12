"""Big-bang: seed GUEST_* shim values into Outremer fixture data.

Run once from backend/:
  python scripts/migrate_guest_shims_to_data.py

Then empty the maps in guide_composer_device.py (done by that module change).
"""

from __future__ import annotations

import json
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent

# Snapshot of shim tables at migration time (before maps are emptied).
GUEST_LABEL_BY_CATALOG: dict[str, tuple[str, str]] = {
    "blue_sea_acr": ("Blue Sea Systems", "Automatic Charging Relays (ACR)"),
    "busbar": ("ProInstaller", "busbar"),
    "class_t": ("Blue Sea", "Class T"),
    "coi": ("CZone", "Combination Output Interface"),
    "masterbus_bridge_interface": ("Mastervolt", "MasterBus Bridge Interface"),
    "masterbus_usb_interface": ("Mastervolt", "MasterBus USB Interface"),
    "plain_battery_switch": ("", "rotary battery switch"),
    "czone_touch_7": ("CZone", "Touch 7"),
    "czone_2_0": ("CZone", "2.0"),
    "mass_combi_pro": ("Mastervolt", "Mass Combi Pro"),
    "mli_ultra": ("Mastervolt", "MLI Ultra"),
    "bg_zeus_sr": ("B&G", "Zeus SR 12"),
    "bg_zeus_sr_software": ("B&G", "Zeus SR Software"),
    "bg_halo_20_plus": ("B&G", "Halo 20+"),
    "sea_ai_watchkeeper": ("Sea.AI", "Watchkeeper"),
    "victron_mppt_150_60": ("Victron", "SmartSolar MPPT 150/60"),
    "victron_mppt": ("Victron", "SmartSolar MPPT 75/15"),
    "silentwind": ("Silentwind", "Hybrid 1000"),
    "alpha_pro_iii": ("Mastervolt", "Alpha Pro III"),
    "fischer_panda_8000i": ("Fischer Panda", "Panda 8000i"),
    "nanni_n4_65": ("Nanni", "N4.65"),
    "dessalator_duo": ("Dessalator", "Duo AC & DC Navigator"),
    "blackwater_tank_discharge_valve": ("", "Blackwater Tank Discharge Valve"),
    "tecma_compass_eco": ("Tecma", "Compass Eco"),
    "frigomar_air_conditioning_system": ("Frigomar", "self-contained BLDC"),
}

GUEST_ROLE_BY_CATALOG: dict[str, str] = {
    "czone_touch_7": "the touchscreen",
    "czone_2_0": "CZone",
    "mass_combi_pro": "the inverter-chargers",
    "mli_ultra": "the house batteries",
    "bg_zeus_sr": "the chartplotters",
    "bg_zeus_sr_software": "Zeus SR Software",
    "bg_halo_20_plus": "the radar",
    "sea_ai_watchkeeper": "the AI camera system",
    "victron_mppt_150_60": "the davit array controller",
    "victron_mppt": "the coachroof array controllers",
    "silentwind": "the wind generator",
    "alpha_pro_iii": "the alternator regulators",
    "fischer_panda_8000i": "the generator",
    "nanni_n4_65": "the engines",
    "dessalator_duo": "the watermaker",
    "blackwater_tank_discharge_valve": "the blackwater tank discharge valves",
    "tecma_compass_eco": "the electric heads",
    "frigomar_air_conditioning_system": "the air conditioner",
}

GUEST_ROLE_BY_KEY: dict[str, str] = {
    "mass_combi_pro_1": "the port inverter-charger",
    "mass_combi_pro_2": "the starboard inverter-charger",
    "mli_ultra_1": "house battery 1",
    "mli_ultra_2": "house battery 2",
    "mli_ultra_3": "house battery 3",
    "bg_zeus_sr_1": "the chartplotters",
    "bg_zeus_sr_2": "the chartplotters",
    "alpha_pro_iii_port": "the port alternator regulator",
    "alpha_pro_iii_stbd": "the starboard alternator regulator",
}

CATALOG_TO_CLASS: dict[str, str] = {
    "blue_sea_acr": "automatic_charging_relay",
    "busbar": "busbar",
    "class_t": "class_t_fuse",
    "coi": "combination_output_interface",
    "masterbus_bridge_interface": "masterbus_bridge",
    "masterbus_usb_interface": "masterbus_usb",
    "plain_battery_switch": "battery_switch",
    "czone_touch_7": "digital_switching_touchscreen",
    "czone_2_0": "digital_switching_platform",
    "mass_combi_pro": "inverter_charger",
    "mli_ultra": "lithium_battery",
    "bg_zeus_sr": "chartplotter",
    "bg_zeus_sr_software": "chartplotter",
    "bg_halo_20_plus": "radar",
    "sea_ai_watchkeeper": "ai_camera",
    "victron_mppt": "solar_charge_controller",
    "victron_mppt_150_60": "solar_charge_controller",
    "alpha_pro_iii": "alternator_regulator",
    "fischer_panda_8000i": "generator",
    "nanni_n4_65": "propulsion_engine",
    "dessalator_duo": "watermaker",
    "blackwater_tank_discharge_valve": "blackwater_discharge_valve",
    "tecma_compass_eco": "electric_toilet",
    "frigomar_air_conditioning_system": "air_conditioner",
    "silentwind": "wind_generator",
}

EQUIPMENT_PATHS = [
    _BACKEND / "fixtures/pipeline/outremer/equipment.json",
    _BACKEND / "fixtures/pipeline/outremer_post_batch_b/equipment.json",
]
PROFILE_PATHS = [
    _BACKEND / "fixtures/pipeline/outremer/profiles.json",
    _BACKEND / "fixtures/pipeline/outremer_post_batch_b/profiles.json",
]


def _catalog_key(row: dict) -> str:
    return str(row.get("catalog_key") or row.get("device_key") or "").strip()


def patch_equipment(path: Path) -> None:
    doc = json.loads(path.read_text(encoding="utf-8"))
    for row in doc.get("equipment") or []:
        if not isinstance(row, dict):
            continue
        dk = str(row.get("device_key") or "").strip()
        cat = _catalog_key(row)

        if cat in GUEST_LABEL_BY_CATALOG and "guest_label" not in row:
            mfr, mdl = GUEST_LABEL_BY_CATALOG[cat]
            row["guest_label"] = {"manufacturer": mfr, "model": mdl}

        # Parent / single-key role
        if dk in GUEST_ROLE_BY_KEY:
            row["guest_role"] = GUEST_ROLE_BY_KEY[dk]
        elif cat in GUEST_ROLE_BY_CATALOG and "guest_role" not in row:
            row["guest_role"] = GUEST_ROLE_BY_CATALOG[cat]

        for inst in row.get("instances") or []:
            if not isinstance(inst, dict):
                continue
            ik = str(inst.get("instance_key") or "").strip()
            if ik in GUEST_ROLE_BY_KEY:
                inst["guest_role"] = GUEST_ROLE_BY_KEY[ik]

    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK equipment {path.relative_to(_BACKEND)}")


def patch_profiles(path: Path) -> None:
    profiles = json.loads(path.read_text(encoding="utf-8"))
    for key, profile in profiles.items():
        if not isinstance(profile, dict):
            continue
        if profile.get("plant_class"):
            continue
        cls = CATALOG_TO_CLASS.get(key)
        if cls:
            # Insert plant_class as first key for readability
            profiles[key] = {"plant_class": cls, **profile}
    path.write_text(
        json.dumps(profiles, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"OK profiles {path.relative_to(_BACKEND)}")


def main() -> int:
    for p in EQUIPMENT_PATHS:
        patch_equipment(p)
    for p in PROFILE_PATHS:
        patch_profiles(p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
