"""Offline checks for the equipment-type taxonomy (no DB required).

Run: python -m scripts.verify_equipment_category  (from backend/)
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from equipment_category import (  # noqa: E402
    EQUIPMENT_CATEGORY_LABELS,
    EQUIPMENT_CATEGORY_SLUGS,
    EquipmentCategoryError,
    OLD_TO_NEW,
    categories_for,
    label,
    validate_category,
)
from guide_module_catalog import SYSTEM_CATALOG  # noqa: E402
from location_model import SYSTEM_DEFAULT_LOCATION  # noqa: E402

_OLD_VALUES = {
    "propulsion", "fuel_system", "electrical_dc", "electrical_ac_shore_power",
    "freshwater_system", "sanitation", "bilge_and_drainage", "steering",
    "anchoring_ground_tackle", "rigging_sail_handling", "sails",
    "navigation_electronics", "communications", "refrigeration_galley",
    "hvac_climate", "safety_equipment", "tenders_davits", "stabilisation",
    "entertainment_connectivity", "hull_and_structure",
}

_failures: list[str] = []


def check(name: str, ok: bool) -> None:
    status = "ok  " if ok else "FAIL"
    if not ok:
        _failures.append(name)
    print(f"[{status}] {name}")


check("18 canonical categories", len(EQUIPMENT_CATEGORY_SLUGS) == 18)
check("labels cover every slug",
      set(EQUIPMENT_CATEGORY_LABELS) == set(EQUIPMENT_CATEGORY_SLUGS))
check("rigging label", label("rigging_and_sail_handling") == "Rigging and Sail Handling")
check("hvac label", label("hvac") == "HVAC")

check("OLD_TO_NEW covers all 20 retired values",
      set(OLD_TO_NEW) == _OLD_VALUES)
check("OLD_TO_NEW targets are all valid new slugs",
      all(v in EQUIPMENT_CATEGORY_LABELS for v in OLD_TO_NEW.values()))
check("sails merges into rigging",
      OLD_TO_NEW["sails"] == "rigging_and_sail_handling")

check("default location keys == new slugs",
      set(SYSTEM_DEFAULT_LOCATION) == set(EQUIPMENT_CATEGORY_SLUGS))

catalog_cats = {
    c for meta in SYSTEM_CATALOG.values()
    for c in meta.get("equipment_categories", [])
}
check("guide catalog references only valid new slugs",
      catalog_cats <= set(EQUIPMENT_CATEGORY_SLUGS))

# Sail-only filtering (Rigging offered only when ALL selected types are sailing)
sail = ["cruising_monohull", "sailing_catamaran"]
power = ["power_catamaran", "motor_yacht"]
mixed = ["cruising_monohull", "power_catamaran"]
check("rigging offered when all selected types are sailing",
      any(c["slug"] == "rigging_and_sail_handling" for c in categories_for(sail)))
check("rigging omitted for power-only vessel types",
      all(c["slug"] != "rigging_and_sail_handling" for c in categories_for(power)))
check("rigging omitted when any non-sailing type is selected",
      all(c["slug"] != "rigging_and_sail_handling" for c in categories_for(mixed)))
check("rigging omitted when no vessel type is selected",
      all(c["slug"] != "rigging_and_sail_handling" for c in categories_for([])))
check("power vessel still gets other 17 categories",
      len(categories_for(power)) == 17)

check("validate_category accepts rigging on all-sail selection",
      validate_category("rigging_and_sail_handling", sail) == "rigging_and_sail_handling")

for label_name, vt in [("power vessel", power), ("mixed selection", mixed)]:
    try:
        validate_category("rigging_and_sail_handling", vt)
        check(f"validate_category rejects rigging on {label_name}", False)
    except EquipmentCategoryError:
        check(f"validate_category rejects rigging on {label_name}", True)

try:
    validate_category("not_a_category", sail)
    check("validate_category rejects unknown", False)
except EquipmentCategoryError:
    check("validate_category rejects unknown", True)

if _failures:
    print(f"\n{len(_failures)} FAILED")
    sys.exit(1)
print("\nAll checks passed.")
