"""Create query_log and notifications tables."""

from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE query_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vessel_id UUID NOT NULL REFERENCES vessels(id),
            charter_id UUID REFERENCES charters(id),
            question TEXT NOT NULL,
            answer TEXT,
            source_manual_edition_ids JSONB,
            response_time_ms INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_query_log_vessel ON query_log (vessel_id)")
    op.execute("CREATE INDEX idx_query_log_created_at ON query_log (created_at)")

    op.execute(
        """
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            metadata JSONB,
            read_at TIMESTAMPTZ,
            push_sent_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_notifications_user ON notifications (user_id, read_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS notifications CASCADE")
    op.execute("DROP TABLE IF EXISTS query_log CASCADE")
