"""Create guide_prompt_template table."""

from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE guide_prompt_template (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            scope guide_scope NOT NULL,
            scope_id UUID,
            content_type guide_content_type NOT NULL,
            content_key TEXT NOT NULL,
            version INTEGER NOT NULL,
            prompt_text TEXT NOT NULL,
            input_schema JSONB,
            output_schema JSONB,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by TEXT,
            CONSTRAINT uq_guide_prompt_template_version
                UNIQUE (scope, scope_id, content_type, content_key, version)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_guide_prompt_template_lookup
            ON guide_prompt_template (scope, scope_id, content_type, content_key)
            WHERE is_active = true
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS guide_prompt_template CASCADE")
