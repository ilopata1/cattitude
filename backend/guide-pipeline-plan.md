# Guide pipeline — engineering plan

How vessel guide equipment content should evolve after MVP lessons.
Operator-facing behavior remains documented in [`README.md`](README.md).

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
| Stage 3–4 production wire-up | Stage 3 content-tier **preview** (deterministic) shipped for vessel harness; LLM Stage 3 + Stage 4 views still open |
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
| **Engines Stage 4 (frozen)** | Done — frozen for reuse (spec v4.41); Nanni N4.65; instrument-panel start/stop; xliv affirmative station; `verify_engines_section_v4.py` |
| **Global composition spine (v4.15)** | Done — `guide_composition_rules.py`; orphan/vocab/wisdom slot; B&E v2; xxxii–xxxv |
| **Composition clarifications (v4.16)** | Done — same-breath check; sentence-initial spell-out; surface-bound adjusting |
| **Composition clarifications (v4.17)** | Done — instruction occasion; paragraph-final pointers; ratings/daily/BMS co-location |
| **Composition clarifications (v4.18)** | Done — provenance-leak vocabulary (`surveyed`/`attested`/…); Combi occasion re-check |
| **Field-pack migrations (v4.19)** | Done — `profile_field_packs.py`; occasion schema + Combi offline pack #1 + vessel promote |
| Evidence attachment (`evidence_unattached`) | Done — `vessel_evidence.py`; founding fixture + Outremer deck-photo retrofit |
