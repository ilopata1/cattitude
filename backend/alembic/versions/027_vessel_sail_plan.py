"""Per-vessel sail plan (TWA/TWS crossover matrix) for Polar advice."""

from alembic import op

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE vessel_sail_plan (
            vessel_id UUID PRIMARY KEY REFERENCES vessels(id) ON DELETE CASCADE,
            plan JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_by TEXT
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vessel_sail_plan CASCADE")
