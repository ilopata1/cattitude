"""Stage 4 Phase 4 — shared device naming and family helpers for composers.

Composers should ask here for guest-facing labels and catalog-based membership
instead of per-file ``DISPLAY_NAMES`` / ``MANUFACTURER_MODEL`` maps and
Outremer-specific ``device_key`` prefix checks.

Resolution order for guest manufacturer/model labels:
  1. ``equipment[].guest_label`` on the substrate row (per-vessel override)
  2. ``GUEST_LABEL_BY_CATALOG`` (model-level shorthand when registry model
     strings are too verbose for guest parens — e.g. Class T fuse holder → Class T)
  3. ``equipment`` row ``manufacturer`` / ``model``
  4. ``profiles[catalog_key].device`` fields

Role nicknames (``the house batteries``, ``the chartplotters``) are added in a
later composer pass via ``guest_role`` on equipment rows or vessel facts; this
module provides ``catalog_base`` and family grouping first.
"""

from __future__ import annotations

import re
from typing import Any

from guide_reader_voice import format_guest_equipment_label, format_guest_equipment_paren

_SIDE_SUFFIX_RE = re.compile(r"_(port|stbd)$", re.I)
_INSTANCE_SUFFIX_RE = re.compile(r"_\d+$")

# Model-level guest parens overrides (catalog_key → mfr, model). Prefer
# ``guest_label`` on a vessel equipment row when B differs from Outremer.
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

# Guest role phrases (catalog_key or device_key → "the …" wording).
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

# Preferred solar array catalog order (davit primary, coachroof secondary).
SOLAR_MPPT_CATALOG_ORDER: tuple[str, ...] = (
    "victron_mppt_150_60",
    "victron_mppt",
)
DAVIT_MPPT_CATALOG = "victron_mppt_150_60"
COACHROOF_MPPT_CATALOG = "victron_mppt"


def catalog_base(device_key: str) -> str:
    """Strip instance index and port/stbd side suffixes from a device key."""
    base = _INSTANCE_SUFFIX_RE.sub("", str(device_key or ""))
    return _SIDE_SUFFIX_RE.sub("", base)


def build_device_index(equipment_doc: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Map device_key and instance keys to their equipment substrate row."""
    index: dict[str, dict[str, Any]] = {}
    for row in equipment_doc.get("equipment") or []:
        if not isinstance(row, dict):
            continue
        device_key = str(row.get("device_key") or "").strip()
        if device_key:
            index[device_key] = row
        for inst in row.get("instances") or []:
            if not isinstance(inst, dict):
                continue
            instance_key = str(inst.get("instance_key") or "").strip()
            if instance_key:
                index[instance_key] = row
    return index


def catalog_key_for(
    device_key: str, index: dict[str, dict[str, Any]]
) -> str:
    row = index.get(device_key)
    if row:
        return str(row.get("catalog_key") or row.get("device_key") or device_key)
    return catalog_base(device_key)


def keys_for_catalog(
    full_keys: list[str],
    index: dict[str, dict[str, Any]],
    catalog_key: str,
) -> list[str]:
    return [
        k
        for k in full_keys
        if catalog_key_for(k, index) == catalog_key
    ]


def keys_for_catalog_prefix(
    full_keys: list[str],
    index: dict[str, dict[str, Any]],
    prefix: str,
) -> list[str]:
    prefix = str(prefix or "")
    return [
        k
        for k in full_keys
        if catalog_key_for(k, index).startswith(prefix)
    ]


def keys_where_device_key_prefix(keys: list[str], prefix: str) -> list[str]:
    prefix = str(prefix or "")
    return [k for k in keys if str(k).startswith(prefix)]


def keys_where_catalog_contains(
    keys: list[str],
    index: dict[str, dict[str, Any]],
    needle: str,
) -> list[str]:
    needle = str(needle or "").lower()
    return [
        k for k in keys if needle in catalog_key_for(k, index).lower()
    ]


def guest_role_phrase(
    device_key: str,
    index: dict[str, dict[str, Any]],
) -> str:
    key = str(device_key or "")
    if key in GUEST_ROLE_BY_KEY:
        return GUEST_ROLE_BY_KEY[key]
    base = catalog_base(key)
    if base in GUEST_ROLE_BY_KEY:
        return GUEST_ROLE_BY_KEY[base]
    cat = catalog_key_for(key, index)
    if cat in GUEST_ROLE_BY_CATALOG:
        return GUEST_ROLE_BY_CATALOG[cat]
    row = index.get(key)
    if row:
        role = str(row.get("guest_role") or "").strip()
        if role:
            return role
    return "the device"


def guest_device_reference(
    device_key: str,
    equipment_doc: dict[str, Any],
    profiles: dict[str, dict[str, Any]],
    *,
    index: dict[str, dict[str, Any]],
    first_use: set[str],
) -> str:
    """First-use guest phrase: role (Manufacturer Model) or role alone."""
    key = str(device_key or "")
    base = catalog_base(key)
    if key not in first_use and base not in first_use:
        first_use.add(key)
        first_use.add(base)
        role = guest_role_phrase(key, index)
        mfr, mdl = guest_manufacturer_model(
            key, equipment_doc, profiles, index=index
        )
        label = format_guest_equipment_label(mfr, mdl)
        if label:
            return f"{role} ({label})"
        return role
    return guest_role_phrase(key, index)


def inverter_charger_group_phrase(
    count: int,
    equipment_doc: dict[str, Any],
    profiles: dict[str, dict[str, Any]],
    *,
    index: dict[str, dict[str, Any]] | None = None,
) -> str:
    """Guest phrase for Combi count on the Inverter Charger CZone page."""
    idx = index if index is not None else build_device_index(equipment_doc)
    mm = guest_manufacturer_model_for_catalog(
        "mass_combi_pro", equipment_doc, profiles, index=idx
    )
    parens = format_guest_equipment_paren(mm[0], mm[1])
    if count >= 2:
        return f"the two inverter-chargers{parens}"
    if count == 1:
        return f"the inverter-charger{parens}"
    return f"the inverter-chargers{parens}"


def nav_zeus_hub_keys(
    full_keys: list[str],
    graph: Any,
    index: dict[str, dict[str, Any]],
) -> list[str]:
    """Zeus SR chartplotter HUB instance keys (excludes software platform)."""
    return sorted(
        k
        for k in full_keys
        if graph.devices.get(k)
        and graph.devices[k].role == "HUB"
        and catalog_key_for(k, index) == "bg_zeus_sr"
    )


def nav_platform_key(full_keys: list[str], graph: Any) -> str | None:
    return next(
        (k for k in full_keys if graph.devices.get(k) and graph.devices[k].role == "PLATFORM"),
        None,
    )


def first_key_for_catalog(
    full_keys: list[str],
    index: dict[str, dict[str, Any]],
    catalog_key: str,
) -> str | None:
    keys = keys_for_catalog(full_keys, index, catalog_key)
    return keys[0] if keys else None


def first_key_matching_catalog_substring(
    full_keys: list[str],
    index: dict[str, dict[str, Any]],
    needle: str,
) -> str | None:
    keys = keys_where_catalog_contains(full_keys, index, needle)
    return keys[0] if keys else None


def chartplotter_capability_phrase(
    zeus_hub_keys: list[str],
    equipment_doc: dict[str, Any],
    profiles: dict[str, dict[str, Any]],
    *,
    index: dict[str, dict[str, Any]],
    first_use: set[str],
) -> str:
    """Opening nav capability phrase for helm chartplotters."""
    if len(zeus_hub_keys) >= 2:
        mm = guest_manufacturer_model_for_catalog(
            "bg_zeus_sr", equipment_doc, profiles, index=index
        )
        return f"two chartplotters{format_guest_equipment_paren(mm[0], mm[1])}"
    label_key = zeus_hub_keys[0] if zeus_hub_keys else "bg_zeus_sr"
    return guest_device_reference(
        label_key,
        equipment_doc,
        profiles,
        index=index,
        first_use=first_use,
    )


def equipment_row_for(
    device_key: str,
    equipment_doc: dict[str, Any],
    *,
    index: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    idx = index if index is not None else build_device_index(equipment_doc)
    return idx.get(device_key)


def guest_manufacturer_model(
    device_key: str,
    equipment_doc: dict[str, Any],
    profiles: dict[str, dict[str, Any]],
    *,
    index: dict[str, dict[str, Any]] | None = None,
) -> tuple[str, str]:
    """Return (manufacturer, model) for guest parens / first-use labels."""
    idx = index if index is not None else build_device_index(equipment_doc)
    row = idx.get(device_key)
    if row:
        guest = row.get("guest_label")
        if isinstance(guest, dict):
            mfr = str(guest.get("manufacturer") or "").strip()
            mdl = str(guest.get("model") or "").strip()
            if mfr or mdl:
                return mfr, mdl
    cat = catalog_key_for(device_key, idx)
    if cat in GUEST_LABEL_BY_CATALOG:
        return GUEST_LABEL_BY_CATALOG[cat]
    if row:
        return (
            str(row.get("manufacturer") or "").strip(),
            str(row.get("model") or "").strip(),
        )
    prof = profiles.get(cat) or profiles.get(catalog_base(device_key)) or {}
    dev = prof.get("device") if isinstance(prof, dict) else {}
    if not isinstance(dev, dict):
        dev = {}
    return (
        str(dev.get("manufacturer") or "").strip(),
        str(dev.get("model") or "").strip(),
    )


def guest_manufacturer_model_for_catalog(
    catalog_key: str,
    equipment_doc: dict[str, Any],
    profiles: dict[str, dict[str, Any]],
    *,
    index: dict[str, dict[str, Any]] | None = None,
) -> tuple[str, str]:
    """Guest mfr/model for a catalog family (uses parent equipment row if present)."""
    idx = index if index is not None else build_device_index(equipment_doc)
    parent_key = catalog_key
    for row in equipment_doc.get("equipment") or []:
        if not isinstance(row, dict):
            continue
        dk = str(row.get("device_key") or "")
        ck = str(row.get("catalog_key") or dk)
        if dk == catalog_key or ck == catalog_key:
            parent_key = dk or catalog_key
            break
    return guest_manufacturer_model(
        parent_key, equipment_doc, profiles, index=idx
    )


def guest_label_string(
    device_key: str,
    equipment_doc: dict[str, Any],
    profiles: dict[str, dict[str, Any]],
    *,
    index: dict[str, dict[str, Any]] | None = None,
) -> str:
    mfr, mdl = guest_manufacturer_model(
        device_key, equipment_doc, profiles, index=index
    )
    return format_guest_equipment_label(mfr, mdl)


def guest_device_reference_quantity(
    device_key: str,
    quantity: int,
    equipment_doc: dict[str, Any],
    profiles: dict[str, dict[str, Any]],
    *,
    index: dict[str, dict[str, Any]],
    first_use: set[str],
) -> str:
    """Quantity-first guest phrase for bank/family members (e.g. 3 house batteries)."""
    key = str(device_key or "")
    base = catalog_base(key)
    role = guest_role_phrase(base, index)
    bare = role.removeprefix("the ")
    mm = guest_manufacturer_model(key, equipment_doc, profiles, index=index)
    if key not in first_use and base not in first_use:
        first_use.add(key)
        first_use.add(base)
        label = format_guest_equipment_label(mm[0], mm[1])
        if label:
            return f"{quantity} {bare} ({label})"
        return f"{quantity} {bare}"
    return role


def solar_mppt_keys_present(
    equipment_doc: dict[str, Any],
    *,
    graph_device_keys: set[str] | None = None,
) -> tuple[str, ...]:
    """Ordered MPPT catalog keys actually fitted on this vessel."""
    index = build_device_index(equipment_doc)
    present: list[str] = []
    for cat in SOLAR_MPPT_CATALOG_ORDER:
        if cat in index or any(
            catalog_key_for(k, index) == cat for k in index
        ):
            if graph_device_keys is not None and cat not in graph_device_keys:
                # Prefer parent catalog key; also accept instances
                if not any(
                    catalog_key_for(k, index) == cat for k in graph_device_keys
                ):
                    continue
            present.append(cat)
            continue
        # Parent row may use device_key == catalog_key
        for row in equipment_doc.get("equipment") or []:
            if not isinstance(row, dict):
                continue
            dk = str(row.get("device_key") or "")
            ck = str(row.get("catalog_key") or dk)
            if ck == cat or dk == cat:
                if graph_device_keys is not None and dk not in graph_device_keys and cat not in graph_device_keys:
                    continue
                present.append(cat)
                break
    return tuple(present)


def solar_array_controller_keys(
    equipment_doc: dict[str, Any],
) -> dict[str, str | None]:
    """Map array role → MPPT device_key when that controller is fitted.

    Defaults: davit → ``victron_mppt_150_60``, coachroof → ``victron_mppt``.
    Vessel facts may rebind via ``applies_to`` on solar_*_array_observation.
    """
    index = build_device_index(equipment_doc)
    fitted = set(solar_mppt_keys_present(equipment_doc))
    out: dict[str, str | None] = {"davit": None, "coachroof": None}

    for fact in equipment_doc.get("vessel_facts") or []:
        if not isinstance(fact, dict):
            continue
        fid = str(fact.get("id") or "")
        applies = [str(x) for x in (fact.get("applies_to") or [])]
        for key in applies:
            cat = catalog_key_for(key, index) if key in index else key
            if cat not in fitted and key not in fitted:
                continue
            if "davit" in fid and out["davit"] is None:
                out["davit"] = cat if cat in fitted else key
            if "coachroof" in fid and out["coachroof"] is None:
                out["coachroof"] = cat if cat in fitted else key

    if out["davit"] is None and DAVIT_MPPT_CATALOG in fitted:
        out["davit"] = DAVIT_MPPT_CATALOG
    if out["coachroof"] is None and COACHROOF_MPPT_CATALOG in fitted:
        out["coachroof"] = COACHROOF_MPPT_CATALOG
    return out


def equipment_quantity(
    device_key: str,
    equipment_doc: dict[str, Any],
    *,
    index: dict[str, dict[str, Any]] | None = None,
) -> int:
    """Return fitted quantity for a parent equipment row (default 1)."""
    row = equipment_row_for(device_key, equipment_doc, index=index)
    if not row:
        return 1
    try:
        return int(row.get("quantity") or 1)
    except (TypeError, ValueError):
        return 1


def section_plant_key(
    full_keys: list[str],
    index: dict[str, dict[str, Any]],
    *needles: str,
) -> str | None:
    """First section member key matching catalog or device_key substrings."""
    for needle in needles:
        key = first_key_matching_catalog_substring(full_keys, index, needle)
        if key:
            return key
    for needle in needles:
        n = str(needle or "").lower()
        key = next((k for k in full_keys if n in str(k).lower()), None)
        if key:
            return key
    return full_keys[0] if full_keys else None


def propulsion_engines_reference(
    device_key: str,
    quantity: int,
    equipment_doc: dict[str, Any],
    profiles: dict[str, dict[str, Any]],
    *,
    index: dict[str, dict[str, Any]],
    first_use: set[str],
) -> str:
    """First-use guest phrase for propulsion engines (quantity-aware role)."""
    key = str(device_key or "")
    base = catalog_base(key)
    role = "the engines" if quantity >= 2 else "the engine"
    if key not in first_use and base not in first_use:
        first_use.add(key)
        first_use.add(base)
        mm = guest_manufacturer_model(key, equipment_doc, profiles, index=index)
        label = format_guest_equipment_label(mm[0], mm[1])
        if label:
            return f"{role} ({label})"
        return role
    return role


def discharge_valve_quantity_phrase(
    valve_key: str,
    quantity: int,
    equipment_doc: dict[str, Any],
    profiles: dict[str, dict[str, Any]],
    *,
    index: dict[str, dict[str, Any]],
) -> str:
    """Quantity-first phrase for blackwater discharge valves."""
    _, model = guest_manufacturer_model(
        valve_key, equipment_doc, profiles, index=index
    )
    model_bit = f" ({model})" if model else ""
    if quantity > 1:
        return f"{quantity} blackwater tank discharge valves{model_bit}"
    return f"a blackwater tank discharge valve{model_bit}"


def heads_section_member_keys(
    full_keys: list[str],
    index: dict[str, dict[str, Any]],
) -> tuple[list[str], list[str]]:
    """Return (valve_keys, toilet_keys) for Heads section members."""
    valve_keys = [
        k
        for k in full_keys
        if any(
            n in catalog_key_for(k, index).lower() or n in str(k).lower()
            for n in ("discharge", "blackwater", "holding")
        )
    ]
    toilet_keys = [k for k in full_keys if k not in valve_keys]
    return valve_keys, toilet_keys


def house_bank_kwh_estimate(unit_count: int, model: str) -> int | None:
    """Derive bank kWh from MLI-style ``…/6000`` model token (Wh → kWh)."""
    m = re.search(r"/(\d{3,5})\b", str(model or ""))
    if not m or unit_count < 1:
        return None
    wh = int(m.group(1))
    return (wh * unit_count) // 1000

