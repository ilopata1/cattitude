"""Create equipment_guide_fragment — shared per-equipment guide content."""

from alembic import op

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE equipment_guide_fragment (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
            fragment JSONB NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by TEXT
        )
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX idx_equipment_guide_fragment_active
            ON equipment_guide_fragment (equipment_id)
            WHERE is_active
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS equipment_guide_fragment CASCADE")
