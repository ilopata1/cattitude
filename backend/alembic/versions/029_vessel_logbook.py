"""Per-vessel electronic logbook entries and the active passage."""

from alembic import op

revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE vessel_logbook_entry (
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            entry_id TEXT NOT NULL,
            entry JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (vessel_id, entry_id)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX vessel_logbook_entry_at
            ON vessel_logbook_entry (vessel_id, (entry->>'at'))
        """
    )
    op.execute(
        """
        CREATE TABLE vessel_logbook_passage (
            vessel_id UUID PRIMARY KEY REFERENCES vessels(id) ON DELETE CASCADE,
            passage JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vessel_logbook_passage CASCADE")
    op.execute("DROP TABLE IF EXISTS vessel_logbook_entry CASCADE")
