"""Add option_pack_child_pack for nested option pack membership."""

from alembic import op

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE option_pack_child_pack (
            parent_pack_id UUID NOT NULL REFERENCES option_pack(id) ON DELETE CASCADE,
            child_pack_id UUID NOT NULL REFERENCES option_pack(id) ON DELETE CASCADE,
            sort_order INT NOT NULL DEFAULT 0,
            is_optional BOOLEAN NOT NULL DEFAULT false,
            source_note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (parent_pack_id, child_pack_id),
            CONSTRAINT chk_option_pack_child_not_self
                CHECK (parent_pack_id <> child_pack_id)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_option_pack_child_pack_child
            ON option_pack_child_pack (child_pack_id)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS option_pack_child_pack CASCADE")
