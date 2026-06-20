# Cursor Build Instructions: Postgres Database for Clever Sailor

## Objective

Build the complete Postgres schema for the Clever Sailor platform: the vessel/equipment taxonomy, the manual library, the RAG vector store, and the supporting tenant/operational tables. This is schema and migration work only — no application logic, no API endpoints.

## Source of Truth

Two documents define every table in this schema. Read both before writing any SQL:

1. **`clever-sailor-schema-reference.docx`** (or equivalent .md export) — the authoritative field-by-field schema for every table.
2. **Project briefing, Section 4.5** — the original data model context, including the relationship between `manual_chunks` and LlamaIndex's `PGVectorStore`.

If anything in this document conflicts with those, **the schema reference document wins**. Flag the conflict rather than silently picking one.

---

## Environment

- **Target:** PostgreSQL 15+ (required for `pgvector` extension support and `gen_random_uuid()`)
- **Local dev:** Docker Postgres with `pgvector` pre-installed (`ankane/pgvector` image), per the project briefing's Phase 1 setup
- **Production (current):** Railway Postgres
- **Migration tool:** Use Alembic if the backend is Python/SQLAlchemy (consistent with the FastAPI + LlamaIndex stack already in use). If a different migration tool is already configured in the repo, use that instead — check `backend/` for an existing `alembic.ini` or equivalent before introducing a new one.

---

## Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()
```

---

## Build Order

Tables have foreign key dependencies. Build in this order so each migration applies cleanly:

1. Enumerated types (Postgres `ENUM` types or `CHECK` constraints — see "Enum Strategy" below)
2. `equipment` (no dependencies other than enums)
3. `option_pack` (depends on `equipment` for `bill_of_materials`)
4. `manufacturer_config_availability` (no dependencies)
5. `equipment_constraint` (depends on `equipment`)
6. `manual_work` (depends on `equipment`)
7. `manual_edition` (depends on `manual_work`, self-referential FK)
8. `manual_file` (depends on `manual_edition`)
9. `charter_companies` (no dependencies)
10. `vessels` (depends on `charter_companies`)
11. `vessel_equipment` (depends on `vessels`, `equipment`)
12. `charters` (depends on `vessels`)
13. `query_log` (depends on `vessels`, `charters`)
14. `notifications` (depends on users — see "Users Table" note below)
15. `manual_chunks` — **do not hand-write this table**. It is created automatically by LlamaIndex's `PGVectorStore` on first ingest. See "manual_chunks" section below.

---

## Enum Strategy

Use Postgres native `ENUM` types for all enumerated fields rather than free-text with application-level validation. This catches invalid values at the database layer, which matters here because several enums (`configuration_tier`, `equipment_class`, `constraint_type`) drive business logic in the intake and admin systems described in the other build documents.

```sql
CREATE TYPE vessel_type AS ENUM (
    'sailing_catamaran', 'cruising_monohull', 'sailing_trimaran',
    'power_catamaran', 'motor_yacht', 'sport_fishing'
);

CREATE TYPE zone_cardinality AS ENUM ('fixed', 'configurable');

CREATE TYPE system_category AS ENUM (
    'propulsion', 'fuel_system', 'electrical_dc', 'electrical_ac_shore_power',
    'freshwater_system', 'sanitation', 'bilge_and_drainage', 'steering',
    'anchoring_ground_tackle', 'rigging_sail_handling', 'sails',
    'navigation_electronics', 'communications', 'refrigeration_galley',
    'hvac_climate', 'safety_equipment', 'tenders_davits', 'stabilisation',
    'entertainment_connectivity', 'hull_and_structure'
);

CREATE TYPE equipment_class AS ENUM (
    'branded_major', 'branded_minor', 'generic_hardware',
    'built_installed', 'structural_fixed', 'consumable_dated'
);

CREATE TYPE configuration_tier AS ENUM (
    'structural', 'option_pack', 'discrete_option', 'aftermarket'
);

CREATE TYPE identification_method AS ENUM (
    'nameplate', 'visual_description', 'builder_spec'
);

CREATE TYPE pack_source AS ENUM (
    'manufacturer_published', 'team_researched', 'owner_confirmed'
);

CREATE TYPE constraint_type AS ENUM (
    'excludes', 'requires', 'mutually_exclusive_group'
);

CREATE TYPE confirmed_by_method AS ENUM (
    'config_match', 'photo_intake', 'owner_reported', 'team_verified'
);

CREATE TYPE manual_type AS ENUM (
    'operators', 'service', 'installation', 'parts'
);

CREATE TYPE source_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');

CREATE TYPE legal_status AS ENUM ('pending', 'cleared', 'dmca_removed');
```

**Note on `vessel_types: VesselType[]` and `zone: Zone`:** The schema reference shows `equipment.vessel_types` as an array (an item can apply to multiple vessel types) — implement as `vessel_type[]`. `Zone` itself was specified as a flat enumerated list across four sub-groups (universal, multihull, monohull, power) in the taxonomy document — implement as a single `zone` enum type containing all values from all four groups; do not create separate enum types per vessel category, since a `zone` value must be comparable across vessel types in queries.

```sql
CREATE TYPE zone AS ENUM (
    -- universal
    'bow_foredeck', 'helm_station', 'cockpit_aft_deck', 'saloon_main_cabin',
    'galley', 'engine_room', 'lazarette_aft_storage', 'swim_platform_transom',
    'below_decks_bilge',
    -- multihull
    'port_hull', 'starboard_hull', 'bridgedeck_coachroof', 'trampoline_foredeck_netting',
    -- monohull
    'mast_base_deck_step', 'keel_centreboard_trunk', 'quarter_berth_aft_cabin',
    -- power
    'flybridge', 'engine_room_walkin', 'bait_tackle_station'
);
```

---

## Table DDL

### equipment

```sql
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer TEXT,
    model TEXT,
    vessel_types vessel_type[] NOT NULL DEFAULT '{}',
    zone zone NOT NULL,
    zone_cardinality zone_cardinality NOT NULL DEFAULT 'fixed',
    system_category system_category NOT NULL,
    equipment_class equipment_class NOT NULL,
    configuration_tier configuration_tier NOT NULL,
    option_pack_id UUID, -- FK added after option_pack table exists
    has_formal_manual BOOLEAN NOT NULL DEFAULT false,
    identification_method identification_method NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_manufacturer_model ON equipment (manufacturer, model);
CREATE INDEX idx_equipment_system_category ON equipment (system_category);
CREATE INDEX idx_equipment_vessel_types ON equipment USING GIN (vessel_types);
```

### option_pack

```sql
CREATE TABLE option_pack (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer TEXT NOT NULL,
    applicable_models TEXT[] NOT NULL DEFAULT '{}',
    pack_name TEXT NOT NULL,
    bill_of_materials UUID[] NOT NULL DEFAULT '{}', -- array of equipment.id
    source pack_source NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE equipment
    ADD CONSTRAINT fk_equipment_option_pack
    FOREIGN KEY (option_pack_id) REFERENCES option_pack(id);
```

**Note:** `bill_of_materials` is stored as a `UUID[]` for simplicity, matching the schema reference. If query patterns later require joining against individual bill-of-materials items frequently (e.g. "which packs include this equipment"), consider a normalized `option_pack_item` join table instead — flag this as a possible future migration rather than building it preemptively.

### manufacturer_config_availability

```sql
CREATE TABLE manufacturer_config_availability (
    manufacturer TEXT PRIMARY KEY,
    has_public_configurator BOOLEAN NOT NULL DEFAULT false,
    pack_data_source_tier source_tier NOT NULL DEFAULT 'tier_2',
    last_verified DATE
);
```

### equipment_constraint

```sql
CREATE TABLE equipment_constraint (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    constraint_type constraint_type NOT NULL,
    target_equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    target_group_id UUID,
    source pack_source NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_constraint_target CHECK (
        (constraint_type IN ('excludes', 'requires') AND target_equipment_id IS NOT NULL)
        OR
        (constraint_type = 'mutually_exclusive_group' AND target_group_id IS NOT NULL)
    )
);

CREATE INDEX idx_equipment_constraint_equipment ON equipment_constraint (equipment_id);
CREATE INDEX idx_equipment_constraint_group ON equipment_constraint (target_group_id) WHERE target_group_id IS NOT NULL;
```

### manual_work

```sql
CREATE TABLE manual_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    manual_type manual_type NOT NULL,
    title TEXT NOT NULL,
    source_tier source_tier NOT NULL,
    legal_status legal_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_work_equipment ON manual_work (equipment_id);
```

### manual_edition

```sql
CREATE TABLE manual_edition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_work_id UUID NOT NULL REFERENCES manual_work(id) ON DELETE CASCADE,
    edition_label TEXT,
    content_hash TEXT NOT NULL,
    superseded_by_edition_id UUID REFERENCES manual_edition(id),
    is_current BOOLEAN NOT NULL DEFAULT true,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_edition_work ON manual_edition (manual_work_id);

-- Enforce exactly one current edition per manual_work
CREATE UNIQUE INDEX idx_manual_edition_one_current
    ON manual_edition (manual_work_id)
    WHERE is_current = true;
```

**This partial unique index is the database-level guarantee referenced in the schema document** — it makes it structurally impossible to have two `is_current: true` editions for the same manual_work, not just an application-level convention. Build it exactly as shown.

### manual_file

```sql
CREATE TABLE manual_file (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_edition_id UUID NOT NULL REFERENCES manual_edition(id) ON DELETE CASCADE,
    language TEXT NOT NULL, -- ISO 639-1, e.g. 'en', 'fr'
    file_hash TEXT NOT NULL UNIQUE,
    source_url TEXT,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_file_edition ON manual_file (manual_edition_id);
CREATE INDEX idx_manual_file_language ON manual_file (language);
```

**The `UNIQUE` constraint on `file_hash` is the de-duplication guarantee.** Do not relax this. Any ingestion path must compute the file hash and attempt the insert; a unique violation means "already in the library" and should be handled as a no-op success, not an error surfaced to the user.

### charter_companies

```sql
CREATE TABLE charter_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    auth0_org_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### vessels

```sql
CREATE TABLE vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    charter_company_id UUID REFERENCES charter_companies(id),
    vessel_type vessel_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vessels_charter_company ON vessels (charter_company_id);
```

**Note:** `vessel_type` on the `vessels` table itself is not explicitly listed in the schema reference document but is clearly required by the application logic described in the taxonomy document (Section 8.1, "Vessel Configuration Generation" filters by vessel type). Add it here as a single value, distinct from `equipment.vessel_types` which is an array describing which vessel types a piece of equipment *can* apply to.

### vessel_equipment

```sql
CREATE TABLE vessel_equipment (
    vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    zone_instance TEXT,
    confirmed_by confirmed_by_method NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (vessel_id, equipment_id, zone_instance)
);

CREATE INDEX idx_vessel_equipment_vessel ON vessel_equipment (vessel_id);
CREATE INDEX idx_vessel_equipment_equipment ON vessel_equipment (equipment_id);
```

**Important:** Postgres treats `NULL` values as distinct in composite primary keys in a way that can allow duplicate `(vessel_id, equipment_id, NULL)` rows. If `zone_instance` is `NULL` (the common case — most equipment has only one instance per vessel), use a generated default instead of relying on `NULL`:

```sql
-- Recommended alternative to avoid NULL-in-PK ambiguity:
ALTER TABLE vessel_equipment ALTER COLUMN zone_instance SET DEFAULT 'default';
ALTER TABLE vessel_equipment ALTER COLUMN zone_instance SET NOT NULL;
```

Apply this default-value approach rather than leaving `zone_instance` nullable in the primary key.

### charters

```sql
CREATE TABLE charters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    guest_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_charter_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_charters_vessel ON charters (vessel_id);
CREATE INDEX idx_charters_guest_token ON charters (guest_token);
```

### query_log

```sql
CREATE TABLE query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vessel_id UUID NOT NULL REFERENCES vessels(id),
    charter_id UUID REFERENCES charters(id),
    question TEXT NOT NULL,
    answer TEXT,
    source_manual_edition_ids JSONB,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_query_log_vessel ON query_log (vessel_id);
CREATE INDEX idx_query_log_created_at ON query_log (created_at);
```

### notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB,
    read_at TIMESTAMPTZ,
    push_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, read_at);
```

**Note on `user_id`:** No `users` table is defined in either source document — user identity is described elsewhere in the project briefing as managed by Auth0 (Phase 4), with `user_id` expected to be the Auth0 subject identifier (a string, not necessarily a UUID generated by this database). **Do not invent a `users` table.** Store `user_id` as `TEXT` if Auth0 subject identifiers are not UUIDs in this project's Auth0 configuration — confirm the actual Auth0 ID format before finalizing this column's type, and flag this as an open question if Auth0 integration (Phase 4) has not yet been built.

---

## manual_chunks (Do Not Hand-Build)

This table is created automatically by LlamaIndex's `PGVectorStore` on first ingest — it is not part of this migration set. Do not write DDL for it.

What to do instead:

1. Confirm the `vector` extension is enabled (see "Required Extensions" above) before any ingestion code runs
2. Confirm the ingestion code (`backend/ingest.py` per the project briefing) sets chunk metadata to include `manual_edition_id` (not `manual_work_id` — this is important, see schema reference document) so that retrieval automatically shifts to a new edition when one is superseded
3. After the first ingest, inspect the table LlamaIndex creates (likely named `manual_chunks` or `data_manual_chunks` depending on the `table_name` parameter passed to `PGVectorStore.from_params`) and confirm the `metadata_` JSONB column contains: `manual_edition_id`, `equipment_id`, `category`, `source_file`, `manual_type`

---

## Migration File Structure

If using Alembic, structure migrations as one file per logical group rather than one giant migration:

```
backend/alembic/versions/
  001_create_enums.py
  002_create_equipment_registry.py       -- equipment, option_pack, manufacturer_config_availability, equipment_constraint
  003_create_manual_library.py           -- manual_work, manual_edition, manual_file
  004_create_vessels_and_tenancy.py      -- charter_companies, vessels, vessel_equipment, charters
  005_create_operational_tables.py       -- query_log, notifications
```

Each migration's `upgrade()` and `downgrade()` functions must both be implemented and tested — do not leave `downgrade()` as `pass`.

---

## Seed Data for Local Development

After migrations run, provide a seed script (`backend/scripts/seed_dev_data.py` or equivalent) that inserts:

- One `charter_companies` row ("Cruise Abaco")
- One `vessels` row ("Cattitude", `vessel_type = 'sailing_catamaran'`)
- A handful of `equipment` rows covering at least: an engine (`branded_major`, `propulsion`), a watermaker (`branded_major`, `freshwater_system`), and one `generic_hardware` item (e.g. a winch) — enough to exercise every `equipment_class` value at least once
- Corresponding `vessel_equipment` rows linking Cattitude to that equipment
- One `manual_work` / `manual_edition` / `manual_file` chain for the engine, so the RAG ingestion pipeline has something real to point at

This seed data should be idempotent — running the script twice should not create duplicates or error.

---

## Acceptance Criteria

- [ ] All tables build cleanly from a fresh Postgres 15+ instance with no manual intervention
- [ ] All foreign keys, unique constraints, and check constraints from this document are present and verified working (attempt an invalid insert for each constraint and confirm it's rejected)
- [ ] The partial unique index ensuring one `is_current` edition per `manual_work` is tested: attempt to insert a second `is_current: true` row for the same `manual_work_id` and confirm it fails
- [ ] The `file_hash UNIQUE` constraint on `manual_file` is tested: attempt to insert a duplicate hash and confirm it fails
- [ ] `vessel_equipment` primary key correctly prevents duplicate (vessel, equipment, zone_instance) combinations
- [ ] Seed script runs successfully and is idempotent
- [ ] `pgvector` extension is enabled and ready for LlamaIndex's `PGVectorStore` to create `manual_chunks` on first ingest
- [ ] Every migration has a working `downgrade()`
