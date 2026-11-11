"""Duty rota and daily inspection records, shared by everyone on a vessel."""

from alembic import op

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE vessel_duty_rota (
            vessel_id UUID PRIMARY KEY REFERENCES vessels(id) ON DELETE CASCADE,
            rota JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE vessel_inspection_day (
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            day DATE NOT NULL,
            record JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (vessel_id, day)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vessel_inspection_day CASCADE")
    op.execute("DROP TABLE IF EXISTS vessel_duty_rota CASCADE")
