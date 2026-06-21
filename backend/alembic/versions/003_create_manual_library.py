"""Create manual library tables."""

from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE manual_work (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
            manual_type manual_type NOT NULL,
            title TEXT NOT NULL,
            source_tier source_tier NOT NULL,
            legal_status legal_status NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_manual_work_equipment ON manual_work (equipment_id)")

    op.execute(
        """
        CREATE TABLE manual_edition (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            manual_work_id UUID NOT NULL REFERENCES manual_work(id) ON DELETE CASCADE,
            edition_label TEXT,
            content_hash TEXT NOT NULL,
            superseded_by_edition_id UUID REFERENCES manual_edition(id),
            is_current BOOLEAN NOT NULL DEFAULT true,
            ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_manual_edition_work ON manual_edition (manual_work_id)")
    op.execute(
        """
        CREATE UNIQUE INDEX idx_manual_edition_one_current
            ON manual_edition (manual_work_id)
            WHERE is_current = true
        """
    )

    op.execute(
        """
        CREATE TABLE manual_file (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            manual_edition_id UUID NOT NULL REFERENCES manual_edition(id) ON DELETE CASCADE,
            language TEXT NOT NULL,
            file_hash TEXT NOT NULL UNIQUE,
            source_url TEXT,
            storage_path TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_manual_file_edition ON manual_file (manual_edition_id)")
    op.execute("CREATE INDEX idx_manual_file_language ON manual_file (language)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS manual_file CASCADE")
    op.execute("DROP TABLE IF EXISTS manual_edition CASCADE")
    op.execute("DROP TABLE IF EXISTS manual_work CASCADE")
