# Equipment classification specification — v3.7

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v3.7** restructures Stage 1 as **map-reduce** so large manuals (many
routed excerpts) are not saturated by a single LLM call.

---

## Pipeline

| Stage | Name | Who | Scope |
|------:|------|-----|--------|
| 0 | Excerpt routing (+ scaled retrieval / coverage) | RAG + heuristics | Per manual |
| **1 map** | Per-group interaction profile extract | LLM, temp 0 | Per chapter/batch |
| **1 reduce** | Merge group profiles | **Pure code** | Per equipment model |
| **1.5** | Validation + auto/absence/evidence repair | Pure code (+ LLM repair) | Per merged profile |
| **1.6** | Derived operator actions | Pure code | Per merged profile |
| 2–4 | System graph → tiers → views | Code / LLM | Per vessel |

---

## Stage 1 map

1. Partition routed excerpts using the heading inventory into top-level
   **chapters** (`chapter_N`). Only genuine TOC titles (short lead words like
   `OPERATION`, `INSTALLATION`, …) count — page crumbs / voltages do not.
2. **Fallback:** when the inventory exposes no TOC chapters: **one** group if
   ≤36 excerpts; else ≤4 larger batches (avoids single-call saturation on
   dense SmartSolar-sized payloads without shattering into a dozen micro-calls).
   When chapters exist but some excerpts do not assign, leftover batches of
   6–8; coalesce if total groups exceed 8.
3. Run the existing `extract_interaction_profile` prompt **unchanged**, with one
   added line:
   > These excerpts are one part of a larger manual; profile only what THIS
   > text supports; empty fields are correct if this text doesn't cover them.
4. Groups that return **zero** fields despite excerpts get **one** map retry
   with a stronger “do not return all-empty if THIS text describes …” trailer.
5. Persist per-group `*_groups/<group_id>_{input,output}.json` beside the
   merged profile / `_input.json` (directory cleared each run).

---

## Stage 1 reduce — merge semantics

Module: `interaction_profile_merge.py`.

| Field | Merge rule |
|-------|------------|
| `operator_actions`, `control_surfaces`, `networks.speaks`, `requires_devices`, `evidence`, desc-lists | **Union** with fuzzy dedupe (reuses Stage 1.6-style similarity) |
| `evidence` cap (8) | Applied **after** union; keep priority supports_field first (`requires_devices` → `data_roles.*` → `safety_role.*` → surfaces → actions) |
| `data_roles.*`, `safety_role.*` | **OR** (true wins); `requires_devices` kept as conditional entries |
| `device.category_freeform` | Taken **only** from the introduction/general group (chapter 1 / first batch); other groups discarded |
| `confidence.overall` | **max** across groups |
| `confidence.notes` | Concatenate, each note tagged `[group_id]` |
| Same identity, contradictory attributes | Keep first; emit `merge_conflict` (**warning**) with both variants in `merge_conflicts[]` |

Validators / repairs / Stage 1.6 run on the **merged** profile only.

## Mechanical fills (v3.7 audit)

| Rule | Trigger (grounding) | Structural? | `derived_from` |
|------|---------------------|-------------|----------------|
| Optional-surface → `requires_devices` | Extracted `control_surfaces[i]` with `optional_accessory: true` and no matching requires | Yes — surface enum / label copy only; no product-name matching | `control_surfaces[i]` |
| Fused supply → `supply_requirements` | Existing `evidence[N]` whose section/note matches generic supply-protection language (`must be fused`, fuse↔battery/cable/DC). **Not** raw excerpts alone | Yes — trigger is supply pattern, not device names | `evidence[N]` |
| Consult error codes (Stage 1.6) | `safety_role.has_emergency_procedure` + `evidence[N]` section/note matches `error\|fault\|alarm\|troubleshoot` | Yes — generic emergency vocabulary | `evidence[N]` |

**Removed (failed audit):** Victron/golden-specific “shutdown/restart the solar charger” fill keyed on excerpt string `shutdown and restart procedure` with non-resolving `derived_from: excerpt:…`.

Every derived object carries `source: "derived"` and a resolvable `derived_from`. Validator flag `derived_ungrounded` (**blocking**) when missing or unresolvable. Golden compare annotates each hit `extracted|derived` and **fails** if an assertion is satisfied only by an ungrounded derived item.

---

## Group utilization (v3.7)

Per group, count contributed fields + evidence (`group_utilization[]` on the
profile and in `_input.json`).

- Excerpts present + zero contributions → `group_unutilized` (**warning**),
  naming the group and the fields its routing queries predicted.

---

## Harness

- SmartSolar golden remains the no-regression check for small manuals.
- Mass Combi golden: `tests/fixtures/masscombi_golden.json`.
- Offline: `.\pipeline_verify.ps1 -Regression`.

---

## Revision history

| Ver | Notes |
|-----|-------|
| 3.6 | Scaled retrieval; absence validators; Mass Combi golden |
| 3.7 | Map-reduce Stage 1; merge semantics; group utilization |
