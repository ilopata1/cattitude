"""Add hull_model registry, option_pack_applicability join, vessels.hull_model_id."""

from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE hull_model (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            manufacturer TEXT NOT NULL,
            model_code TEXT NOT NULL,
            display_name TEXT,
            vessel_type vessel_type NOT NULL,
            aliases TEXT[] NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (manufacturer, model_code)
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_hull_model_manufacturer ON hull_model (manufacturer)"
    )
    op.execute(
        "CREATE INDEX idx_hull_model_vessel_type ON hull_model (vessel_type)"
    )
    op.execute(
        "CREATE INDEX idx_hull_model_aliases ON hull_model USING GIN (aliases)"
    )

    op.execute(
        """
        INSERT INTO hull_model (manufacturer, model_code, display_name, vessel_type)
        SELECT DISTINCT
            op.manufacturer,
            trim(label),
            trim(label),
            CASE
                WHEN trim(label) ~* '(PC|Fly)' THEN 'power_catamaran'::vessel_type
                WHEN op.manufacturer = 'Galeon' THEN 'motor_yacht'::vessel_type
                WHEN op.manufacturer IN (
                    'Jeanneau', 'Beneteau', 'Hanse', 'Dehler',
                    'Catalina', 'Excess', 'Bavaria'
                ) THEN 'cruising_monohull'::vessel_type
                ELSE 'sailing_catamaran'::vessel_type
            END
        FROM option_pack op
        CROSS JOIN LATERAL unnest(op.applicable_models) AS label
        WHERE trim(label) <> ''
        ON CONFLICT (manufacturer, model_code) DO NOTHING
        """
    )

    op.execute(
        """
        CREATE TABLE option_pack_applicable_model (
            option_pack_id UUID NOT NULL REFERENCES option_pack(id) ON DELETE CASCADE,
            hull_model_id UUID NOT NULL REFERENCES hull_model(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (option_pack_id, hull_model_id)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_option_pack_applicable_model_hull
            ON option_pack_applicable_model (hull_model_id)
        """
    )

    op.execute(
        """
        INSERT INTO option_pack_applicable_model (option_pack_id, hull_model_id)
        SELECT op.id, hm.id
        FROM option_pack op
        CROSS JOIN LATERAL unnest(op.applicable_models) AS label
        JOIN hull_model hm
            ON hm.manufacturer = op.manufacturer
           AND hm.model_code = trim(label)
        ON CONFLICT (option_pack_id, hull_model_id) DO NOTHING
        """
    )

    op.execute(
        """
        ALTER TABLE vessels
            ADD COLUMN hull_model_id UUID REFERENCES hull_model(id)
        """
    )
    op.execute(
        "CREATE INDEX idx_vessels_hull_model ON vessels (hull_model_id)"
    )

    op.execute("ALTER TABLE option_pack DROP COLUMN IF EXISTS applicable_models")


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE option_pack
            ADD COLUMN applicable_models TEXT[] NOT NULL DEFAULT '{}'
        """
    )
    op.execute(
        """
        UPDATE option_pack op
        SET applicable_models = COALESCE(
            (
                SELECT array_agg(hm.model_code ORDER BY hm.model_code)
                FROM option_pack_applicable_model opam
                JOIN hull_model hm ON hm.id = opam.hull_model_id
                WHERE opam.option_pack_id = op.id
            ),
            '{}'
        )
        """
    )
    op.execute("ALTER TABLE vessels DROP COLUMN IF EXISTS hull_model_id")
    op.execute("DROP TABLE IF EXISTS option_pack_applicable_model CASCADE")
    op.execute("DROP TABLE IF EXISTS hull_model CASCADE")
