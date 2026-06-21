"""Add charter operating bases and extend guide_scope for base-level overrides."""

from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE charter_operating_bases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            charter_company_id UUID NOT NULL REFERENCES charter_companies(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            timezone TEXT,
            country_code TEXT,
            guide_context JSONB NOT NULL DEFAULT '{}',
            guide_context_version INTEGER NOT NULL DEFAULT 1,
            cloned_from_operating_base_id UUID REFERENCES charter_operating_bases(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_charter_operating_bases_company_slug
                UNIQUE (charter_company_id, slug)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_charter_operating_bases_company
            ON charter_operating_bases (charter_company_id)
        """
    )

    op.execute(
        """
        ALTER TABLE vessels
            ADD COLUMN charter_operating_base_id UUID
            REFERENCES charter_operating_bases(id)
        """
    )
    op.execute(
        """
        CREATE INDEX idx_vessels_operating_base
            ON vessels (charter_operating_base_id)
        """
    )

    op.execute(
        "ALTER TYPE guide_scope ADD VALUE IF NOT EXISTS 'charter_operating_base'"
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM guide_prompt_template
        WHERE scope = 'charter_operating_base'
        """
    )

    op.execute("DROP INDEX IF EXISTS idx_vessels_operating_base")
    op.execute(
        "ALTER TABLE vessels DROP COLUMN IF EXISTS charter_operating_base_id"
    )
    op.execute("DROP TABLE IF EXISTS charter_operating_bases CASCADE")

    # PostgreSQL cannot drop a single enum value; charter_operating_base remains on guide_scope.
