"""Add guide_context to vessels for private-owner generation inputs."""

from alembic import op

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE vessels
            ADD COLUMN guide_context JSONB NOT NULL DEFAULT '{}',
            ADD COLUMN guide_context_version INTEGER NOT NULL DEFAULT 1
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE vessels
            DROP COLUMN IF EXISTS guide_context_version,
            DROP COLUMN IF EXISTS guide_context
        """
    )
