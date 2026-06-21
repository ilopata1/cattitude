"""Create vessel guide enums."""

from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TYPE guide_scope AS ENUM (
            'platform', 'charter_company', 'vessel_type', 'vessel'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE guide_content_type AS ENUM (
            'branding', 'emergency', 'system', 'checklist', 'fix_card_set', 'locations', 'ui'
        )
        """
    )
    op.execute(
        "CREATE TYPE guide_content_source AS ENUM ('generated', 'edited', 'imported')"
    )
    op.execute(
        """
        CREATE TYPE guide_module_status AS ENUM (
            'draft', 'approved', 'published', 'superseded', 'archived'
        )
        """
    )
    op.execute(
        "CREATE TYPE guide_generation_trigger AS ENUM ('onboarding', 'regenerate', 'import')"
    )
    op.execute(
        """
        CREATE TYPE guide_generation_status AS ENUM (
            'pending', 'running', 'completed', 'failed'
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TYPE IF EXISTS guide_generation_status CASCADE")
    op.execute("DROP TYPE IF EXISTS guide_generation_trigger CASCADE")
    op.execute("DROP TYPE IF EXISTS guide_module_status CASCADE")
    op.execute("DROP TYPE IF EXISTS guide_content_source CASCADE")
    op.execute("DROP TYPE IF EXISTS guide_content_type CASCADE")
    op.execute("DROP TYPE IF EXISTS guide_scope CASCADE")
