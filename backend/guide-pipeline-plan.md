# Guide pipeline — engineering plan

How vessel guide equipment content should evolve after MVP lessons.
Operator-facing behavior remains documented in [`README.md`](README.md).

**How we author (start here for extract / compose work):**

| Doc | Role |
|-----|------|
| [`../PLAYBOOKS.md`](../PLAYBOOKS.md) | Repeatable checklists — new device extraction, new guide section, inventory change, defect→fixture |
| [`../PRINCIPLES.md`](../PRINCIPLES.md) | Standing rules the playbooks apply (detector before repairer, honest red, provenance, …) |
| [`../standard_frame.txt`](../standard_frame.txt) | Review-round protocol — classify each note (rule / fact query / one-off), disposition table, frozen-section regression on global rule changes |
| [`fixtures/pipeline/README.md`](fixtures/pipeline/README.md) | Fixture layout: `outremer/` goldens, `scratch/` working extracts/drafts, `oracles/` Stage 4 byte-match |
| [`tests/fixtures/POLICY.md`](tests/fixtures/POLICY.md) | `Fixture-Auth` — agents must not reshape goldens without human authorization |

Live Generate/publish for frozen Stage 4 systems:
[`guide-stage4-integration-plan.md`](guide-stage4-integration-plan.md).

## Product constraints (keep)

- **Ask** stays a separate RAG path over cleared manuals.
- **Equipment prose** stays vessel-agnostic and reusable (`equipment_guide_fragment`).
- **Sister ships** must still reuse approved fragments (“first boat pays”).
- **Guest Know/Fix** exclude install / commissioning / dealer tooling.
- **Human review** stays mandatory before publish.

## Problem MVP exposed

Fragments alone cannot decide, for a *specific vessel*:

- which optional accessories / control surfaces are actually present
- hub / network topology and “taught via” control paths
- which Know chapter is the device’s **home** vs a cross-reference
- operate vs monitor vs reference ordering inside a chapter

Blind `sections.extend` plus category dual-membership (`electrical_dc` → both
Electrical and Batteries) produced oversized, install-tinged Electrical modules.

## Target architecture (stages)

Design rule: **the LLM never re-derives anything code has already computed.**

| Stage | What | Who | Scope |
|-------|------|-----|--------|
| **0** | Manual section index / excerpt routing | Heuristics first; cheap LLM only if headings fail | Per manual |
| **1** | Interaction profile (facts: surfaces, actions, networks, `requires_devices`) | LLM, structured outputs, temp 0 | Per equipment model |
| **1.5** | Post-extraction validation (+ optional evidence repair) | Pure code (+ one LLM repair) | Per profile |
| **1.6** | Derived operator actions (e.g. consult error codes) | Pure code | Per profile |
| **2** | System graph, accessory resolution, section home, cross-refs, structural flags | **Deterministic code** + alias/keyword tables | Per vessel |
| **3** | Tier assignment + section fallback for flagged oddballs | Small LLM over **computed facts** | Per vessel |
| **4** | Guide assembly = **views** (filter by section, order by tier, append xrefs) | Templating / code | Per vessel |

Terminology:

- **Manual sections** — chapters inside a product PDF (Stage 0).
- **Guide sections** — Know chapters (`SYSTEM_IDS`: `electrical`, `batteries`, …).
- Keep guide section ids aligned with `SYSTEM_CATALOG`; do not invent a parallel taxonomy.

## Authoring process (extract → compose → freeze)

Platform Generate/publish is documented in the operator [`README.md`](README.md).
**Building or changing** interaction profiles and Stage 4 section composers follows
the playbooks — not ad hoc edits to scratch markdown.

### Interaction profile (new device)

Follow [`PLAYBOOKS.md`](../PLAYBOOKS.md) §1:

1. Confirm source/genre (stop on edition mismatch; do not invent operation from setup-only manuals).
2. Stage 0 route → Stage 1 extract into `fixtures/pipeline/scratch/`.
3. Review validators, coverage, procedure inventory, accounting trail **before** repair.
4. Adjudicate narrowly; trail-verified zeroes only; one targeted repair pass.
5. Promote to golden under `Fixture-Auth`; run `make pipeline-verify` (+ compare/regression as needed).

Standing rules: [`PRINCIPLES.md`](../PRINCIPLES.md). Defects become bidirectional fixtures
(playbook §4) — never “fix the golden to match the latest extract.”

### Guide section (compose / freeze)

Follow [`PLAYBOOKS.md`](../PLAYBOOKS.md) §2:

1. Assemble section inputs (`assemble_section_inputs`) + vessel facts; persist inputs beside the draft.
2. Compose via the section’s `guide_section_*.py` composer (spine + criteria).
3. Evaluate v4 criteria; review sentence-by-sentence against the provenance map.
4. Freeze template/rules only after human review.

**Review rounds** use [`standard_frame.txt`](../standard_frame.txt): classify each
item as rule change, fact query, or one-off; return a disposition table; never
invent facts; any global rule change re-runs **all frozen sections** and reports
pass / what broke. Tip specs (`equipment-classification-spec-v4.3x.md`) record
freeze notes; do not treat tip files as the process — the playbook + frame are.

### Fixtures in this workflow

| Location | Role |
|----------|------|
| `fixtures/pipeline/scratch/` | Working extracts and section drafts (gitignored) — safe to overwrite |
| `fixtures/pipeline/outremer/` | Hand-authorized vessel inventory + profiles + expected graph; seeds Stage 4 substrate |
| `fixtures/pipeline/oracles/` | Frozen Stage 4 module byte-match oracles |
| `tests/fixtures/` | Extraction / Stage 1.5 / Stage 2 regression goldens and defect fixtures |

Scratch is for iteration; goldens and oracles are the contract. Promoting scratch →
golden or changing `outremer/` / `tests/fixtures/` requires explicit `Fixture-Auth`
([`tests/fixtures/POLICY.md`](tests/fixtures/POLICY.md)). After freeze, live
Generate reads the **DB substrate** seeded from fixtures — not the scratch files.

### Later — admin UI productizes this loop

Cursor + playbooks are the **interim** authoring surface. Once Phase 4–5 ship and
several vessels have been onboarded through fixtures → seed → Generate →
`standard_frame` review, staff happy-path authoring should move into the **admin
portal** (extract jobs, profile review/promote, substrate/facts, re-compose with
provenance). Novel composers and hard extract adjudication stay expert/Cursor
longer. Tracked as **Phase 6** in
[`guide-stage4-integration-plan.md`](guide-stage4-integration-plan.md) and
noted on [`PLATFORM_ROADMAP.md`](../PLATFORM_ROADMAP.md) Phase 6.

Split of assets:

| Asset | Reuse scope | Role |
|-------|-------------|------|
| Interaction profile | Per equipment model | Structured facts for Stage 2 |
| Guide fragment (prose) | Per equipment model | Guest-facing text blocks |
| Vessel graph / tiers / homes / xrefs | Per vessel | Membership and order at assembly |

## Sequencing (agreed)

Do **not** replace the fragment + approve path in one rewrite.

1. **Now — assembly hygiene (production)**
   - Ordered guest **skeleton** instead of blind concat (especially Electrical / Batteries).
   - **Primary home** routing so charge/storage devices stop dual-dumping into Electrical.
   - Later in this same track: fragment size caps + approve-time quality gates.

2. **Next — offline spike (not wired to `generate_module`)**
   - Stage 1 profile schema + extraction script.
   - Stage 2 pure functions + Outremer (and friends) exact-match unit tests.
   - Prove roles, flags, homes, control paths before any LLM tier work.
   - **Status: done for Outremer fixture** — see modules/scripts below.

3. **Then — integrate**
   - Evolve `assemble_system_from_fragments` into Stage-4 views (tier order + xrefs).
   - Stage 3 tier LLM only after Stage 2 fixtures stay green.

4. **Defer**
   - Full Stage 0 indexing until Stage 1 excerpt quality plateaus.
   - `protects` / `protected_by` extraction enrichment until degraded xref tests exist.
   - Judgment flags (`hub_domain_split`, etc.) until multi-hub fixtures exist.

## Near-term implementation notes

- Keyword / category tables in code are intentional — small, testable marine knowledge
  (preview of Stage 2.6), not a substitute for interaction profiles.
- Guest assembly must keep filtering installer/commissioning content even if Stage 1
  profiles become richer later.
- Coverage / “equipment linked” checks must use the same primary-home rules as assembly,
  or Electrical will look “pending” when only batteries gear is linked.

## Status

| Item | Status |
|------|--------|
| Skeleton assembly + primary home (Electrical / Batteries) | Done (`guide_system_assembly.py`; verify with `scripts/verify_system_assembly.py`) |
| Fragment size caps / approve gates | Open |
| Quarantine bad harvested fragments / manual_type audit | Open (ops) |
| Stage 1–2 offline spike | Done — Stage 1 map-reduce + voting + cal K/L/M; vessel Outremer live+stub Stage 2+3; see `equipment-classification-spec-v3.9.md` |
| **Stage 1 display host (v4.44)** | Done — `control_surfaces[].hosting` + `display_host_unresolved` (Playbook 1C); Watchkeeper §1.D `external_mfd` |
| Stage 3–4 production wire-up | **Stage 4 Phases 1–3 shipped** (composers → substrate → admin Generate) — see `guide-stage4-integration-plan.md`. Stage 3 LLM tier still open; Phase 4 de-hardcode + 2nd vessel open |
| **Queued:** CZone platform ui_pages action completeness | **Done** — Favourites/Alarms/Control/Monitoring via `reextract_czone_ui_pages.py` (Climate already); completeness `ok`; `promote_czone_2_0.py` |
| Solar Stage 4 composition pilot (v2 rendering) | Superseded by v3 |
| **Solar Stage 4 v3 (frozen)** | Superseded by v4 (spec v4.9) |
| **Solar Stage 4 v4** | Done — capability→task template; context_shaping absences; reader voice; `verify_solar_section_v4.py` |
| **Section input assembly + Controls pilot (v4.10)** | Composer introduced — ship-with-honest-gaps; criteria xx–xxii; `verify_controls_section_v4.py` |
| **Controls and Monitoring Stage 4 (frozen)** | Done — frozen for reuse (spec v4.30); xx–xxv; honest-gap Modes/Favourites placeholder; frozen-section regression with Solar + Batteries |
| **Electrical Panel Stage 4 (frozen)** | Done — frozen for reuse (spec v4.36); lvi–lxix; ACR + live COI; multi-occasion action-first; frozen-section regression with Solar + Batteries + Controls |
| **Global reader voice (v4.11)** | Done — `guide_reader_voice.py`; style_warnings; prompts; generate report-only |
| **Xref reader voice + links (v4.13)** | Done — `format_section_xref` / `guide_links`; authorial xref lint; Controls wired |
| **Batteries Stage 4 (v4.14)** | Composer introduced — xxvi–xxxi; Controls/Electrical xrefs; Solar leaf pointer |
| **Batteries & Energy Stage 4 (frozen)** | Done — frozen for reuse (reaffirmed spec v4.30); xxvi–xli; `verify_batteries_section_v4.py`; frozen-section regression with Solar + Controls |
| **Water systems Stage 4 (frozen)** | Done — frozen for reuse (spec v4.39); Dessalator Duo; NAVIGATOR panel; Mini Remote + flush omitted; `verify_water_section_v4.py` |
| **Nav Stage 4 (frozen)** | Done — v4.43 Watchkeeper absorb (Zeus SR×2 + software + Halo + Sea.AI Watchkeeper); prior founding v4.37.6; `verify_nav_section_v4.py` |
| **Engines Stage 4 (frozen)** | Done — frozen for reuse (spec v4.41); Nanni N4.65; instrument-panel start/stop; xliv affirmative station; `verify_engines_section_v4.py` |
| **Heads & waste Stage 4 (preparing)** | Playbook 2A — founding composer + discharge-valve inventory; Tecma Stage 1 still queued; **not** in `PUBLISHED_SECTIONS`; `verify_heads_section_v4.py` |
| **Global composition spine (v4.15+)** | Done — `guide_composition_rules.py`; orphan/vocab/wisdom slot; B&E v2; xxxii–**xlv** (v4.42: places → Equipment Locations table, not inline capability) |
| **Composition clarifications (v4.16)** | Done — same-breath check; sentence-initial spell-out; surface-bound adjusting |
| **Composition clarifications (v4.17)** | Done — instruction occasion; paragraph-final pointers; ratings/daily/BMS co-location |
| **Composition clarifications (v4.18)** | Done — provenance-leak vocabulary (`surveyed`/`attested`/…); Combi occasion re-check |
| **Field-pack migrations (v4.19)** | Done — `profile_field_packs.py`; occasion schema + Combi offline pack #1 + vessel promote |
| Evidence attachment (`evidence_unattached`) | Done — `vessel_evidence.py`; founding fixture + Outremer deck-photo retrofit |
