"""Create guide_content table."""

from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE guide_content (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            content_type guide_content_type NOT NULL,
            content_key TEXT NOT NULL,
            payload JSONB NOT NULL,
            source guide_content_source NOT NULL,
            status guide_module_status NOT NULL DEFAULT 'draft',
            generation_run_id UUID REFERENCES guide_generation_run(id),
            supersedes_id UUID REFERENCES guide_content(id),
            diff_against_id UUID REFERENCES guide_content(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by TEXT,
            approved_at TIMESTAMPTZ,
            approved_by TEXT
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_guide_content_vessel_module
            ON guide_content (vessel_id, content_type, content_key, status)
        """
    )
    op.execute(
        """
        CREATE INDEX idx_guide_content_approved
            ON guide_content (vessel_id, status)
            WHERE status = 'approved'
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS guide_content CASCADE")
