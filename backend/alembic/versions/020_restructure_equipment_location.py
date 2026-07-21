"""Restructure equipment location into a per-vessel, boat-type-aware model.

Moves "location" off the equipment registry (``equipment.zone`` /
``equipment.zone_cardinality``) and onto the per-vessel association
(``vessel_equipment``) as four structured fields: zone (new ``location_zone``
enum), sub_zone, hull_side, detail. The association gains a surrogate ``id``
primary key so the same equipment can be installed at multiple locations on
one vessel. Existing registry-level zones are best-effort mapped onto the new
fields; ambiguous values are written to a migration report for human review
rather than guessed at.
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

from alembic import op
from sqlalchemy import text

# Location catalog / mapping is the single source of truth. Ensure backend/ is
# importable even if this revision is loaded outside a normal migration run.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

# Importing keeps the enum, the backfill mapping and the generated labels
# consistent with the application.
from location_model import (  # noqa: E402
    BRIDGEDECK_TYPES,
    MIGRATION_MAP,
    ZONE_SLUGS,
    generate_label,
)

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def _write_report(lines: list[str]) -> None:
    """Best-effort migration report of rows needing human review."""
    try:
        report_dir = Path(__file__).resolve().parents[2] / "reports"
        report_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        path = report_dir / f"020_location_migration_report_{stamp}.md"
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"[020] Location migration report written to: {path}")
    except Exception as exc:  # pragma: no cover - reporting must not block DDL
        print(f"[020] WARNING: could not write migration report: {exc}")
        print("\n".join(lines))


def _backfill(bind) -> None:
    rows = bind.execute(
        text(
            """
            SELECT
                ve.id, ve.vessel_id, ve.equipment_id,
                v.vessel_type, v.name AS vessel_name,
                e.zone AS old_zone, e.manufacturer, e.model
            FROM vessel_equipment ve
            JOIN vessels v ON v.id = ve.vessel_id
            JOIN equipment e ON e.id = ve.equipment_id
            """
        )
    ).fetchall()

    report: list[str] = [
        "# 020 location migration — rows flagged for review",
        "",
        f"_Generated {datetime.now(timezone.utc).isoformat()}_",
        "",
        "These `vessel_equipment` rows had an ambiguous or vessel-type-invalid "
        "legacy zone. They were mapped best-effort (see below) and must be "
        "reviewed and corrected in the admin UI.",
        "",
        "| Vessel | Equipment | Old zone | New zone | New sub-zone | Hull side "
        "| Detail | Reason |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    flagged = 0

    for row in rows:
        (ve_id, _vessel_id, _equipment_id, vessel_type, vessel_name,
         old_zone, manufacturer, model) = row

        mapping = MIGRATION_MAP.get(old_zone)
        if mapping is None:
            zone = sub_zone = hull_side = None
            detail = f"was: {old_zone}"
            flag = True
            reason = f"Unmapped legacy zone {old_zone!r}."
        else:
            zone = mapping.get("zone")
            sub_zone = mapping.get("sub_zone")
            hull_side = mapping.get("hull_side")
            detail = mapping.get("detail")
            reason = mapping.get("reason", "")
            flag = bool(mapping.get("flag"))
            if mapping.get("flag_if_not_bridgedeck") and (
                vessel_type not in BRIDGEDECK_TYPES
            ):
                flag = True
                reason = (
                    f"{reason} Vessel type {vessel_type!r} cannot have a "
                    "bridgedeck saloon."
                ).strip()

        label = generate_label(zone, sub_zone, hull_side, detail) or "default"

        bind.execute(
            text(
                """
                UPDATE vessel_equipment
                SET
                    zone = CAST(:zone AS location_zone),
                    sub_zone = :sub_zone,
                    hull_side = :hull_side,
                    detail = :detail,
                    zone_instance = :zone_instance
                WHERE id = :id
                """
            ),
            {
                "zone": zone,
                "sub_zone": sub_zone,
                "hull_side": hull_side,
                "detail": detail,
                "zone_instance": label,
                "id": ve_id,
            },
        )

        if flag:
            flagged += 1
            report.append(
                "| {vessel} | {equip} | {old} | {zone} | {sub} | {hull} "
                "| {detail} | {reason} |".format(
                    vessel=vessel_name or "—",
                    equip=f"{manufacturer or '—'} {model or ''}".strip(),
                    old=old_zone,
                    zone=zone or "—",
                    sub=sub_zone or "—",
                    hull=hull_side or "—",
                    detail=(detail or "—").replace("|", "\\|"),
                    reason=(reason or "—").replace("|", "\\|"),
                )
            )

    report.insert(5, f"**{flagged} row(s) flagged of {len(rows)} total.**")
    report.append("")
    _write_report(report)


def upgrade() -> None:
    bind = op.get_bind()

    # 1. New Level-1 zone enum.
    enum_values = ", ".join(f"'{slug}'" for slug in ZONE_SLUGS)
    op.execute(f"CREATE TYPE location_zone AS ENUM ({enum_values})")

    # 2. Structured location columns + surrogate id on the association.
    op.execute(
        "ALTER TABLE vessel_equipment "
        "ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid()"
    )
    op.execute(
        """
        ALTER TABLE vessel_equipment
            ADD COLUMN zone location_zone,
            ADD COLUMN sub_zone TEXT,
            ADD COLUMN hull_side TEXT,
            ADD COLUMN detail TEXT
        """
    )
    op.execute(
        "ALTER TABLE vessel_equipment "
        "ADD CONSTRAINT chk_vessel_equipment_hull_side "
        "CHECK (hull_side IS NULL OR hull_side IN ('Port', 'Starboard'))"
    )
    op.execute(
        "ALTER TABLE vessel_equipment "
        "ADD CONSTRAINT chk_vessel_equipment_detail_len "
        "CHECK (detail IS NULL OR char_length(detail) <= 120)"
    )

    # 3. Best-effort backfill from the retired registry-level zone.
    _backfill(bind)

    # 4. Swap the composite PK for the surrogate id, keeping a uniqueness
    #    guarantee on (vessel, equipment, location-label) so the existing
    #    ON CONFLICT (vessel_id, equipment_id, zone_instance) paths keep
    #    deduplicating identical locations.
    op.execute("ALTER TABLE vessel_equipment DROP CONSTRAINT vessel_equipment_pkey")
    op.execute("ALTER TABLE vessel_equipment ADD PRIMARY KEY (id)")
    op.execute(
        "CREATE UNIQUE INDEX uq_vessel_equipment_location "
        "ON vessel_equipment (vessel_id, equipment_id, zone_instance)"
    )

    # 5. Retire registry-level location.
    op.execute("ALTER TABLE equipment DROP COLUMN zone")
    op.execute("ALTER TABLE equipment DROP COLUMN zone_cardinality")
    op.execute("DROP TYPE IF EXISTS zone")
    op.execute("DROP TYPE IF EXISTS zone_cardinality")


def downgrade() -> None:
    # Best-effort reversal. Original registry-level zone values and the legacy
    # per-vessel structure cannot be recovered; sensible defaults are used.
    op.execute(
        "CREATE TYPE zone_cardinality AS ENUM ('fixed', 'configurable')"
    )
    op.execute(
        """
        CREATE TYPE zone AS ENUM (
            'bow_foredeck', 'helm_station', 'cockpit_aft_deck',
            'saloon_main_cabin', 'galley', 'engine_room',
            'lazarette_aft_storage', 'swim_platform_transom',
            'below_decks_bilge', 'port_hull', 'starboard_hull',
            'bridgedeck_coachroof', 'trampoline_foredeck_netting',
            'mast_base_deck_step', 'keel_centreboard_trunk',
            'quarter_berth_aft_cabin', 'flybridge', 'engine_room_walkin',
            'bait_tackle_station'
        )
        """
    )
    op.execute(
        "ALTER TABLE equipment "
        "ADD COLUMN zone zone NOT NULL DEFAULT 'saloon_main_cabin'"
    )
    op.execute(
        "ALTER TABLE equipment "
        "ADD COLUMN zone_cardinality zone_cardinality NOT NULL DEFAULT 'fixed'"
    )
    op.execute("ALTER TABLE equipment ALTER COLUMN zone DROP DEFAULT")

    op.execute("DROP INDEX IF EXISTS uq_vessel_equipment_location")
    op.execute("ALTER TABLE vessel_equipment DROP CONSTRAINT vessel_equipment_pkey")
    op.execute(
        "ALTER TABLE vessel_equipment "
        "DROP CONSTRAINT IF EXISTS chk_vessel_equipment_hull_side"
    )
    op.execute(
        "ALTER TABLE vessel_equipment "
        "DROP CONSTRAINT IF EXISTS chk_vessel_equipment_detail_len"
    )
    op.execute(
        """
        ALTER TABLE vessel_equipment
            DROP COLUMN IF EXISTS zone,
            DROP COLUMN IF EXISTS sub_zone,
            DROP COLUMN IF EXISTS hull_side,
            DROP COLUMN IF EXISTS detail,
            DROP COLUMN IF EXISTS id
        """
    )
    op.execute(
        "ALTER TABLE vessel_equipment "
        "ADD PRIMARY KEY (vessel_id, equipment_id, zone_instance)"
    )
    op.execute("DROP TYPE IF EXISTS location_zone")
