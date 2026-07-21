"""Reshape the equipment ``system_category`` enum to the new 18-value taxonomy.

Renames most values and merges a few (sails -> rigging_and_sail_handling,
refrigeration_galley -> galley_appliances, stabilisation ->
propulsion_and_machinery, entertainment_connectivity -> communications). The
new "deck_hardware_and_equipment" bucket has no legacy source. Existing
equipment rows are remapped best-effort via the OLD_TO_NEW map.
"""

import sys
from pathlib import Path

from alembic import op

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from equipment_category import (  # noqa: E402
    EQUIPMENT_CATEGORY_SLUGS,
    OLD_TO_NEW,
)

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None

# Lossy reverse mapping for downgrade (merges pick a representative old value;
# the net-new bucket falls back to hull_and_structure).
_NEW_TO_OLD = {
    "hull_and_structure": "hull_and_structure",
    "propulsion_and_machinery": "propulsion",
    "steering_and_controls": "steering",
    "electrical_dc": "electrical_dc",
    "electrical_ac": "electrical_ac_shore_power",
    "fuel_system": "fuel_system",
    "fresh_water_and_plumbing": "freshwater_system",
    "sanitation": "sanitation",
    "bilge_and_drainage": "bilge_and_drainage",
    "hvac": "hvac_climate",
    "navigation_and_electronics": "navigation_electronics",
    "communications": "communications",
    "safety_and_emergency_equipment": "safety_equipment",
    "ground_tackle_and_mooring": "anchoring_ground_tackle",
    "rigging_and_sail_handling": "rigging_sail_handling",
    "deck_hardware_and_equipment": "hull_and_structure",
    "galley_appliances": "refrigeration_galley",
    "tenders_and_watersports": "tenders_davits",
}

_OLD_VALUES = [
    "propulsion", "fuel_system", "electrical_dc", "electrical_ac_shore_power",
    "freshwater_system", "sanitation", "bilge_and_drainage", "steering",
    "anchoring_ground_tackle", "rigging_sail_handling", "sails",
    "navigation_electronics", "communications", "refrigeration_galley",
    "hvac_climate", "safety_equipment", "tenders_davits", "stabilisation",
    "entertainment_connectivity", "hull_and_structure",
]


def _swap_enum(new_type: str, values: list[str], mapping: dict[str, str],
               fallback: str) -> None:
    enum_values = ", ".join(f"'{v}'" for v in values)
    op.execute(f"CREATE TYPE {new_type} AS ENUM ({enum_values})")
    case_when = " ".join(
        f"WHEN '{old}' THEN '{new}'" for old, new in mapping.items()
    )
    op.execute(
        f"""
        ALTER TABLE equipment
            ALTER COLUMN system_category TYPE {new_type}
            USING (
                CASE system_category::text
                    {case_when}
                    ELSE '{fallback}'
                END
            )::{new_type}
        """
    )
    op.execute("DROP TYPE system_category")
    op.execute(f"ALTER TYPE {new_type} RENAME TO system_category")


def upgrade() -> None:
    _swap_enum(
        "system_category_new",
        EQUIPMENT_CATEGORY_SLUGS,
        OLD_TO_NEW,
        fallback="hull_and_structure",
    )


def downgrade() -> None:
    _swap_enum(
        "system_category_old",
        _OLD_VALUES,
        _NEW_TO_OLD,
        fallback="hull_and_structure",
    )
