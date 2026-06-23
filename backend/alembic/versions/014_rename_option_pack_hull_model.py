"""Rename option_pack_applicable_model to option_pack_hull_model."""

from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE option_pack_applicable_model "
        "RENAME TO option_pack_hull_model"
    )
    op.execute(
        "ALTER INDEX idx_option_pack_applicable_model_hull "
        "RENAME TO idx_option_pack_hull_model_hull_model"
    )


def downgrade() -> None:
    op.execute(
        "ALTER INDEX idx_option_pack_hull_model_hull_model "
        "RENAME TO idx_option_pack_applicable_model_hull"
    )
    op.execute(
        "ALTER TABLE option_pack_hull_model "
        "RENAME TO option_pack_applicable_model"
    )
