"""Per-vessel Signal-K instrument path mapping for native Sail instruments."""

from alembic import op

revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE vessel_instrument_map (
            vessel_id UUID PRIMARY KEY REFERENCES vessels(id) ON DELETE CASCADE,
            map JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_by TEXT
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vessel_instrument_map CASCADE")
