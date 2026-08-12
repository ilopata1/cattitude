"""Enrich query_log for Ask coverage review and synthesis-prompt replay.

Adds retrieved context and related Ask metadata so admins can copy the exact
synthesis prompt for richer-model A/B without re-running retrieval.
"""

from alembic import op

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE query_log
            ADD COLUMN IF NOT EXISTS retrieved_context TEXT,
            ADD COLUMN IF NOT EXISTS conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS retrieve_query TEXT,
            ADD COLUMN IF NOT EXISTS prepared_query TEXT,
            ADD COLUMN IF NOT EXISTS cited JSONB NOT NULL DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS chat_deployment TEXT,
            ADD COLUMN IF NOT EXISTS retrieved_count INTEGER,
            ADD COLUMN IF NOT EXISTS no_excerpts BOOLEAN NOT NULL DEFAULT false
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE query_log
            DROP COLUMN IF EXISTS retrieved_context,
            DROP COLUMN IF EXISTS conversation_history,
            DROP COLUMN IF EXISTS retrieve_query,
            DROP COLUMN IF EXISTS prepared_query,
            DROP COLUMN IF EXISTS cited,
            DROP COLUMN IF EXISTS chat_deployment,
            DROP COLUMN IF EXISTS retrieved_count,
            DROP COLUMN IF EXISTS no_excerpts
        """
    )
