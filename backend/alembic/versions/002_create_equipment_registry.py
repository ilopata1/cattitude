"""Create equipment registry tables."""

from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE equipment (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            manufacturer TEXT,
            model TEXT,
            vessel_types vessel_type[] NOT NULL DEFAULT '{}',
            zone zone NOT NULL,
            zone_cardinality zone_cardinality NOT NULL DEFAULT 'fixed',
            system_category system_category NOT NULL,
            equipment_class equipment_class NOT NULL,
            configuration_tier configuration_tier NOT NULL,
            option_pack_id UUID,
            has_formal_manual BOOLEAN NOT NULL DEFAULT false,
            identification_method identification_method NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_equipment_manufacturer_model ON equipment (manufacturer, model)"
    )
    op.execute(
        "CREATE INDEX idx_equipment_system_category ON equipment (system_category)"
    )
    op.execute(
        "CREATE INDEX idx_equipment_vessel_types ON equipment USING GIN (vessel_types)"
    )

    op.execute(
        """
        CREATE TABLE option_pack (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            manufacturer TEXT NOT NULL,
            applicable_models TEXT[] NOT NULL DEFAULT '{}',
            pack_name TEXT NOT NULL,
            bill_of_materials UUID[] NOT NULL DEFAULT '{}',
            source pack_source NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        ALTER TABLE equipment
            ADD CONSTRAINT fk_equipment_option_pack
            FOREIGN KEY (option_pack_id) REFERENCES option_pack(id)
        """
    )

    op.execute(
        """
        CREATE TABLE manufacturer_config_availability (
            manufacturer TEXT PRIMARY KEY,
            has_public_configurator BOOLEAN NOT NULL DEFAULT false,
            pack_data_source_tier source_tier NOT NULL DEFAULT 'tier_2',
            last_verified DATE
        )
        """
    )

    op.execute(
        """
        CREATE TABLE equipment_constraint (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
            constraint_type constraint_type NOT NULL,
            target_equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
            target_group_id UUID,
            source pack_source NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT chk_constraint_target CHECK (
                (constraint_type IN ('excludes', 'requires') AND target_equipment_id IS NOT NULL)
                OR
                (constraint_type = 'mutually_exclusive_group' AND target_group_id IS NOT NULL)
            )
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_equipment_constraint_equipment ON equipment_constraint (equipment_id)"
    )
    op.execute(
        """
        CREATE INDEX idx_equipment_constraint_group
            ON equipment_constraint (target_group_id)
            WHERE target_group_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS equipment_constraint CASCADE")
    op.execute("DROP TABLE IF EXISTS manufacturer_config_availability CASCADE")
    op.execute("ALTER TABLE IF EXISTS equipment DROP CONSTRAINT IF EXISTS fk_equipment_option_pack")
    op.execute("DROP TABLE IF EXISTS option_pack CASCADE")
    op.execute("DROP TABLE IF EXISTS equipment CASCADE")
