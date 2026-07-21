# Stage 4 → live product integration plan

How the new Stage 4 guide-section composers become the vessel-agnostic,
DB-native generator for **system (Know-chapter) modules**, flowing
`generate → approve → publish → serve → client sync`.

Companion to [`guide-pipeline-plan.md`](guide-pipeline-plan.md) (which covers
Stages 0–4 authoring) and the frozen section spec tips
(`equipment-classification-spec-v4.3x.md`).

## Goal and stance

- Build directly for **end state**. There is no production audience to
  protect; do not preserve current state or keep back-compat for its own sake.
- End state: the `guide_section_*.py` composers generate the *system* chapters
  for any vessel, DB-native, through the existing publish/serve/sync spine.
- De-risk by splitting the two hard halves (output transform vs. input
  substrate) and verifying each against the **frozen section drafts** as a
  golden oracle sitting on the seam.

## Current state (investigation summary)

- **Downstream spine already exists and works** (dev / non-default slugs):
  admin generate→approve→publish (`guide_generation.py`, `guide_publish.py`),
  public API `/api/v1/vessels/{slug}/guide/{manifest,version,bundle.json,assets}`
  (`guide_api.py`/`guide_service.py`), mobile sync (`GuideSyncService` /
  `ContentService`). Production is only gated off (`guideSyncEnabled: false`,
  frozen `mobile/src/data/bootstrap/cattitude.json`).
- **The Stage 4 composers are standalone offline scripts.** `draft_*_section.py`
  read `fixtures/pipeline/outremer/{equipment,profiles}.json` and write markdown
  to `fixtures/pipeline/scratch/`. Nothing imports them into `guide_generation`,
  admin routes, or `guide_content`.
- **No DB persistence for Stage 1 interaction profiles or the vessel graph** —
  they exist only as one-vessel fixtures. `build_vessel_graph` is a pure
  function fed from fixture docs.
- **Section ids already match the live catalog.** `SYSTEM_IDS`
  (`guide_module_catalog.py`) already includes `batteries`, `controls`,
  `electrical`, `nav`, `water`. `solar` is intentionally not a top-level system
  (folded into `batteries`).

## Scope boundary (holds at end state)

Stage 4 owns **system** modules only. `branding`, `emergency`, `ui`
(navigation: `homeRuleSections`/`systemOrder`/`doMenu`), `checklists`,
`fix_card_set`, `locations` continue from existing builders / authoring.
`validate_publication_payload` requires those, so they must be present for a
vessel independent of Stage 4. Do **not** rip out `guide_generation.py`
wholesale; redirect only the *system* slot to Stage 4.

## Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Text structure | Titled paragraphs now; enrich to lists/steps later |
| 2 | Audit-trail home | With the generation event, separate from published content; owner-questions get a durable store |
| 3 | Cross-references | Plain words now; tappable links later |
| 4 | Knowledge storage | Reusable per-model library + thin per-boat wiring ("first boat pays") |
| O1 | Solar | Fold into the `batteries` module as a "Solar charging" section group |
| O2 | Subtitle source | Synthesize from the capability summary |
| O3 | Block headings | How it works · Turning it on · Monitoring · **Operating** · If something's not right · Care & upkeep |

## Fast path (phases)

| Phase | What | Acceptance | Rough effort |
|-------|------|-----------|--------------|
| **1 ✅ DONE** | Output spine: Stage 4 dict → `SystemModule` → `guide_content` → publish → client, **fixtures as input** | Ingest → approve → publish → `bundle.json` renders the systems in the app | shipped |
| **2** | Input substrate in DB: persist profiles + relations + vessel facts (per-model library + per-boat wiring); DB→`equipment_doc`/`profiles` adapter | Composer output from DB-built inputs == frozen fixture drafts, exactly | ~1.5–2.5 wk |
| **3** | Orchestrator + admin: `run_stage4_generation(vessel)`; wire into admin generate; persist provenance/fact_queries; owner-questions surfaced | One-click DB-native generate → publish | ~1 wk |
| **4** | De-hardcode composers for arbitrary vessels (remove Outremer constants, `DISPLAY_NAMES`/`MANUFACTURER_MODEL`, pinned device keys); add a 2nd vessel | A different vessel generates coherent system chapters | ~1–2 wk |
| **5** | Consolidate: retire the old fragment/LLM path for system modules; delete dead code + frozen-bundle path | Single generation path for systems | ~few days |

Value lands after Phase 1 (done); Phase 2 carries a rigorous byte-match gate.

---

## Phase 1 — detailed design

### Objective
Transform frozen Stage 4 composer output into valid, published `SystemModule`s
the live app renders, reusing the existing approve→publish→serve→sync spine
unchanged. Input is the existing Outremer fixtures.

### The transform contract (composer dict → `SystemModule`)

Client/DB shape (`SystemModule`) requires (`_validate_system_module`):
`id == content_key`, truthy `icon, title, subtitle, summary, sections`; each
section `{t, type}` with `type ∈ {prose, photo, list, steps, warnings, notes}`;
`prose` needs `c`; `list/steps/warnings/notes` need `items`; `learnChecks`
optional (non-empty if present).

| `SystemModule` field | Source |
|---|---|
| `id` | section id (`nav`, `batteries`, …) = `content_key` |
| `icon` | `SYSTEM_CATALOG[id]["icon"]` |
| `title` | draft H1 (`"# Navigation & Helm"` → `"Navigation & Helm"`) |
| `subtitle` | synthesized from the capability summary (O2) |
| `summary` | the `capability_summary` block text |
| `sections[]` | every other block, in `block_order`, one titled `prose` section each (O3 headings) |
| `learnChecks`, `locs` | omitted in Phase 1 (optional; catalog `locs` are Cattitude-specific) |

**Block → section.** Group `provenance_map` entries by `block` in
`block_order`. `capability_summary` → module `summary`. Each remaining block →
`{ "t": <O3 heading>, "type": "prose", "c": <block paragraphs joined> }`. Phase 1
uses `prose` only. `(Configuration pending)` rides inside troubleshooting prose.

**Metadata (decision 2).** `provenance_map`, `guide_links`, `wisdom_slot`,
`fact_queries`, `evaluation` do NOT enter the module payload. They attach to the
`guide_generation_run` record; `fact_queries` also into the owner-questions
store. Client payload stays reader-only.

**Solar (O1).** Fold the solar draft's blocks into the `batteries` module as an
appended titled section group ("Solar charging"), consistent with the catalog
and the batteries→solar leaf-pointer.

### Ingest path
`python scripts/ingest_stage4_sections.py --vessel <slug>`:
1. Run `compose_*_section` (or read scratch `*_draft_v4.json`).
2. Apply the transform.
3. Reuse `_validate_module_payload` + `_save_generated_draft` (or a thin
   wrapper) to write a `draft` row under a new `guide_generation_run`.
4. Persist metadata + fact_queries to the run / owner-questions store.

Rides existing plumbing so drafts flow through the normal approve→publish path
with no new downstream code.

### Client change (minimal)
Flip the target vessel to sync from the API
(`ContentService.shouldSyncFromApi`) and stop depending on the frozen
`cattitude.json`. Full deletion of the frozen-bundle path can wait; Phase 1
proves the live fetch.

### New / changed files
- **New:** `backend/guide_section_to_module.py` (transform);
  `backend/scripts/ingest_stage4_sections.py` (ingest); owner-questions
  persistence (small table or JSON).
- **Reused unchanged:** `guide_generation.py` save/validate helpers,
  `guide_publish.py`, `guide_api.py`, `guide_service.py`, mobile sync services.
- **Touched:** client environment flag. (`guide_module_catalog.py` only if O1
  were changed to a standalone `solar` id — not chosen.)

### Verification
- **Golden/unit:** transform output passes `_validate_system_module` for all
  four sections + folded solar; snapshot produced modules so future composer
  changes surface as reviewable diffs.
- **End-to-end:** ingest → approve → publish → `bundle.json` contains the
  systems → app renders (sync path, not frozen bundle).

### Phase 1 — status: DONE (2026-07-21)
Delivered and verified against the live deployed API.

- **New:** `guide_section_to_module.py` (transform), `stage4_sections.py`
  (compose+transform harness), `owner_questions.py` (durable store),
  `scripts/ingest_stage4_sections.py`, `scripts/verify_stage4_modules.py`,
  migration `022` (`guide_generation_run.metadata` + `owner_question` table).
- **Touched:** `know.page.scss` (`.prose { white-space: pre-line }` so joined
  paragraphs / simple bullets render; legacy single-paragraph prose unaffected).
- **Transform hardening found in-flight:** normalize the `[[CONFIG_PENDING]]`
  provenance token to its rendered form; list-item / continuation paragraphs
  (no provenance sentence) inherit the preceding block instead of a default
  bucket (was orphaning the electrical "Use it when:" bullets into reference).
- **E2E result:** ingested Outremer fixtures into `supernova`, approved,
  published **v15** (23 modules). Live
  `/api/v1/vessels/supernova/guide/bundle.json` (HTTP 200) returns the four
  Stage 4 chapters with the expected structure (nav "Turning it on", batteries
  folded "Solar charging", O3 headings, synthesized subtitles). 2 owner
  questions stored.
- **Client stance:** app `defaultVesselSlug` stays `cattitude` (frozen bundle);
  `supernova` already syncs live because non-default slugs always fetch from the
  API. No production app repoint.
- **Deferred to their own phases (unchanged by Phase 1):** titled paragraphs
  only — no lists/steps enrichment (decision 1); plain-word xrefs — no tappable
  links (decision 3); fixtures remain the composer input (Phase 2).

---

## Phase 2 — detailed design (input substrate)

**Objective.** Replace the fixture files as the composer input with a DB-native
substrate, so `equipment_doc` + `profiles` for a vessel are *reconstructed from
Postgres* and feed the unchanged composers. This is the hard half: it makes
Stage 4 real for any vessel, not just the Outremer fixture.

**Non-goals (Phase 2).** No admin/orchestrator wiring (Phase 3); no composer
de-hardcoding (Phase 4); no removal of the fixture files (they become the
golden oracle). Composers and the Phase 1 transform stay byte-stable.

### The seam / golden oracle
The frozen `fixtures/pipeline/outremer/{equipment,profiles}.json` and the
resulting composed drafts are the oracle. Phase 2 succeeds when inputs *rebuilt
from the DB* reproduce the composed drafts **byte-for-byte** (same
`draft_markdown`, `provenance_map`, `evaluation`) — proven by extending
`verify_stage4_modules.py` to diff fixture-built vs. DB-built module output.

### Two data layers (decision 4: reusable library + thin per-boat wiring)
- **Model-level library (reusable, "first boat pays"):** the interaction
  profile for an equipment *model* — capabilities, `ui_pages`, operator
  actions, documented version. Authored/extracted once; sister ships reuse.
- **Boat-level (per vessel):** which models are aboard + counts, per-unit
  identity (`device_key`), inter-unit wiring/relations (`runs_platform`,
  `protects`, `taught_via`, `feeds`, …), and vessel artifact facts (channel
  map, owner confirmations, evidence, honest-gap flags).

### Schema (new)
- **`interaction_profile`** — one row per equipment model (FK `equipment.id`),
  `profile JSONB`, `documented_version`, `entity_kind` (`device`|`platform`),
  `source_manual_refs`, provenance/status, `content_hash`. Platforms
  (CZone 2.0, Zeus SR Software) are rows here too, linked to a synthetic
  platform equipment row (as today's fixtures model them).
- **`vessel_equipment_relation`** — per-vessel edges:
  `(vessel_id, src_device_key, edge_type, dst_device_key, attrs JSONB)`.
  Carries `runs_platform`, `protects`, `taught_via`, etc.
- **`device_key` on `vessel_equipment`** — stable per-unit key
  (`bg_zeus_sr_1`, `class_t_2`, …) so relations and provenance resolve to a
  specific installed unit. Unique `(vessel_id, device_key)`.
- **`vessel_artifact_facts`** — per-vessel facts blob (channel map, owner
  confirmations, evidence pointers), keyed `(vessel_id, fact_key)` or a single
  JSONB doc; whichever the adapter needs to reproduce the fixture field.

### DB → composer adapter
`build_equipment_doc_from_db(conn, vessel_id)` and
`build_profiles_from_db(conn, vessel_id)` reconstruct the exact shapes
`build_vessel_graph` / `assemble_section_inputs` consume today:
- `equipment_doc.equipment[]` from `vessel_equipment` ⨝ `equipment` ⨝
  `interaction_profile` (+ platform rows), including `entity_kind` and
  `device_key`.
- `equipment_doc.relations[]` from `vessel_equipment_relation`.
- `equipment_doc.vessel_artifact_facts` from `vessel_artifact_facts`.
- `profiles{device_key: profile}` from `interaction_profile.profile`, with
  per-unit edges merged from relations (mirrors how fixtures inline
  `runs_platform` on each unit).
Canonical ordering + key normalization so JSON matches the fixture exactly.

### Seeding
A one-shot `scripts/seed_stage4_substrate.py --fixture outremer --slug supernova`
migrates the current fixtures into the new tables: upsert `interaction_profile`
per model, set `device_key`s on `vessel_equipment`, insert relations, write
`vessel_artifact_facts`. Idempotent; safe to re-run.

### Phase 2 decisions to lock before building
1. **Profile identity:** key `interaction_profile` by `equipment.id` (registry
   model) vs. a separate `(manufacturer, model)` natural key. *Lean:*
   `equipment.id` FK — the registry already dedups models.
2. **Relations home:** dedicated `vessel_equipment_relation` table (chosen
   sketch) vs. a JSONB column on `vessel_equipment`. *Lean:* table — edges are
   queried both directions and by type.
3. **`vessel_artifact_facts` shape:** single JSONB doc per vessel vs.
   key/value rows. *Lean:* start single JSONB (mirrors the fixture field);
   split later if it needs querying.
4. **Adapter fidelity bar:** exact byte-match to fixtures (strict, chosen) vs.
   semantic-equivalent (looser). Strict keeps the oracle meaningful.
5. **Platform modeling in DB:** synthetic equipment row + `interaction_profile`
   row + `runs_platform` edges (as fixtures do) vs. a first-class `platform`
   table. *Lean:* reuse the equipment+profile pattern to avoid a parallel
   taxonomy; revisit in Phase 4.

### Risk to Phase 1
None expected — Phase 2 sits entirely on the *input* side of the seam. The
Phase 1 transform, `SystemModule` contract, migration `022`, and publish path
are untouched. The only shared artifact is the composed-dict shape, which the
oracle pins.

### Acceptance
- `seed_stage4_substrate` populates the new tables from the Outremer fixtures.
- Adapter-built `equipment_doc` + `profiles` are byte-identical to the fixtures
  (dedicated diff check).
- `verify_stage4_modules.py --source db` produces modules byte-identical to
  `--source fixture` for all four sections + folded solar.

## Owner-questions (durable store)

Today owner-input questions live only as ephemeral `fact_queries` in scratch
JSON, `(Configuration pending)` prose, `config_unsourced` flags in
`expected.json`, and spec/inventory prose. Phase 1 introduces a durable store
(decision 2) so `fact_queries` from generation persist and carry forward until
dispositioned. Current open example: `zeus_czone_controller_visible`.
