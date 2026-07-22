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
| **1b** | Reader polish: enrich text structure (lists/steps/…) + tappable cross-section links | Stage 4 modules render with full Know styling; xrefs navigate to the target system | see design below |
| **2 ✅ DONE** | Input substrate in DB: persist profiles + relations + vessel facts (per-model library + per-boat wiring); DB→`equipment_doc`/`profiles` adapter | Composer output from DB-built inputs == frozen fixture drafts, exactly | shipped |
| **3 ✅ DONE** | Orchestrator + admin: `run_stage4_generation(vessel)`; wire into admin generate; persist provenance/fact_queries (owner-questions store only — no admin UI) | One-click DB-native generate → publish | shipped |
| **4** | De-hardcode composers for arbitrary vessels (remove Outremer constants, `DISPLAY_NAMES`/`MANUFACTURER_MODEL`, pinned device keys); add a 2nd vessel | A different vessel generates coherent system chapters | see design below |
| **5** | Consolidate: retire the old fragment/LLM path for system modules; delete dead code + frozen-bundle path | Single generation path for systems | ~few days |

Value lands after Phase 1–3 (done). **Immediate priority (ahead of 4 and 5):**
reader polish — full guide text styling + tappable section linkages (Phase 1
decisions 1 and 3, deferred until now). See **Phase 1b** below. Phase 4
(de-hardcode + 2nd vessel) and Phase 5 (path consolidation) follow after.

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
  **Update:** decisions 1 and 3 are now **Phase 1b** (immediate priority,
  ahead of Phases 4–5).

---

## Phase 1b — reader polish (text styling + section linkages)

**Status:** planned — **immediate priority ahead of Phases 4 and 5.**

### What this is for (plain language)

Phase 1 shipped Stage 4 chapters into the live app as **blocks of plain
paragraphs** under O3 headings. That was enough to prove the pipeline. It is
not the full Know reading experience:

1. **Text structure (decision 1 “later”).** The client already knows how to
   render `list`, `steps`, `warnings`, and `notes` (bullets, numbered steps,
   warning styling). Stage 4 transform currently emits **only** `type: "prose"`
   with newlines inside `c` — so “Use it when:” bullets and procedure-like lines
   look like flat paragraphs (`white-space: pre-line`), not real lists/steps.
2. **Section linkages (decision 3 “later”).** Composers already emit structured
   `guide_links` (`target_id`, `label`, `data_guide_link: system:<id>`, …) and
   reader phrases like “the Batteries & Energy section of this guide.” Those
   links live on the **generation-run metadata**, not in the published module
   the phone reads — so guests see plain words, not tappable navigation.
   Know already opens a system via `?system=<id>`; the missing piece is wiring
   published content to that navigation.

This phase closes those two gaps for the boats you already Generate (Supernova
first). It does **not** de-hardcode composers (Phase 4) or retire fragments
(Phase 5).

### What already exists (do not rebuild)

| Piece | Where | Ready? |
|-------|--------|--------|
| Section types `prose` / `list` / `steps` / `warnings` / `notes` / `photo` | `_validate_system_module`, Know template | Yes — client renders them |
| O3 titled blocks | `guide_section_to_module.BLOCK_HEADINGS` | Yes |
| Multi-paragraph prose | Know `.prose { white-space: pre-line }` | Yes |
| Xref phrase + structured link object | `format_section_xref` / `guide_links` (spec v4.13) | Yes — on run metadata only |
| In-app jump to a system | Know `?system=<id>` / `openSystem` | Yes — unused by Stage 4 body text |

### Decision topics — expanded

#### A. How aggressive is “enrich to lists/steps”?

**What it means.** How we decide a paragraph becomes a structured section vs
staying prose.

- **Transform-only heuristics:** In `guide_section_to_module`, split a spine
  block’s paragraphs: lines starting with `- ` → `list` items; numbered lines →
  `steps`; keep surrounding sentences as `prose` (possibly several sections
  under the same O3 heading, or one heading with mixed sibling sections).
- **Composer-aware:** Teach composers to emit typed blocks (or markers in
  provenance) so enrichment is intentional, not guessed.
- **Hybrid (recommended):** Heuristics first for today’s drafts (fast reader
  win); tighten composers where heuristics are wrong (e.g. troubleshooting →
  `warnings`).

**Why it matters.** Heuristics are quick and keep Outremer drafts readable
without rewriting every composer. They can mis-classify edge cases. Composer
markers are more accurate but touch more frozen code and the byte-match oracle.

**Recommendation:** Hybrid — transform heuristics for clear bullet/step
patterns; leave ambiguous paragraphs as prose; optionally map the
troubleshooting block to `warnings` when items are clearly bullet-like.

**Implication:** Phase 2 **composed markdown** byte-match can stay green
(composers unchanged at first); the **module payload** shape will change, so
golden `stage4_modules.json` / published drafts need a regenerate + visual
check. If we later change composers, Outremer section verify scripts still
gate prose.

#### B. Where do tappable links live in the published payload?

**What it means.** Guests need something in `SystemModule` (or derived at
publish) that the client can turn into a tap target. Spec v4.13: do **not**
bake app routes into Stage 4; resolve with `system:<id>` → Know `?system=<id>`.

Options:

1. **Inline markers in `c` / `items`** — e.g. keep the phrase and add a parallel
   `links: [{…}]` on the section (or module) keyed by sentence / offset.
2. **`html` field** — Know already supports `section.html` + `appRichHtml`;
   emit `<a data-guide-link="system:batteries">…</a>` (or similar) and handle
   clicks in the client.
3. **Separate “See also” chip row** — ignore in-prose taps; list `guide_links`
   as buttons under the module. Weaker UX; easiest.

**Recommendation:** Prefer **(1) or (2)** so the existing “Batteries & Energy
section of this guide” phrase becomes the tap target — not a detached chip
list. Concrete choice at implement time: if `appRichHtml` already sanitizes
safely for `data-guide-link`, use html; otherwise keep plain `c` + structured
`links` and render tappable spans in the Know template.

**Implication:** Transform must **promote** `guide_links` (or provenance
`links`) into the published module (reversing Phase 1’s “metadata only”
stance for this one field). Audit trail can still keep a copy on the run.
Regenerate + republish Supernova after the change.

#### C. Client behavior on tap

**What it means.** Tap “Batteries & Energy section of this guide” → open that
system’s detail (same as picking it from the Know list).

**Recommendation:** Reuse existing `openSystem` / query-param path. If the
target module is missing from the published bundle, fail soft (no navigation,
phrase stays readable text).

**Implication:** Small Know-page change; no new routes. Works for Stage 4
system↔system xrefs first; checklist/fix targets (`target_kind` other than
`system`) can stay non-tappable until later.

#### D. Oracle / regression bar

**What it means.** Enrichment changes module JSON; it should not silently
rewrite Outremer *composer* prose unless we intend to.

**Recommendation:**

- Keep `verify_*_section_v4` + composed-draft byte expectations as today.
- Update Phase 1 module golden / republish after transform changes.
- Add a small smoke: enriched modules still pass `_validate_system_module`;
  at least one `list` or `steps` appears where Outremer drafts have `- `
  bullets; at least one published link resolves to a known `system:` id.

#### E. Scope vs Phases 4–5

**In Phase 1b:** styling + linkages for Stage 4 modules on vessels you already
Generate (Supernova).  
**Not in Phase 1b:** second vessel, registry merge, killing fragment path,
owner onboarding UI, xrefs to Fix/Do unless trivial.

### Workstreams

1. **Enrich transform** (`guide_section_to_module`) — split prose blocks into
   `prose` / `list` / `steps` / optionally `warnings` per heuristics (A).
2. **Publish links** — fold `guide_links` into module/section payload; stop
   treating them as metadata-only for the client (B).
3. **Know client** — render tappable xrefs; navigate via existing system open
   (C). Confirm list/steps styling looks right for Stage 4 content.
4. **Regenerate Supernova** — Generate → approve → publish; visual pass in
   app/API bundle.
5. **Tests** — validator + smoke for enriched shapes and link tokens; keep
   composer oracles green.

### Acceptance

- Published Stage 4 modules use `list` / `steps` (and warnings where
  appropriate) where drafts clearly have bullets/procedures — not only flat
  `prose`.
- Cross-section phrases that composers already mark as xrefs are tappable in
  Know and open the target system when that module is in the bundle.
- `_validate_system_module` still passes; Outremer composer verify scripts
  remain green.
- Phases 4 and 5 remain deferred until you call them up.

### Rough effort

~2–4 days if heuristics + Know tap wiring stay thin; longer if every composer
must emit typed blocks before anything ships.

### Open choices before implement

**Locked (2026-07-21):**
- **A — Hybrid heuristics** in the transform first; composers unchanged unless
  heuristics mis-classify.
- **B — In-prose tappable targets** (not a detached chip list); promote
  `guide_links` into the published module and wire Know to `openSystem`.

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

### Grounding facts (from the Outremer fixture)
Confirmed against `fixtures/pipeline/outremer/{equipment,profiles}.json`:
- `equipment_doc.relations` is **empty**; cross-device wiring is **inlined
  inside each profile** as `runs_platform`, `protects`, `protected_by`,
  `requires_devices`.
- Profiles are keyed by **base model handle** (`coi`, `mli_ultra`, `bg_zeus_sr`,
  …); `quantity` / `instance_handling` expand to per-unit (`coi_1..3`) at
  graph-build time.
- Per-vessel facts are a **surface**, not one field: `vessel_artifact_facts`
  (list of `{device_key, assertions[]}`), plus `hub_operation_sources`,
  `platform_version_confirmations`, `vessel_facts`, `installation_notes`,
  `notes`, `fixture_auth`, `vessel_display_name`.
- Platforms are already `equipment` rows with `entity_kind='platform'` + their
  own profile, reached via `runs_platform` edges.

### Discovery (2026-07-21) — fixture inventory ≠ admin registry
Inspecting `supernova`'s live registry against the Outremer fixture: only **6 of
19** fixture models match the registry by `(manufacturer, model)`. The rest are
the *same physical gear under different strings* (fixture `B&G Zeus SR 12` vs
registry `B&G Zeus SR`; `Alpha Pro III` vs `AlphaPro III`; `Mass Combi Pro` vs
`Mass Combi Pro 24/3500-100`; …), the registry carries ~24 models the fixture
lacks, and the fixture's hand-curated `device_key`s / `quantity` /
`instance_handling` don't map 1:1 to `vessel_equipment` rows. **Consequence:**
FK'ing profiles to `equipment.id` or hanging `device_key` on `vessel_equipment`
would require fuzzy reconciliation or *mutating admin data*, and still risk
byte-match drift. Phase 2 therefore stores a **self-contained, fixture-faithful
Stage-4 substrate decoupled from the admin registry**; linking Stage-4 models ↔
registry `equipment.id` is deferred to Phase 4 (de-hardcode for real vessels).

### Locked decisions (2026-07-21; decisions 1 & schema revised post-discovery)
1. **Profile identity** → keyed by a **natural model handle** (`profile_key`,
   e.g. `coi`, `alpha_pro_iii`), *not* a `equipment.id` FK. The
   `interaction_profile` row also carries the equipment_doc model fields
   (manufacturer/model/description/system_category) so the adapter reproduces
   the fixture without touching the admin registry. *(revised — see Discovery)*
2. **Edge separation** → **clean split now.** *All* cross-device edges
   (`runs_platform`, `protects`, `protected_by`, `requires_devices`) are
   extracted out of the stored profile into `vessel_equipment_relation`; the
   stored `interaction_profile` is **capability-only**. One rule: "every
   cross-device edge is boat-level." The adapter re-inlines edges to reproduce
   the fixture profile exactly (accepting minor duplication of model-inherent
   edge attrs like `host_kind`/`note` across sister ships).
3. **Per-vessel facts** → single `vessel_stage4_facts` JSONB doc holding all the
   named blobs above; split into tables later only if something needs querying.
4. **Fidelity bar** → strict byte-for-byte match to the fixtures.
5. **Platform modeling** → reuse `equipment(entity_kind='platform')` +
   `interaction_profile` + edges; revisit a first-class `platform` table in
   Phase 4 only if the registry UI/exports must treat platforms differently.

### Schema (new)
- **`interaction_profile`** — model-level library, one row per `profile_key`
  (natural model handle; UNIQUE). Columns: `profile_key`, `entity_kind`
  (`device`|`platform`), `manufacturer`, `model`, `description`,
  `system_category`, `profile JSONB` (**capability-only; cross-device edges
  stripped**), `documented_version`, `source_manual_refs`, provenance/status,
  `content_hash`. Optional nullable `equipment_id` FK left for Phase 4 linkage.
  Platform models are rows here too (decision 5).
- **`vessel_stage4_equipment`** — per-vessel inventory (replaces "`device_key`
  on `vessel_equipment`"): `(vessel_id, device_key, profile_key, quantity,
  instance_handling, provenance)`. Seeded verbatim from the fixture equipment
  rows. Unique `(vessel_id, device_key)`.
- **`vessel_equipment_relation`** — per-vessel edges:
  `(vessel_id, src_device_key, edge_type, dst_device_key NULL, attrs JSONB)`.
  `edge_type ∈ {runs_platform, protects, protected_by, requires_devices}`
  (extensible). `attrs` carries the rest of the inlined edge object
  (`host_kind`, `optional`, `note`, …). `dst` nullable for edges whose target
  is a platform_key or unresolved.
- **`vessel_stage4_facts`** — one JSONB doc per vessel (decision 3) holding
  `vessel_artifact_facts`, `hub_operation_sources`,
  `platform_version_confirmations`, `vessel_facts`, `installation_notes`,
  `notes`, `fixture_auth`, `vessel_display_name`.

### DB → composer adapter
`build_equipment_doc_from_db(conn, vessel_id)` and
`build_profiles_from_db(conn, vessel_id)` reconstruct the exact shapes
`build_vessel_graph` / `assemble_section_inputs` consume today:
- `equipment_doc.equipment[]` from `vessel_stage4_equipment` ⨝
  `interaction_profile` (by `profile_key`), including `entity_kind`,
  `device_key`, `manufacturer`, `model`, `description`, `system_category`,
  `quantity`, `instance_handling`, `provenance`.
- `equipment_doc.{relations:[], notes, installation_notes, fixture_auth,
  hub_operation_sources, platform_version_confirmations, vessel_facts,
  vessel_artifact_facts, vessel_display_name}` from `vessel_stage4_facts`
  (relations stays `[]` to match the fixture).
- `profiles{profile_key: profile}` from `interaction_profile.profile` with the
  boat's `vessel_equipment_relation` rows **re-inlined** (`runs_platform`,
  `protects`, `protected_by`, `requires_devices`) so each profile matches the
  fixture byte-for-byte.
- Canonical key ordering + normalization so JSON is identical to the fixture.

### Seeding
A one-shot `scripts/seed_stage4_substrate.py --fixture outremer --slug supernova`
migrates the current fixtures into the new tables: upsert `interaction_profile`
per model (`profile_key`) with edges **stripped**, insert per-vessel
`vessel_stage4_equipment` rows (device_key/quantity/instance_handling/
provenance), insert the stripped edges as `vessel_equipment_relation` rows,
write the `vessel_stage4_facts` doc. Idempotent; safe to re-run.

### Risk to Phase 1
None expected — Phase 2 sits entirely on the *input* side of the seam. The
Phase 1 transform, `SystemModule` contract, migration `022`, and publish path
are untouched. The only shared artifact is the composed-dict shape, which the
oracle pins.

### Acceptance
- `seed_stage4_substrate` populates the new tables from the Outremer fixtures.
- Adapter-built `equipment_doc` + `profiles` reproduce the composed drafts
  (composed output is the oracle; raw-JSON key order is not pinned since JSONB
  does not preserve it and the composers read fields by name).
- `verify_stage4_modules.py --byte-match` produces modules **and composer
  metadata** byte-identical to fixture-built for all four sections + folded
  solar.

### Phase 2 — status (2026-07-21): DONE
Delivered:
- **Migration `023`** — `interaction_profile` (model library, `profile_key`),
  `vessel_stage4_equipment` (per-vessel inventory, equipment row in JSONB),
  `vessel_equipment_relation` (extracted edges), `vessel_stage4_facts` (JSONB).
- **`stage4_substrate.py`** — edge `split`/`reinline` (decision 2) +
  `build_equipment_doc_from_db` / `build_profiles_from_db` adapter.
- **`scripts/seed_stage4_substrate.py`** — fixture → substrate; idempotent.
  Seeded `supernova`: 19 profiles, 20 equipment rows, 19 relations.
- **`stage4_sections.build_context` / `load_vessel_context_from_db` /
  `build_modules_from_context`** — one composition path for both sources.
- **`verify_stage4_modules.py --byte-match`** — Phase 2 gate. **Green:** all 4
  DB-built modules + metadata match fixture-built byte-for-byte.

Deviations from the pre-discovery locked design (see Discovery above): decision 1
profile identity is a natural `profile_key`, not an `equipment.id` FK
(`equipment_id` kept nullable for Phase 4); "`device_key` on `vessel_equipment`"
became the dedicated `vessel_stage4_equipment` table; the boat-level equipment
row is stored as JSONB (variable shape: `instances`, per-unit network addresses,
inline `relations`).

## Owner-questions (durable store)

Today owner-input questions live only as ephemeral `fact_queries` in scratch
JSON, `(Configuration pending)` prose, `config_unsourced` flags in
`expected.json`, and spec/inventory prose. Phase 1 introduces a durable store
(decision 2) so `fact_queries` from generation persist and carry forward until
dispositioned. Current open example: `zeus_czone_controller_visible`.

**UI stance (locked 2026-07-21):** the admin UI is for staff only. Owner
questions belong in a **separate vessel-onboarding UI** for the boat owner —
not in admin. Phase 3 continues to **upsert** into `owner_question` on
generate; answering / dismissing / feeding answers back into composers or
`vessel_stage4_facts` waits for that onboarding surface (and Phase 4+).

---

## Phase 3 — detailed design (orchestrator + admin)

**Objective.** Make Stage 4 the live generate path for the four published
system chapters: one admin click (or one library call) rebuilds
`equipment_doc` + `profiles` from the Phase 2 substrate, composes, transforms,
writes `guide_content` drafts + run metadata + owner questions — then the
existing approve→publish spine takes over.

**Non-goals (Phase 3).** No composer de-hardcoding / 2nd vessel (Phase 4); no
retirement of the fragment/LLM path for *other* systems (Phase 5); **no owner-
questions UI in admin** (owner-facing onboarding UI is a separate product
surface); no answering / dismissing / feeding answers back into composers or
`vessel_stage4_facts`; no admin UI for editing the Stage 4 substrate itself
(seed script remains the write path until a later phase).

### Grounding facts (current code)

- Admin **Generate** posts to `/admin/vessels/{id}/guide/generate` →
  `run_guide_generation` → per-module `generate_module`. For `system/*`,
  today's order is: equipment-gap placeholder → assemble from
  `equipment_guide_fragment` → LLM / pending placeholder. Stage 4 is **not**
  on that path; Phase 1 used a separate CLI (`ingest_stage4_sections.py`) that
  still reads **fixtures**, not the DB substrate.
- Generation sets: `shell` / `systems` / `checklists` / `fixes`. Checking
  **Equipment** expands to all `SYSTEM_IDS` (~13), of which only four
  (`batteries`, `controls`, `electrical`, `nav`) have Stage 4 composers.
  Solar folds into `batteries` (O1).
- Owner-questions table + `upsert_owner_questions` exist; **no admin route or
  template** references them yet.
- Phase 2 adapter + byte-match gate are green for `supernova`.

### Recommended locked decisions (confirm or override before implement)

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | **When to use Stage 4 for the four keys** | If the vessel has a Stage 4 substrate (`vessel_stage4_equipment` non-empty), generate those four via Stage 4. If not, fall back to the existing fragment/placeholder path (so vessels without a seed still Generate). Loud failure only when substrate exists but composition fails. |
| 2 | **Non–Stage-4 systems on Generate** | Leave on the existing fragment / pending / LLM path until Phase 5. Do not block or blank them. |
| 3 | **Orchestrator shape** | New `run_stage4_generation(conn, vessel_id, …)` that: loads substrate → `build_modules_from_context` → validates → one `guide_generation_run` + draft per section → attach metadata → upsert owner questions. Shared by admin and a thin CLI. |
| 4 | **Admin wiring** | Inside `generate_module` / `run_guide_generation`: when `content_key ∈ PUBLISHED_SECTIONS` and substrate present, call Stage 4 for that key (or batch the four once per Generate request). Prefer **batch-once** for the four so solar is composed once and folded, not four times. No separate button. |
| 5 | **Owner-questions UI** | **None in admin.** Keep upserting into `owner_question` on generate so the future owner onboarding UI has data. Answer / dismiss / re-compose from answers is out of Phase 3 (and out of admin entirely). *(locked)* |
| 6 | **CLI** | Retarget `ingest_stage4_sections.py` (or replace with `scripts/run_stage4_generation.py`) to use the DB substrate by default (`--slug`); keep `--fixture` only as a debug escape hatch. |
| 7 | **Fidelity** | After Generate from admin for `supernova`, drafts must match Phase 2 byte-match oracle (same modules as fixture-built), modulo `created_by` / run ids. |

### Orchestrator design

```
run_stage4_generation(conn, vessel_id, *, created_by, trigger, sections=None)
  1. Guard: vessel has substrate (else raise / return skipped).
  2. ctx = load_vessel_context_from_db(conn, vessel_id)
  3. modules, metadata = build_modules_from_context(ctx)
  4. snapshot_id = create_input_snapshot(...)   # reuse existing helper
  5. for sid in (sections or PUBLISHED_SECTIONS):
       validate → insert run (model_id=stage4_composer) → attach metadata
       → save draft → complete run → upsert_owner_questions
  6. return GenerationResult-compatible summary
```

Integration into `run_guide_generation`:
- Before the per-module loop (or at the start), if any requested module is a
  Stage 4 section **and** substrate exists: call `run_stage4_generation` for
  those keys once; remove them from the fragment/LLM loop.
- Remaining modules (other systems, shell, checklists, fixes) unchanged.

### Admin UI

- **Generate form:** unchanged checkboxes. Help text update: Equipment systems
  that have Stage 4 substrate use composers (deterministic); others still use
  fragments / placeholders. Drop or qualify the old “not AI” chip wording so it
  doesn't claim fragments for Stage 4 keys.
- **No owner-questions panel** in admin (decision 5). Staff may still see
  fact_queries inside generation-run `metadata` if they inspect a run; the
  product surface for answering is owner onboarding, later.
- **Optional light signal:** if substrate missing, a muted note “Stage 4
  substrate not seeded — system drafts use the legacy path.” Link to docs /
  seed command; no full substrate editor.

### New / changed files

- **New:** `backend/stage4_generation.py` (`run_stage4_generation`, substrate
  presence helper); optionally `scripts/run_stage4_generation.py`.
- **Touched:** `guide_generation.run_guide_generation` (dispatch); admin
  `overview.html` (help text only); `ingest_stage4_sections.py` (DB default);
  plan + Makefile if a smoke target is useful.
- **Unchanged:** composers, Phase 1 transform, Phase 2 tables/adapter,
  publish/serve/sync; no new owner-question admin routes.

### Acceptance

- Admin Generate with **Equipment** (or Full guide) on `supernova` writes the
  four Stage 4 drafts via `model_id=stage4_composer`, with run `metadata` and
  `owner_question` rows upserted — no fixture path involved.
- Those drafts pass the same shape validation as Phase 1; content matches the
  Phase 2 byte-match oracle for the vessel.
- Re-generate does not clobber already-answered owner questions (existing
  upsert rule); admin has no UI to answer them.
- Vessel **without** Stage 4 substrate: Generate still works via legacy path
  for all systems (decision 1 fallback).
- `make pipeline-verify` / `stage4-bytematch` remain green.

### Risk to Phases 1–2

Low. Phase 3 only changes *who calls* the already-proven compose→transform→
save path. Composers and substrate stay byte-stable; admin is additive.

### Rough effort

~2–3 days given Phase 1 ingest already proved the write path and Phase 2 proved
the DB input path — Phase 3 is mostly orchestrator wiring + admin dispatch /
help-text tweaks (no owner-questions UI).

### Phase 3 — status (2026-07-21): DONE

Delivered:
- **`stage4_generation.py`** — `vessel_has_stage4_substrate`,
  `run_stage4_generation` (DB substrate → compose once → drafts + metadata +
  owner_question upserts).
- **`run_guide_generation`** — when substrate present, batches the four
  published systems via Stage 4 and skips the fragment/LLM loop for those keys;
  other systems unchanged.
- **CLI** — `ingest_stage4_sections.py` defaults to DB substrate; `--fixture`
  remains a debug escape hatch.
- **Admin** — Generate help text + substrate seeded / not-seeded note; no
  owner-questions UI.

Verified on `supernova`: CLI + `run_guide_generation` write four
`stage4_composer` drafts that **MATCH** the Phase 2 fixture oracle byte-for-byte;
run metadata includes provenance; 2 open owner questions upserted;
`verify_stage4_modules.py --byte-match` green.

---

## Phase 4 — detailed design (de-hardcode + 2nd vessel)

### What Phase 4 is for (plain language)

Phases 1–3 proved the *pipeline*: composers → live modules → DB substrate →
admin Generate → publish. That pipeline currently works end-to-end for **one
boat’s knowledge** — the Outremer / Supernova fixture.

Phase 4 asks a different question: **can the same composers write a sensible
guide for a different boat?**

Today the answer is mostly “no, not honestly.” The graph correctly discovers
*which equipment belongs in Batteries / Controls / Electrical / Nav*, but the
*sentences* still assume Outremer’s plant:

- Internal maps say “when you see key `mli_ultra`, call it the house batteries
  (Mastervolt MLI Ultra 24/6000).”
- Membership filters look for keys that *start with* `bg_zeus_sr` or `coi`.
- Prose hardcodes “two inverter-chargers,” “davit array,” “about 18 kWh,”
  “Fischer Panda 8000i,” etc.

So if vessel B has different keys, a different house bank, or only one Combi,
the guide either says “the device,” repeats Outremer brand names that aren’t
aboard, or invents layout that isn’t true. Phase 4 removes that Outremer-shaped
assumptions layer so vessel B gets chapters that name *its* gear — and so
Outremer’s already-published quality does not regress (we keep the byte-match
oracle as a hard check).

**End of Phase 4:** a second vessel with a Stage 4 substrate can Generate →
approve → publish readable batteries (+ solar fold), controls, electrical, and
nav chapters that a human would accept as about *that* boat.

**Not in Phase 4:** owner onboarding UI (separate product); killing the old
fragment/LLM path for engines/water/etc. (Phase 5); a universal “any boat on
earth” composer that invents chapters for stacks we’ve never modeled; admin UI
to edit the Stage 4 inventory by hand.

---

### What’s wrong today (concrete picture)

Think of two layers:

1. **Who’s in the chapter** — already mostly vessel-agnostic. The vessel graph
   and `assemble_section_inputs` put Touch screens in Controls, MPPTs in Solar,
   chartplotters in Nav, based on roles and sections.
2. **What the chapter says** — still Outremer-specific. Each composer carries
   private dictionaries (`DISPLAY_NAMES`, `MANUFACTURER_MODEL`) and code like
   “find keys starting with `mli_ultra`,” then emits sentences written for that
   plant.

| Composer | What breaks on a different boat |
|----------|----------------------------------|
| **Solar** | Worst. Only looks for two Victron key names; assumes davit vs coachroof arrays and panel counts; says the chargers feed a Mastervolt MLI house bank. |
| **Batteries** | Assumes MLI Ultra 24/6000 house bank and Outremer charge-path brands (Combi, Alpha, Fischer Panda, Silentwind). Wrong kWh if quantity/model differ. |
| **Nav** | Assumes B&G Zeus SR (+ Halo) keys and CZone appearing on the MFD. A Garmin/Raymarine helm won’t get coherent MFD prose. |
| **Controls** | Finds the hub from the graph (good) but still talks like CZone Touch and “the two inverter-chargers.” |
| **Electrical** | Most reusable structure (isolation, Class-T, COIs) but still keyed to Outremer-ish `device_key` families and CZone/MasterBus wording. |

**Implication:** Phase 4 is mostly a *composer rewrite / generalization*
project, not a new database phase. The Phase 2 tables and Phase 3 Generate
button stay; we change how sentences are built from whatever substrate is
loaded.

Also important: Stage 4 inventory is still **separate** from the admin
equipment registry (Phase 2 discovery). Vessel B does *not* need registry
name-matching to get a guide — it needs a Stage 4 substrate seed (fixture or
curated rows), same as Supernova.

---

### Decision topics — expanded

Each topic below is something you should choose before we implement. For each:
what it means, why it matters, the recommendation, and the practical
implication of that choice.

#### 1. Ambition — how different can vessel B be?

**What it means.** How far we push generalization in this phase.

- **Same-family:** Vessel B still looks like the world the composers were
  written for — digital switching (CZone or close cousin), an MFD helm, a
  Mastervolt/Victron-style DC plant. It may have *fewer* boxes, different
  quantities, or slightly different model strings, but the *kinds* of chapters
  still make sense.
- **Fully arbitrary:** Vessel B might be all Raymarine, no CZone, lithium from
  another vendor, no solar — and we still expect polished chapters for every
  system id.

**Why it matters.** Same-family is weeks of careful refactor with a known
oracle. Fully arbitrary is a rewrite of the composition approach itself
(data-driven templates for unknown plants), much larger and easy to break
Outremer quality while chasing generality.

**Recommendation:** Same-family (or a *thinned* synthetic fixture that is
still the same OEM family). Radically different stacks get honest “not covered
yet” gaps — not invented chapters.

**Implication if you accept:** Phase 4 proves “second boat in the same product
family,” which is the real commercial path (sister ships / same yard). It does
*not* claim “any yacht.” Claiming any yacht becomes a later phase once naming
and facts are clean.

**Implication if you reject (go maximal):** Budget and risk jump; Outremer
byte-match becomes harder to hold; we’d redesign templates, not just maps.

---

#### 2. Second vessel identity — which boat is B?

**What it means.** We need a concrete target to seed and Generate against.
Options:

- **(a) `cattitude`** — real slug already in the product; inventory in admin
  today does *not* match Stage 4 shape, so we’d still curate a Stage 4 substrate
  (not “just flip Generate”).
- **(b) Synthetic thinned fixture** — e.g. copy Outremer, remove radar / one
  Combi / solar coachroof, rename the vessel. Fastest proof that composers
  don’t depend on exact Outremer counts and keys.
- **(c) Another real boat** — best product proof, highest inventory-authoring
  cost up front.

**Why it matters.** W3 (seeding) and acceptance tests hang on this choice.
Without it we can refactor maps in the dark and never know if chapters read
well.

**Recommendation:** Prefer a real second slug if you’re ready to curate its
Stage 4 inventory; otherwise start with (b) to unlock composer work, then swap
in a real B. **You must pick before we implement W3.**

**Implication:** (b) proves the *code* is vessel-parameterized quickly. (a)/(c)
prove the *product* story. Mixing both (synthetic first, real second) is fine
and often cheapest.

---

#### 3. Naming source — where do reader-facing names come from?

**What it means.** Today each composer has hand-maintained maps:

```text
DISPLAY_NAMES["mli_ultra"] = "the house batteries"
MANUFACTURER_MODEL["mli_ultra"] = ("Mastervolt", "MLI Ultra 24/6000")
```

Unknown keys fall back to “the device,” which is useless in a guest guide.

**Why it matters.** Maps don’t scale: every new model on every boat needs an
edit in five Python files. The equipment rows and profiles already carry
manufacturer, model, description, instance labels — we should read those.

**Recommendation:** Primary path = derive labels from profile / equipment_doc
fields via one shared helper. Role nicknames (“house bank”, “davit controller”)
only when explicitly recorded in vessel facts or profile tags — not as a giant
Outremer key dictionary.

**Implication if you accept:** New gear on vessel B shows up under its real
model name automatically once it’s in the substrate. Outremer prose must still
byte-match — so the helper has to produce the *same* wording Outremer already
uses when fed Outremer data (or we adjust the oracle carefully in the same
change). That’s the fiddly part of W1.

**Implication if you keep maps:** Phase 4 shrinks to “add vessel B’s keys to
the maps,” which works once and becomes permanent debt.

---

#### 4. Family detection — how do we find “all the house batteries”?

**What it means.** Composers don’t only name one device; they group families
(“all COIs,” “all Zeus displays”). Today that grouping is string matching on
Outremer’s private key scheme (`startswith("coi")`, `bg_zeus_sr_*`).

**Why it matters.** Vessel B might use `combination_output_1` or a different
catalog_key. Same physical role, different string → family missed → thin or
empty section.

**Recommendation:** Detect families from graph/profile signals (section
assignment, role, `entity_kind`, functional class, network claims) so Outremer
keys still match *and* differently named keys can match. Outremer byte-match
must stay green — predicates must recognize today’s keys.

**Implication:** Slightly more abstract code; much less “rename your device_keys
to look like Outremer.” Sister ships with similar profiles work; random key
schemes still need consistent profiling.

---

#### 5. Numeric / layout facts — where do “18 kWh” and “davit array” live?

**What it means.** Some sentences aren’t discoverable from a manual extract:
total bank kWh, which MPPT is davit vs coachroof, how many Combis to say aloud,
panel counts. Those are *boat facts*. Today several are hardcoded as if every
boat were Outremer.

**Why it matters.** Wrong numbers are worse than omissions in a guest guide.
Silent defaults (“assume 2 Combis”) will lie on vessel B.

**Recommendation:** Put those values in `vessel_facts` (already on the Stage 4
facts doc). If missing → omit the number, use a generic phrase, or raise an
honest gap / owner question — **do not** invent Outremer geometry.

**Implication:** Authoring vessel B includes filling a small facts list (or
accepting thinner chapters). Composers get simpler and safer. Outremer’s
current facts stay in its fixture so byte-match still holds.

---

#### 6. Oracle bar — what does “done” mean for each boat?

**What it means.** Two different quality bars:

- **Outremer / Supernova:** keep **byte-for-byte** match to the frozen fixture
  drafts (Phase 2 gate). Any composer change that alters Outremer wording fails
  CI until fixed or the oracle is intentionally updated.
- **Vessel B:** **coherence** only — valid `SystemModule` shape, names its own
  gear, evaluators pass or are parameterized; we do *not* require B’s prose to
  equal Outremer’s.

**Why it matters.** Without the Outremer gate, “generalizing” silently rewrites
the boat you already care about. Without a weaker B bar, you’d never ship B
because it can never match Outremer text.

**Recommendation:** Keep both bars as stated.

**Implication:** Every composer PR is checked against Outremer first. Vessel B
gets a thinner smoke test (shape + a few must-include / must-not-include
strings), not a full prose freeze.

---

#### 7. Registry ↔ substrate — do we merge admin inventory with Stage 4?

**What it means.** Admin `vessel_equipment` (what staff install on the boat in
the UI) and Stage 4 substrate (what composers read) are still two datasets.
Only ~6/19 Outremer models matched by name when we looked. Phase 2 chose not to
force-merge them.

**Why it matters.** Merging is tempting (“one inventory”) but is a data-cleaning
and product-model problem, not required to prove composers are vessel-agnostic.

**Recommendation:** **Still deferred.** Seed vessel B’s Stage 4 substrate the
same way we seeded Supernova (fixture or curated script). Link
`equipment.id` / derive substrate from admin installs later (Phase 4b or Phase 5
prep) when you want a single source of truth.

**Implication if you accept:** Phase 4 stays focused on composers + a second
seed. Staff may still maintain parallel inventories for a while.
**Implication if you insist on merge now:** Phase 4 grows by a reconciliation
project (fuzzy matching, renaming, or mutating admin data) before B even
Generates.

---

#### 8. Honest gaps — what if vessel B has no solar / no CZone page?

**What it means.** Not every published section id will have gear on every boat.
Today Outremer-shaped sentences might still fire from defaults. Better behavior:
say less, or say “not fitted / not yet documented,” or skip writing a useless
module.

**Why it matters.** Guests trust the guide; wrong brand mentions destroy trust
faster than a short gap.

**Recommendation:** Prefer skip-or-honest-gap over thin wrong prose. Prefer a
short capability line + gap over pasting Outremer brand banks.

**Implication:** Vessel B’s published bundle may have fewer rich chapters than
Supernova — that’s success if what’s present is true. Product/UX later can
hide empty system tiles; Phase 4 doesn’t require full catalog coverage on B.

---

### Recommended decision summary (same as the table, for scanning)

| # | Topic | Recommendation |
|---|--------|----------------|
| 1 | Ambition | Same-family 2nd vessel (not fully arbitrary plants) |
| 2 | Vessel B | Pick real slug or thinned synthetic fixture before W3 |
| 3 | Naming | Derive from profile/equipment fields; retire map-as-primary |
| 4 | Families | Graph/profile predicates, not Outremer key prefixes |
| 5 | Numbers/layout | `vessel_facts` or omit/gap — no silent Outremer defaults |
| 6 | Oracle | Outremer byte-match stays; B = coherence only |
| 7 | Registry link | Still deferred |
| 8 | Empty sections | Honest gap / skip, never wrong brand |

---

### Workstreams (what we would actually build)

**W1 — Shared naming & family helpers**  
One place composers ask “what do we call this?” and “which keys are in this
family?” so we don’t maintain five Outremer dictionaries.

**W2 — Composer pass (Electrical → Controls → Nav → Batteries → Solar)**  
Rewrite one section at a time. After each: Outremer verify + byte-match green;
spot-read vessel B. Order puts the easier/safer sections first; Batteries/Solar
are the long pole (layout facts).

**W3 — Seed vessel B’s Stage 4 substrate**  
Fixture or curated rows + `seed_stage4_substrate.py`. Needs a display name and
whatever facts W2 requires (or accept gaps).

**W4 — Generate path proof**  
CLI or admin Generate on B → drafts validate → approve → publish → open
`bundle.json` and read it as a human.

**W5 — Tests**  
Keep Outremer goldens. Add a thin B smoke test. Do not freeze B prose to match
Outremer.

---

### Acceptance

- Outremer / `supernova`: `make pipeline-verify` and `make stage4-bytematch`
  remain green (byte-identical to fixture oracle).
- Vessel B: Stage 4 substrate seeded; Generate writes `stage4_composer` drafts
  for sections that have members; modules pass `_validate_module_payload`.
- Vessel B drafts name **its** gear where members exist; missing plant → honest
  gap or omitted section, not Outremer brand names.
- Per-composer `DISPLAY_NAMES` / `MANUFACTURER_MODEL` maps gone or negligible;
  Outremer-only key literals removed from membership logic.
- Registry reconciliation **not** required (decision 7).

### Risk to Phases 1–3

Medium on composers (prose churn) — mitigated by the Outremer byte-match gate
after every change. Orchestrator, substrate schema, and admin dispatch stay
untouched unless vessel-B seeding needs a trivial CLI flag.

### Rough effort

~1–2 weeks depending on how different vessel B is (decision 2) and how far
Batteries/Solar layout facts go. Electrical + Controls + Nav same-family is the
fast path; Batteries/Solar are the long pole.

### Open question before implement

**Which vessel is B?** (a) `cattitude` with curated Stage 4 inventory,
(b) thinned synthetic fixture, or (c) another real boat. Lock decisions 1–2
(and confirm 3–8) before W3.
