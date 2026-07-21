"""Stage 4 integration Phase 2: DB-native input substrate.

Replaces the ``fixtures/pipeline/<vessel>`` files as the composer input with a
Postgres substrate that the DB->composer adapter reconstructs ``equipment_doc``
+ ``profiles`` from. Per the plan (``guide-stage4-integration-plan.md``) and the
2026-07-21 discovery that the Stage 4 fixture inventory does NOT match the admin
registry, the substrate is self-contained and fixture-faithful; linking Stage 4
models to registry ``equipment.id`` is deferred to Phase 4.

Tables:
  * ``interaction_profile``     — model-level library, keyed by natural
    ``profile_key`` (``coi``, ``alpha_pro_iii``). Capability-only profile JSON;
    all cross-device edges (``runs_platform``/``protects``/``protected_by``/
    ``requires_devices``) are stripped out to ``vessel_equipment_relation``
    (decision 2). Reused across sister ships.
  * ``vessel_stage4_equipment`` — per-vessel inventory, one row per fixture
    equipment handle. The exact equipment_doc row rides in ``row`` JSONB;
    ``device_key`` / ``profile_key`` / ``entity_kind`` are promoted for querying.
  * ``vessel_equipment_relation`` — per-vessel cross-device edges extracted from
    profiles, re-inlined by the adapter to reproduce the fixture byte-for-byte.
  * ``vessel_stage4_facts``      — per-vessel JSONB doc holding the remaining
    equipment_doc top-level surface (notes, installation_notes, fixture_auth,
    vessel_artifact_facts, hub_operation_sources, ...).
"""

from alembic import op

revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE interaction_profile (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_key TEXT NOT NULL UNIQUE,
            entity_kind TEXT NOT NULL DEFAULT 'device',
            manufacturer TEXT,
            model TEXT,
            documented_version TEXT,
            profile JSONB NOT NULL,
            source_manual_refs JSONB NOT NULL DEFAULT '[]',
            content_hash TEXT,
            equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE vessel_stage4_equipment (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            device_key TEXT NOT NULL,
            profile_key TEXT NOT NULL,
            entity_kind TEXT NOT NULL DEFAULT 'device',
            ordinal INTEGER NOT NULL DEFAULT 0,
            row JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (vessel_id, device_key)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_vessel_stage4_equipment_vessel
            ON vessel_stage4_equipment (vessel_id, ordinal)
        """
    )
    op.execute(
        """
        CREATE INDEX idx_vessel_stage4_equipment_profile
            ON vessel_stage4_equipment (profile_key)
        """
    )

    op.execute(
        """
        CREATE TABLE vessel_equipment_relation (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
            src_device_key TEXT NOT NULL,
            edge_type TEXT NOT NULL,
            dst_device_key TEXT,
            ordinal INTEGER NOT NULL DEFAULT 0,
            attrs JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_vessel_equipment_relation_src
            ON vessel_equipment_relation (vessel_id, src_device_key, edge_type, ordinal)
        """
    )

    op.execute(
        """
        CREATE TABLE vessel_stage4_facts (
            vessel_id UUID PRIMARY KEY REFERENCES vessels(id) ON DELETE CASCADE,
            facts JSONB NOT NULL DEFAULT '{}',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vessel_stage4_facts CASCADE")
    op.execute("DROP TABLE IF EXISTS vessel_equipment_relation CASCADE")
    op.execute("DROP TABLE IF EXISTS vessel_stage4_equipment CASCADE")
    op.execute("DROP TABLE IF EXISTS interaction_profile CASCADE")
