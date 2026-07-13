"""Add draft/approved status and source citations to equipment_guide_fragment."""

from alembic import op

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE equipment_guide_fragment
            ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'
                CHECK (status IN ('draft', 'approved')),
            ADD COLUMN source_citations JSONB
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE equipment_guide_fragment
            DROP COLUMN IF EXISTS source_citations,
            DROP COLUMN IF EXISTS status
        """
    )
