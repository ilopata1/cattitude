"""Stage 4 Phase 4 — shared device naming and family helpers for composers.

Composers should ask here for guest-facing labels and catalog-based membership
instead of per-file ``DISPLAY_NAMES`` / ``MANUFACTURER_MODEL`` maps and
Outremer-specific ``device_key`` prefix checks.

Resolution order for guest manufacturer/model labels:
  1. ``equipment[].guest_label`` (or instance overlay) on the substrate row
  2. ``equipment`` row ``manufacturer`` / ``model``
  3. ``profiles[catalog_key].device`` fields

Resolution order for guest role phrases (``the davit array controller``, …):
  1. ``guest_role`` on the instance or parent substrate row (override)
  2. Derived default from ``plant_class`` + quantity + side
  3. ``\"the device\"``

``GUEST_*`` shim maps were emptied in the 2026-07-31 big-bang migration —
seed data via ``scripts/migrate_guest_shims_to_data.py`` / fixture fields.
See ``guide-stage4-class-role-design-note.md``.
"""

from __future__ import annotations

import re
from typing import Any

from guide_plant_class import profile_plant_class
from guide_reader_voice import format_guest_equipment_label, format_guest_equipment_paren

_SIDE_SUFFIX_RE = re.compile(r"_(port|stbd)$", re.I)
_INSTANCE_SUFFIX_RE = re.compile(r"_\d+$")

# Emptied 2026-07-31 — kept as empty dicts so any leftover import/reference
# fails closed rather than resurrecting Outremer hardcoding.
GUEST_LABEL_BY_CATALOG: dict[str, tuple[str, str]] = {}
GUEST_ROLE_BY_CATALOG: dict[str, str] = {}
GUEST_ROLE_BY_KEY: dict[str, str] = {}

# plant_class → (singular bare noun, plural bare noun) for derived "the …"
_DERIVED_ROLE_BARE: dict[str, tuple[str, str]] = {
    "solar_charge_controller": ("solar charge controller", "solar charge controllers"),
    "lithium_battery": ("battery", "batteries"),
    "inverter_charger": ("inverter-charger", "inverter-chargers"),
    "alternator_regulator": ("alternator regulator", "alternator regulators"),
    "generator": ("generator", "generators"),
    "propulsion_engine": ("engine", "engines"),
    "watermaker": ("watermaker", "watermakers"),
    "air_conditioner": ("air conditioner", "air conditioners"),
    "chartplotter": ("chartplotter", "chartplotters"),
    "radar": ("radar", "radars"),
    "ai_camera": ("AI camera system", "AI camera systems"),
    "digital_switching_touchscreen": ("touchscreen", "touchscreens"),
    "digital_switching_platform": ("digital switching platform", "digital switching platforms"),
    "combination_output_interface": (
        "combination output interface",
        "combination output interfaces",
    ),
    "automatic_charging_relay": ("automatic charging relay", "automatic charging relays"),
    "battery_switch": ("battery switch", "battery switches"),
    "class_t_fuse": ("Class T fuse", "Class T fuses"),
    "busbar": ("busbar", "busbars"),
    "masterbus_bridge": ("MasterBus bridge", "MasterBus bridges"),
    "masterbus_usb": ("MasterBus USB interface", "MasterBus USB interfaces"),
    "blackwater_discharge_valve": (
        "blackwater tank discharge valve",
        "blackwater tank discharge valves",
    ),
    "electric_toilet": ("electric heads", "electric heads"),
    "wind_generator": ("wind generator", "wind generators"),
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
    """Map device_key and instance keys to their equipment substrate row.

    Instance keys get a shallow overlay so ``guest_role`` / ``guest_label`` on
    the instance win over the parent row (needed for port/stbd Combis, numbered
    house batteries, etc.).
    """
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
            if not instance_key:
                continue
            overlay = dict(row)
            for field in ("guest_role", "guest_label", "instance_label", "side"):
                if field in inst and inst[field] not in (None, ""):
                    overlay[field] = inst[field]
            overlay["_instance_key"] = instance_key
            index[instance_key] = overlay
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


def _normalize_side(side: str | None) -> str | None:
    s = str(side or "").strip().lower()
    if s in {"port", "p"}:
        return "port"
    if s in {"stbd", "starboard", "s"}:
        return "starboard"
    return None


def derive_guest_role_phrase(
    *,
    plant_class: str | None,
    quantity: int = 1,
    side: str | None = None,
) -> str | None:
    """Hybrid default nickname from class + qty + side. None if unknown class."""
    bare = _DERIVED_ROLE_BARE.get(str(plant_class or "").strip())
    if not bare:
        return None
    singular, plural = bare
    side_word = _normalize_side(side)
    if side_word:
        return f"the {side_word} {singular}"
    noun = plural if quantity > 1 else singular
    return f"the {noun}"


def guest_role_phrase(
    device_key: str,
    index: dict[str, dict[str, Any]],
    *,
    profiles: dict[str, dict[str, Any]] | None = None,
) -> str:
    key = str(device_key or "")
    row = index.get(key)
    if row:
        role = str(row.get("guest_role") or "").strip()
        if role:
            return role
    # Derive from plant_class when no stored override.
    if row is not None and profiles is not None:
        cat = catalog_key_for(key, index)
        prof = profiles.get(cat) or profiles.get(catalog_base(key)) or {}
        try:
            qty = int(row.get("quantity") or 1)
        except (TypeError, ValueError):
            qty = 1
        derived = derive_guest_role_phrase(
            plant_class=profile_plant_class(prof),
            quantity=qty,
            side=str(row.get("side") or "") or None,
        )
        if derived:
            return derived
    if key in GUEST_ROLE_BY_KEY:
        return GUEST_ROLE_BY_KEY[key]
    base = catalog_base(key)
    if base in GUEST_ROLE_BY_KEY:
        return GUEST_ROLE_BY_KEY[base]
    cat = catalog_key_for(key, index)
    if cat in GUEST_ROLE_BY_CATALOG:
        return GUEST_ROLE_BY_CATALOG[cat]
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
    profiles: dict[str, dict[str, Any]] | None = None,
) -> tuple[str, ...]:
    """Ordered MPPT catalog keys actually fitted on this vessel.

    Prefers ``SOLAR_MPPT_CATALOG_ORDER`` when those catalogs are fitted so
    Outremer davit→coachroof order holds. Also accepts any fitted row whose
    profile ``plant_class`` (or normalized freeform) is
    ``solar_charge_controller``.
    """
    index = build_device_index(equipment_doc)
    present: list[str] = []
    seen: set[str] = set()

    def _accept(cat: str, device_key: str) -> None:
        if cat in seen:
            return
        if graph_device_keys is not None:
            if (
                device_key not in graph_device_keys
                and cat not in graph_device_keys
                and not any(
                    catalog_key_for(k, index) == cat for k in graph_device_keys
                )
            ):
                return
        seen.add(cat)
        present.append(cat)

    for cat in SOLAR_MPPT_CATALOG_ORDER:
        if cat in index or any(catalog_key_for(k, index) == cat for k in index):
            _accept(cat, cat)
            continue
        for row in equipment_doc.get("equipment") or []:
            if not isinstance(row, dict):
                continue
            dk = str(row.get("device_key") or "")
            ck = str(row.get("catalog_key") or dk)
            if ck == cat or dk == cat:
                _accept(cat, dk or cat)
                break

    if profiles:
        for row in equipment_doc.get("equipment") or []:
            if not isinstance(row, dict):
                continue
            dk = str(row.get("device_key") or "").strip()
            ck = str(row.get("catalog_key") or dk).strip()
            if not ck:
                continue
            prof = profiles.get(ck) or profiles.get(catalog_base(dk)) or {}
            if profile_plant_class(prof) != "solar_charge_controller":
                continue
            _accept(ck, dk or ck)

    return tuple(present)


def solar_array_controller_keys(
    equipment_doc: dict[str, Any],
    *,
    profiles: dict[str, dict[str, Any]] | None = None,
) -> dict[str, str | None]:
    """Map array role → MPPT device_key when that controller is fitted.

    Defaults: davit → ``victron_mppt_150_60``, coachroof → ``victron_mppt``.
    Vessel facts may rebind via ``applies_to`` on solar_*_array_observation.
    """
    index = build_device_index(equipment_doc)
    fitted = set(solar_mppt_keys_present(equipment_doc, profiles=profiles))
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

