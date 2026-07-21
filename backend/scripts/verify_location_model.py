"""Offline checks for the structured equipment location model.

Run: python -m scripts.verify_location_model  (from backend/)
No database required — exercises location_model logic only.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from location_model import (  # noqa: E402
    MIGRATION_MAP,
    SUB_ZONE_LABELS,
    SYSTEM_DEFAULT_LOCATION,
    ZONE_LABELS,
    LocationError,
    build_catalog,
    default_location_for,
    generate_label,
    hull_side_applicable,
    validate_location,
    zones_for,
)

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    status = "ok " if cond else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(name)


def zone_slugs(vessel_type: str) -> set[str]:
    return {z["slug"] for z in zones_for(vessel_type)}


# --- Label generation (must reproduce both spec examples) ------------------
check(
    "label: Port / Storage-Lazarette / Lazarette -> 'Port \u2013 Lazarette'",
    generate_label("storage_lazarette", "lazarette", "Port", "")
    == "Port \u2013 Lazarette",
    generate_label("storage_lazarette", "lazarette", "Port", ""),
)
check(
    "label: Engine / Generator Compartment / detail",
    generate_label(
        "engine_machinery_space", "generator_compartment", None,
        "behind soundproofing")
    == "Engine / Machinery Space \u2013 Generator Compartment "
       "(behind soundproofing)",
    generate_label(
        "engine_machinery_space", "generator_compartment", None,
        "behind soundproofing"),
)
check(
    "label: generic sub-zone omitted",
    generate_label("galley", "galley_general", None, "") == "Galley",
    generate_label("galley", "galley_general", None, ""),
)
check(
    "label: 'Deck \u2014 ' prefix stripped",
    generate_label("deck_bow_foredeck", "anchor_locker_ground_tackle", None, "")
    == "Bow / Foredeck \u2013 Anchor Locker/Ground Tackle",
    generate_label("deck_bow_foredeck", "anchor_locker_ground_tackle", None, ""),
)
check(
    "label: redundant sub-zone collapses (Foredeck in Bow / Foredeck)",
    generate_label("deck_bow_foredeck", "foredeck", None, "") == "Foredeck",
    generate_label("deck_bow_foredeck", "foredeck", None, ""),
)


# --- Zone filtering per boat type ------------------------------------------
check(
    "flybridge offered for power_catamaran/motor_yacht/sport_fishing only",
    all("flybridge_upper_deck" in zone_slugs(vt)
        for vt in ("power_catamaran", "motor_yacht", "sport_fishing"))
    and all("flybridge_upper_deck" not in zone_slugs(vt)
            for vt in ("cruising_monohull", "sailing_catamaran",
                       "sailing_trimaran")),
)
check(
    "rigging offered for cruising_monohull/sailing_cat/sailing_tri only",
    all("rigging_sail_handling" in zone_slugs(vt)
        for vt in ("cruising_monohull", "sailing_catamaran",
                   "sailing_trimaran"))
    and all("rigging_sail_handling" not in zone_slugs(vt)
            for vt in ("power_catamaran", "motor_yacht", "sport_fishing")),
)


# --- Hull side -------------------------------------------------------------
check(
    "hull side: multihull + eligible zone only",
    hull_side_applicable("engine_machinery_space", "sailing_catamaran")
    and not hull_side_applicable("engine_machinery_space", "cruising_monohull")
    and not hull_side_applicable("galley", "sailing_catamaran"),
)


# --- Bridgedeck saloon sub-zone -------------------------------------------
def has_bridgedeck(vt: str) -> bool:
    catalog = build_catalog(vt)
    for z in catalog["zones"]:
        if z["slug"] == "saloon_living_area":
            return any(s["slug"] == "bridgedeck_saloon" for s in z["subZones"])
    return False


check(
    "bridgedeck saloon: multihulls only",
    all(has_bridgedeck(vt) for vt in ("sailing_catamaran", "sailing_trimaran",
                                      "power_catamaran"))
    and not any(has_bridgedeck(vt) for vt in ("cruising_monohull",
                                              "motor_yacht", "sport_fishing")),
)


# --- Server-side validation rejects hidden combos --------------------------
def rejects(vt, zone, sub, hull=None, detail=None) -> bool:
    try:
        validate_location(vt, zone, sub, hull, detail)
        return False
    except LocationError:
        return True


check(
    "reject: rigging zone on motor_yacht",
    rejects("motor_yacht", "rigging_sail_handling", "mast_base_step"),
)
check(
    "reject: hull side on monohull engine bay",
    rejects("cruising_monohull", "engine_machinery_space", "engine_bay", "Port"),
)
check(
    "reject: bridgedeck saloon on monohull",
    rejects("cruising_monohull", "saloon_living_area", "bridgedeck_saloon"),
)
check(
    "reject: sub-zone not belonging to zone",
    rejects("sailing_catamaran", "galley", "engine_bay"),
)
check(
    "accept: valid multihull engine bay + hull side",
    not rejects("sailing_catamaran", "engine_machinery_space", "engine_bay",
                "Starboard"),
)


# --- System defaults -------------------------------------------------------
check(
    "every system_category has a default location",
    all(default_location_for(sc, "sailing_catamaran") is not None
        or SYSTEM_DEFAULT_LOCATION[sc][0] in ("rigging_sail_handling",)
        for sc in SYSTEM_DEFAULT_LOCATION),
)
check(
    "rigging default is None on motor_yacht (zone unavailable)",
    default_location_for("rigging_sail_handling", "motor_yacht") is None,
)
check(
    "propulsion default is engine bay",
    default_location_for("propulsion_and_machinery", "cruising_monohull")
    == {"zone": "engine_machinery_space", "sub_zone": "engine_bay"},
)


# --- Migration map integrity ----------------------------------------------
old_zones = {
    "bow_foredeck", "helm_station", "cockpit_aft_deck", "saloon_main_cabin",
    "galley", "engine_room", "lazarette_aft_storage", "swim_platform_transom",
    "below_decks_bilge", "port_hull", "starboard_hull", "bridgedeck_coachroof",
    "trampoline_foredeck_netting", "mast_base_deck_step",
    "keel_centreboard_trunk", "quarter_berth_aft_cabin", "flybridge",
    "engine_room_walkin", "bait_tackle_station",
}
check(
    "migration map covers all 19 legacy zones",
    set(MIGRATION_MAP) == old_zones,
    str(old_zones ^ set(MIGRATION_MAP)),
)
bad_targets = []
for old, m in MIGRATION_MAP.items():
    z = m.get("zone")
    sz = m.get("sub_zone")
    if z is not None and z not in ZONE_LABELS:
        bad_targets.append(f"{old}->zone {z}")
    if z is not None and sz is not None and sz not in SUB_ZONE_LABELS.get(z, {}):
        bad_targets.append(f"{old}->sub {sz}")
check("migration map targets all exist in catalog", not bad_targets,
      ", ".join(bad_targets))


print()
if failures:
    print(f"{len(failures)} check(s) FAILED")
    sys.exit(1)
print("All location-model checks passed.")
