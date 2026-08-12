"""Add Ask relevance + retrieval-query audit fields to query_log."""

from alembic import op

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE query_log
            ADD COLUMN IF NOT EXISTS relevance TEXT,
            ADD COLUMN IF NOT EXISTS retrieve_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS troubleshooting_retrieve BOOLEAN NOT NULL DEFAULT false
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE query_log
            DROP COLUMN IF EXISTS relevance,
            DROP COLUMN IF EXISTS retrieve_queries,
            DROP COLUMN IF EXISTS troubleshooting_retrieve
        """
    )
