"""Stage 4 integration: generation-run audit metadata + owner-questions store.

Decision 2 of the Stage 4 → live integration plan: the composer audit trail
(provenance map, guide links, wisdom slot, evaluation) rides with the generation
event, separate from published content; owner-input questions (``fact_queries``)
get a durable store that carries forward until dispositioned.
"""

from alembic import op

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE guide_generation_run
            ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'
        """
    )

    op.execute(
        """
        CREATE TABLE owner_question (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            question_key TEXT NOT NULL,
            section TEXT,
            prompt TEXT NOT NULL,
            detail JSONB NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'open',
            answer TEXT,
            generation_run_id UUID REFERENCES guide_generation_run(id)
                ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (vessel_id, question_key)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_owner_question_vessel_status
            ON owner_question (vessel_id, status, created_at DESC)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS owner_question CASCADE")
    op.execute("ALTER TABLE guide_generation_run DROP COLUMN IF EXISTS metadata")
