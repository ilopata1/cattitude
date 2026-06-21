"""Create vessels, charter companies, and related tenancy tables."""

from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE charter_companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            auth0_org_id TEXT UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE vessels (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            charter_company_id UUID REFERENCES charter_companies(id),
            vessel_type vessel_type NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_vessels_charter_company ON vessels (charter_company_id)")

    op.execute(
        """
        CREATE TABLE vessel_equipment (
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
            zone_instance TEXT NOT NULL DEFAULT 'default',
            confirmed_by confirmed_by_method NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (vessel_id, equipment_id, zone_instance)
        )
        """
    )
    op.execute("CREATE INDEX idx_vessel_equipment_vessel ON vessel_equipment (vessel_id)")
    op.execute(
        "CREATE INDEX idx_vessel_equipment_equipment ON vessel_equipment (equipment_id)"
    )

    op.execute(
        """
        CREATE TABLE charters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            guest_token TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT chk_charter_dates CHECK (end_date >= start_date)
        )
        """
    )
    op.execute("CREATE INDEX idx_charters_vessel ON charters (vessel_id)")
    op.execute("CREATE INDEX idx_charters_guest_token ON charters (guest_token)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS charters CASCADE")
    op.execute("DROP TABLE IF EXISTS vessel_equipment CASCADE")
    op.execute("DROP TABLE IF EXISTS vessels CASCADE")
    op.execute("DROP TABLE IF EXISTS charter_companies CASCADE")
