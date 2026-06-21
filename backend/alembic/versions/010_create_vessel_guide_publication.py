"""Create vessel_guide_publication table."""

from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE vessel_guide_publication (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            version INTEGER NOT NULL,
            content_hash TEXT NOT NULL,
            payload JSONB NOT NULL,
            asset_manifest JSONB NOT NULL,
            module_refs JSONB NOT NULL DEFAULT '[]',
            published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            published_by TEXT,
            CONSTRAINT uq_vessel_guide_publication_version UNIQUE (vessel_id, version)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_vessel_guide_publication_latest
            ON vessel_guide_publication (vessel_id, published_at DESC)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vessel_guide_publication CASCADE")
