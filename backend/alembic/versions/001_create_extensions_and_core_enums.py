"""Create Postgres extensions and core platform enums."""

from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.execute(
        """
        CREATE TYPE vessel_type AS ENUM (
            'sailing_catamaran', 'cruising_monohull', 'sailing_trimaran',
            'power_catamaran', 'motor_yacht', 'sport_fishing'
        )
        """
    )
    op.execute("CREATE TYPE zone_cardinality AS ENUM ('fixed', 'configurable')")
    op.execute(
        """
        CREATE TYPE system_category AS ENUM (
            'propulsion', 'fuel_system', 'electrical_dc', 'electrical_ac_shore_power',
            'freshwater_system', 'sanitation', 'bilge_and_drainage', 'steering',
            'anchoring_ground_tackle', 'rigging_sail_handling', 'sails',
            'navigation_electronics', 'communications', 'refrigeration_galley',
            'hvac_climate', 'safety_equipment', 'tenders_davits', 'stabilisation',
            'entertainment_connectivity', 'hull_and_structure'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE equipment_class AS ENUM (
            'branded_major', 'branded_minor', 'generic_hardware',
            'built_installed', 'structural_fixed', 'consumable_dated'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE configuration_tier AS ENUM (
            'structural', 'option_pack', 'discrete_option', 'aftermarket'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE identification_method AS ENUM (
            'nameplate', 'visual_description', 'builder_spec'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE pack_source AS ENUM (
            'manufacturer_published', 'team_researched', 'owner_confirmed'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE constraint_type AS ENUM (
            'excludes', 'requires', 'mutually_exclusive_group'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE confirmed_by_method AS ENUM (
            'config_match', 'photo_intake', 'owner_reported', 'team_verified'
        )
        """
    )
    op.execute(
        """
        CREATE TYPE manual_type AS ENUM (
            'operators', 'service', 'installation', 'parts'
        )
        """
    )
    op.execute("CREATE TYPE source_tier AS ENUM ('tier_1', 'tier_2', 'tier_3')")
    op.execute(
        "CREATE TYPE legal_status AS ENUM ('pending', 'cleared', 'dmca_removed')"
    )
    op.execute(
        """
        CREATE TYPE zone AS ENUM (
            'bow_foredeck', 'helm_station', 'cockpit_aft_deck', 'saloon_main_cabin',
            'galley', 'engine_room', 'lazarette_aft_storage', 'swim_platform_transom',
            'below_decks_bilge',
            'port_hull', 'starboard_hull', 'bridgedeck_coachroof', 'trampoline_foredeck_netting',
            'mast_base_deck_step', 'keel_centreboard_trunk', 'quarter_berth_aft_cabin',
            'flybridge', 'engine_room_walkin', 'bait_tackle_station'
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TYPE IF EXISTS zone CASCADE")
    op.execute("DROP TYPE IF EXISTS legal_status CASCADE")
    op.execute("DROP TYPE IF EXISTS source_tier CASCADE")
    op.execute("DROP TYPE IF EXISTS manual_type CASCADE")
    op.execute("DROP TYPE IF EXISTS confirmed_by_method CASCADE")
    op.execute("DROP TYPE IF EXISTS constraint_type CASCADE")
    op.execute("DROP TYPE IF EXISTS pack_source CASCADE")
    op.execute("DROP TYPE IF EXISTS identification_method CASCADE")
    op.execute("DROP TYPE IF EXISTS configuration_tier CASCADE")
    op.execute("DROP TYPE IF EXISTS equipment_class CASCADE")
    op.execute("DROP TYPE IF EXISTS system_category CASCADE")
    op.execute("DROP TYPE IF EXISTS zone_cardinality CASCADE")
    op.execute("DROP TYPE IF EXISTS vessel_type CASCADE")
    op.execute("DROP EXTENSION IF EXISTS pgcrypto")
    op.execute("DROP EXTENSION IF EXISTS vector")
