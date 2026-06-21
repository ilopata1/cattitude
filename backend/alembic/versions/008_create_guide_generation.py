"""Create guide generation input snapshot and run tables."""

from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE guide_generation_input_snapshot (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            payload JSONB NOT NULL,
            content_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_guide_input_snapshot_vessel
            ON guide_generation_input_snapshot (vessel_id, created_at DESC)
        """
    )

    op.execute(
        """
        CREATE TABLE guide_generation_run (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            input_snapshot_id UUID NOT NULL REFERENCES guide_generation_input_snapshot(id),
            trigger guide_generation_trigger NOT NULL,
            status guide_generation_status NOT NULL DEFAULT 'pending',
            prompt_refs JSONB NOT NULL DEFAULT '[]',
            content_type guide_content_type,
            content_key TEXT,
            output_module_keys TEXT[],
            model_id TEXT,
            error_message TEXT,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_guide_generation_run_vessel
            ON guide_generation_run (vessel_id, created_at DESC)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS guide_generation_run CASCADE")
    op.execute("DROP TABLE IF EXISTS guide_generation_input_snapshot CASCADE")
