"""Replace option_pack.bill_of_materials UUID[] with option_pack_equipment join table."""

from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE option_pack_equipment (
            option_pack_id UUID NOT NULL REFERENCES option_pack(id) ON DELETE CASCADE,
            equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
            sort_order INT NOT NULL DEFAULT 0,
            quantity INT NOT NULL DEFAULT 1,
            is_optional BOOLEAN NOT NULL DEFAULT false,
            source_note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (option_pack_id, equipment_id)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_option_pack_equipment_equipment
            ON option_pack_equipment (equipment_id)
        """
    )
    op.execute(
        """
        INSERT INTO option_pack_equipment (option_pack_id, equipment_id, sort_order)
        SELECT op.id, bom.equipment_id, bom.sort_order
        FROM option_pack op
        CROSS JOIN LATERAL (
            SELECT equipment_id, ordinality - 1 AS sort_order
            FROM unnest(op.bill_of_materials) WITH ORDINALITY AS t(equipment_id, ordinality)
        ) bom
        WHERE bom.equipment_id IS NOT NULL
        ON CONFLICT (option_pack_id, equipment_id) DO NOTHING
        """
    )
    op.execute(
        "ALTER TABLE equipment DROP CONSTRAINT IF EXISTS fk_equipment_option_pack"
    )
    op.execute("ALTER TABLE equipment DROP COLUMN IF EXISTS option_pack_id")
    op.execute("ALTER TABLE option_pack DROP COLUMN IF EXISTS bill_of_materials")


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE option_pack
            ADD COLUMN bill_of_materials UUID[] NOT NULL DEFAULT '{}'
        """
    )
    op.execute(
        """
        UPDATE option_pack op
        SET bill_of_materials = COALESCE(
            (
                SELECT array_agg(ope.equipment_id ORDER BY ope.sort_order, ope.equipment_id)
                FROM option_pack_equipment ope
                WHERE ope.option_pack_id = op.id
            ),
            '{}'
        )
        """
    )
    op.execute(
        """
        ALTER TABLE equipment
            ADD COLUMN option_pack_id UUID
        """
    )
    op.execute(
        """
        ALTER TABLE equipment
            ADD CONSTRAINT fk_equipment_option_pack
            FOREIGN KEY (option_pack_id) REFERENCES option_pack(id)
        """
    )
    op.execute("DROP TABLE IF EXISTS option_pack_equipment CASCADE")
