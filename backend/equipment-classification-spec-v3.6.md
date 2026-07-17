# Equipment classification specification — v3.6

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v3.6** addresses under-extraction on large manuals: retrieval depth scales
with chunk inventory, heading-coverage metrics + `coverage_low`, and
absence-class validators with targeted repair (not re-extraction).

---

## Pipeline

| Stage | Name | Who | Scope |
|------:|------|-----|--------|
| 0 | Manual section index / excerpt routing (+ scaled retrieval) | Heuristics / RAG | Per manual |
| 1 | Interaction profile extraction | LLM, structured JSON, temp 0 | Per equipment model |
| **1.5** | **Validation (+ auto-repair + absence/evidence repair)** | **Pure code** (+ LLM repair) | **Per profile** |
| **1.6** | **Derived operator actions** | **Pure code** | **Per profile** |
| 2 | System graph + section assignment | Pure code | Per vessel |
| 3–4 | Tier + guide views | LLM / templating | Per vessel |

---

## Stage 0 retrieval scaling (v3.6)

Module: `manual_retrieval.py`.

- Inventory all indexed chunks for the selected manuals.
- `top_k` scales with chunk count (floor 6 for manuals >40 chunks; max 16),
  not diluted by query count.
- After scaled queries, a **heading-fill** pass retrieves for priority missing
  numbered headings (chapters 3–7).
- Every extraction input persists a **coverage** object:
  - `chunk_count`, `heading_count`, `heading_coverage_fraction`
  - `headings_all` / `headings_covered` / `headings_missing`
  - `top_k_used`, `heading_fill_*`
- Validator flag `coverage_low` (**warning**) when
  `heading_coverage_fraction < 0.25`. Persisted on the profile under
  `coverage`. Does **not** set `needs_rextraction`.

Heading guess: skip TOC dotted leaders / page crumbs; join truncated first
lines (e.g. `"Restart when"` + `"alarm is over"`).

---

## Absence-class validators → targeted repair (v3.6)

| Flag | Meaning | Remedy |
|------|---------|--------|
| `action_without_surface` | Action text implies settings/app/panel/menu/button/display but `control_surfaces` empty | Absence repair LLM (network/operation excerpts) |
| `speaks_but_inert` | `networks.speaks` non-empty while all `data_roles` false | Same absence repair — re-evaluate `data_roles` + surfaces |
| `category_freeform_provenance` | `category_freeform` is snake_case / registry taxonomy (`electrical_dc`, …) | Strip + absence repair; **never** pass registry `system_category` into the extract prompt or post-fill from it |
| `coverage_low` | Heading coverage below threshold | Warning only (fix retrieval scaling / re-ingest) |
| `evidence_incomplete` | Priority fields lack evidence | One-shot evidence repair (after absence repair) |

None of the above set `needs_rextraction` (still reserved for `fewshot_leakage`
and unresolvable `dangling_needed_for`).

`category_freeform` leak root cause: DEVICE TO PROFILE previously included
`system_category: electrical_dc` and post-processing defaulted empty categories
from the registry enum. Both removed in v3.6.

---

## Fixtures / harness

- SmartSolar golden: `tests/fixtures/smartsolar_corrected_extraction.json`
- Mass Combi golden: `tests/fixtures/masscombi_golden.json`
  (`Fixture-Auth: human chat 2026-07-14`)
- SKIP/BLOCKED of golden comparison still fails the run (exit 3).
- Offline: `.\pipeline_verify.ps1 -Regression`

---

## Revision history

| Ver | Notes |
|-----|-------|
| 3.5 | Contradiction auto-repair; narrow `needs_rextraction`; SKIP-fails-run |
| 3.6 | Scaled retrieval + heading fill; coverage metric/`coverage_low`; absence validators + repair; Mass Combi golden; category taxonomy leak fix |
