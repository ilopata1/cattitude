"""Allow one manual_work to link to many equipment rows.

Replaces manual_work.equipment_id FK with manual_work_equipment join table.
Deleting the last link (including via equipment CASCADE) removes the work,
preserving prior "delete equipment → delete its manuals" behaviour when that
equipment was the only link.
"""

from alembic import op

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE manual_work_equipment (
            manual_work_id UUID NOT NULL
                REFERENCES manual_work(id) ON DELETE CASCADE,
            equipment_id UUID NOT NULL
                REFERENCES equipment(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (manual_work_id, equipment_id)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_manual_work_equipment_equipment
            ON manual_work_equipment (equipment_id)
        """
    )
    op.execute(
        """
        INSERT INTO manual_work_equipment (manual_work_id, equipment_id)
        SELECT id, equipment_id
        FROM manual_work
        WHERE equipment_id IS NOT NULL
        ON CONFLICT (manual_work_id, equipment_id) DO NOTHING
        """
    )
    op.execute("DROP INDEX IF EXISTS idx_manual_work_equipment")
    op.execute("ALTER TABLE manual_work DROP COLUMN equipment_id")

    op.execute(
        """
        CREATE OR REPLACE FUNCTION cleanup_orphan_manual_work()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM manual_work_equipment
                WHERE manual_work_id = OLD.manual_work_id
            ) THEN
                DELETE FROM manual_work WHERE id = OLD.manual_work_id;
            END IF;
            RETURN OLD;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_manual_work_equipment_orphan
        AFTER DELETE ON manual_work_equipment
        FOR EACH ROW
        EXECUTE PROCEDURE cleanup_orphan_manual_work()
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS trg_manual_work_equipment_orphan ON manual_work_equipment"
    )
    op.execute("DROP FUNCTION IF EXISTS cleanup_orphan_manual_work()")

    op.execute(
        """
        ALTER TABLE manual_work
            ADD COLUMN equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE
        """
    )
    op.execute(
        """
        UPDATE manual_work mw
        SET equipment_id = sub.equipment_id
        FROM (
            SELECT DISTINCT ON (manual_work_id)
                manual_work_id,
                equipment_id
            FROM manual_work_equipment
            ORDER BY manual_work_id, created_at, equipment_id
        ) sub
        WHERE mw.id = sub.manual_work_id
        """
    )
    op.execute("DELETE FROM manual_work WHERE equipment_id IS NULL")
    op.execute(
        """
        ALTER TABLE manual_work
            ALTER COLUMN equipment_id SET NOT NULL
        """
    )
    op.execute(
        "CREATE INDEX idx_manual_work_equipment ON manual_work (equipment_id)"
    )
    op.execute("DROP TABLE IF EXISTS manual_work_equipment CASCADE")
