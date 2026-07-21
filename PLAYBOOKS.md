# Pipeline playbooks

Repeatable checklists for recurring Clever Sailor pipeline work. Apply the
standing rules in `PRINCIPLES.md` throughout.

## 1. New device extraction

**Goal:** promote a reviewed interaction profile for one equipment model
without hiding source, routing, extraction, or stability gaps.

### A. Confirm source and genre

- [ ] Identify manufacturer, exact model/family, document title, language, and
      manual type.
- [ ] Confirm the PDF's self-declared edition/date against filename and admin
      metadata; stop on `edition_mismatch`.
- [ ] Confirm expected page count and that the file is complete.
- [ ] Classify document genres: installation, commissioning, operation,
      monitoring, maintenance, reference, or combined.
- [ ] Run the genre/content checks.
- [ ] If the manual is setup-only for a configuration-defined UI, keep
      `config_defined_operation` / `hub_operation_unsourced`; obtain a device
      configuration or owner walkthrough instead of inventing operation.

**Gate:** source identity and genre are understood. A wrong source is replaced,
not compensated for in prompts.

### B. Route and extract

- [ ] Run Stage 0 heading/index routing and inspect heading coverage.
- [ ] Add vocabulary or heading fallbacks only when diagnostics show a routing
      miss.
- [ ] Run the structured Stage 1 extraction into
      `backend/fixtures/pipeline/scratch/`.
- [ ] Preserve citations, excerpt references, map-group outputs, and retrieval
      diagnostics.
- [ ] For unstable devices, run the configured independent votes; union only
      grounded presence and majority-vote material attributes.

**Gate:** all expected source regions reached map extraction. Do not treat a
routing miss as an extraction-model defect.

### C. Review before repair

- [ ] Run schema and Stage 1.5 validators.
- [ ] Review `coverage_low`, heading coverage, and group utilization.
- [ ] Review material and cosmetic instability separately, including vote
      variants and margins.
- [ ] Build/run the procedure inventory and inspect every accounting-trail row.
- [ ] Review all `unaccounted` items; verify that apparent zeroes were not
      produced by filtering or over-broad matching.
- [ ] Review absence-class warnings, evidence gaps, dangling `needed_for`,
      alternatives, and audience/context classifications.
- [ ] Diagnose each defect as source, ingest, routing, extraction, merge,
      validation, derivation, or resolver behavior.

**Gate:** defect classes are understood and adjudicated. Repair remains gated.

### D. Adjudicate and repair narrowly

- [ ] Classify each inventory item as genuine operator content,
      installer/reference-only, structural noise, alternative, true
      extraction omission, or **other-variant out of scope**
      (`not_applicable:other_variant` — shared manual content scoped only to
      sibling models).
- [ ] Record the rule and rationale in the accounting trail.
- [ ] Enable targeted repair only for reviewed defect ids/classes.
- [ ] Group retries by source excerpt; name the missing fact and excerpt in the
      correction instruction.
- [ ] Use at most one targeted retry for re-extraction defects.
- [ ] Allow deterministic fill only where the specification permits it and
      source text grounds it.
- [ ] Preserve any remaining warning when repair misses.
- [ ] Re-run merge, validation, derivation, procedure reconciliation, and
      stability checks.

**Gate:** post-repair zeroes are trail-verified as matched or explicitly
classified, never merely filtered.

### E. Promote to golden

- [ ] Compare scratch against the existing golden or `last_green` baseline.
- [ ] Explain every intentional difference.
- [ ] Add both positive assertions and relevant negative assertions.
- [ ] Add or update defect fixtures only with explicit `Fixture-Auth`.
- [ ] Archive map inputs/outputs and profile under `last_green` when useful for
      future flap diagnosis.
- [ ] Run:

```powershell
cd backend
make pipeline-verify
make pipeline-compare-scratch
make pipeline-regression
```

- [ ] Obtain human review before treating the profile as promoted.

**Outputs**

- Reviewed profile/golden
- Citations and retrieval diagnostics
- Procedure inventory and accounting trail
- Instability report/vote audit
- `Fixture-Auth` record for fixture changes
- Optional `last_green/<device>/` diagnostic archive

---

## 2. New guide section

**Goal:** compose and freeze a reader-facing section from reviewed profile,
graph, and vessel facts without leaking pipeline machinery.

### A. Assemble inputs

- [ ] Build the deterministic vessel graph, roles, dependencies, homes,
      cross-references, and content tiers.
- [ ] Run `assemble_section_inputs` for the section id; persist `inputs.json`
      beside the draft.
- [ ] Confirm depths: members + platforms = `full`; visibility-gated boundary
      targets = `summary`; path bridges/COIs = `provenance` (unnamed in body).
- [ ] Remember: graph reachability = candidacy; documented present page or
      member surface = membership (`PRINCIPLES.md` §9).
- [ ] Collect vessel facts: topology, installation notes, charging/supply
      targets, configuration, and relevant consequences.
- [ ] Separate human-entered `observation` from `entered_inference`.
- [ ] Resolve every inspection/walkthrough `evidence_ref` against the artifact
      store.
- [ ] Review `evidence_unattached`; reduced-confidence facts may render but may
      not support a new `composed_inference`.
- [ ] Define reader-facing display names for every device/instance.
- [ ] Classify flags as `operator_caveat`, `scope_limit`, `context_shaping`,
      or `internal`.
- [ ] For `config_unsourced`, plan a boat-upgradeable placeholder — never block
      the section (ship-with-honest-gaps).
- [ ] Confirm `vessel_display_name` is recorded (composition hard-fails without
      it).

**Gate:** all input facts have provenance; inference inputs have attached
evidence or document citations; boat name is recorded; input set reviewable.

### B. Compose in the v4 template

- [ ] Generate device-level facts/fragments with source tags preserved.
- [ ] Compose in this order:
  1. capability summary
  2. monitoring
  3. adjusting
  4. troubleshooting
- [ ] Role/function first; manufacturer + model in parentheses on first use only.
- [ ] Absences/gated-off facts are `context_shaping` — provenance only (unless
      tagged `planted_expectation`).
- [ ] Merge shared facts; emit per-unit prose only where units differ.
- [ ] Group actions by routine, situational, and fault context, with about two
      sentences maximum per group.
- [ ] Do not enumerate actions or use filler qualifiers such as “when needed.”
- [ ] Deduplicate provenance facts; attach orphan restatements as provenance
      metadata.
- [ ] Tag each synthesized operational conclusion as `composed_inference` and
      list all contributing facts.
- [ ] Map every rendered sentence to its sources.

### C. Evaluate criteria (v4)

- [ ] **i — Shared-fact dedup:** monitoring path stated once.
- [ ] **ii — Section-level synthesis:** at least one multi-input claim.
- [ ] **iii — Zero unsourced claims.**
- [ ] **iv′ — No absence prose:** context_shaping facts are not “not fitted”
      sentences.
- [ ] **v — Zero internal vocabulary.**
- [ ] **vi′ — Absences in provenance** of the sentences they shaped.
- [ ] **vii — Conservative composed_inference.**
- [ ] **viii — No per-action enumeration.**
- [ ] **ix′ — Task order:** capability → monitoring → adjusting →
      troubleshooting.
- [ ] **x — Evidence-clean inference.**
- [ ] **xi — Vessel established** by recorded display name in prose (hard).
      Deictics / name overuse are **style warnings** only — after the name,
      prefer “the …” / bare facts; use she/her only when the boat is the
      actor/owner (`guide_reader_voice.py`; PRINCIPLES §10).
- [ ] **xii — Role-first**, model on first use only.
- [ ] **xiii — No catalog vocabulary.**
- [ ] **xiv — No hedging** of verified facts; conditions for real uncertainty.
- [ ] **xv — No untagged absence sentences.**
- [ ] **xvi — Task ordering** matches template.
- [ ] **xvii–xix — Prose economy:** confidence via phrasing; ≤1 parenthetical;
      no clause restatement.
- [ ] **xx — Input set** matches fixture.
- [ ] **xxi — Summary depth** stays summary (no home-manual restatement).
- [ ] **xxii — Config placeholder** present and boat-upgradeable when
      config is unsourced.

  Obsoleted from v3: **(iv)** flags-as-caveats with GX prose, **(vi)** rendered
  flag-fact once, **(ix)** identity→daily→guidance→caveats→reference.

### D. Review and freeze

- [ ] Review the draft sentence by sentence beside the provenance map.
- [ ] Challenge comparative wording, causal claims, “normal” ranges, and
      installation assumptions.
- [ ] Verify that every inference is conservative relative to its evidence.
- [ ] Re-run vocabulary, absence, ordering, action-group, and evidence checks.
- [ ] Record the review verdict and final criteria result.
- [ ] Freeze the section template/rules only after the human review pass.
- [ ] Carry generalized rules forward; do not copy vessel-specific wording into
      the next section.

**Outputs**

- `<section>_draft_vN.md`
- `<section>_draft_vN.json`
- Sentence-to-source provenance map
- Criteria evaluation (v4)
- Evidence/flag report
- Freeze note and generalized template changes

---

## 3. Inventory change

**Goal:** apply an owner, survey, configuration, or document correction while
preserving history and removing stale graph state.

### A. Record the event

- [ ] Capture who/what reported the change and when.
- [ ] Classify the event: add, remove, replace, relabel, quantity change,
      corrected assumption, or source conflict.
- [ ] Record evidence and source class.
- [ ] Split claims into attested, inferred, and unconfirmed.
- [ ] Create an immutable reconciliation record before rewriting current state.

### B. Sweep references

- [ ] Search equipment keys, profile keys, instance keys, expected roles,
      sections, flags, relations, dependencies, cross-references, tests,
      scripts, guide content, and admin metadata.
- [ ] Identify aliases and family mappings that could retain the old identity.
- [ ] Check quantities and instance-handling behavior.
- [ ] Decide which old artifacts remain as audit/scratch baselines and which
      must leave the live vessel graph.
- [ ] Capture a before report for roles, paths, flags, and unresolved
      dependencies.

### C. Reconcile current state

- [ ] Update the current equipment inventory.
- [ ] Add/update/remove profiles and instances deliberately.
- [ ] Update graph expectations, sections, relations, and required flags.
- [ ] Keep historical reconciliation records audit-only; do not mutate history
      into the latest inventory shape.
- [ ] Preserve contradictory or overruled evidence with its disposition and
      rationale.
- [ ] Add `Fixture-Auth` for vessel fixture changes.
- [ ] Run dangling-reference sweeps and assert retired keys are absent from live
      state.
- [ ] Rebuild the vessel graph and compare roles, paths, flags, and
      cross-references before/after.
- [ ] Run offline fixture and vessel regression gates.

**Outputs**

- Reconciliation event/record
- Updated current inventory and profiles
- Before/after graph report
- Retired-node/dangling-reference result
- Updated expected fixture with authorization

---

## 4. New defect found

**Goal:** turn a discovered failure into a reproducible general rule before
patching production behavior.

### A. Diagnose

- [ ] Preserve the failing input and raw output.
- [ ] Reproduce the defect with the smallest realistic command.
- [ ] Locate the earliest incorrect layer:
  source → ingest → routing → extraction → merge → validation/repair →
  derivation → graph → composition.
- [ ] Determine whether the defect is deterministic, intermittent, or
      source-specific.
- [ ] Inspect diagnostics, accounting trails, vote variants, provenance, and
      adjacent negative cases.
- [ ] State the root cause and expected behavior before editing code.

### B. Fixture both directions

- [ ] Add a **defect fixture** that proves the detector fires on the bad case.
- [ ] Add or identify a **corrected fixture** that proves valid input passes.
- [ ] Add a near-miss negative fixture when a broad fix could over-match.
- [ ] Name fixtures after the general rule under test, not a product
      special-case.
- [ ] Record explicit `Fixture-Auth` for fixture changes.
- [ ] Run the new fixtures before the fix and confirm the intended failure.

### C. Fix the earliest wrong layer

- [ ] Prefer detector/routing/schema/merge corrections over downstream prose
      patches.
- [ ] Keep repair disabled until the detector and adjudication are trustworthy.
- [ ] Scope repair or deterministic fill to explicit, grounded classes.
- [ ] Preserve warnings and audit trails when the fix cannot prove the fact.
- [ ] Avoid identical temp-0 retry loops; targeted retries must name the defect.

### D. Verify and document

- [ ] Run the defect, corrected, and near-miss fixtures.
- [ ] Run affected subsystem verification.
- [ ] Run the full offline regression suite.
- [ ] If live extraction is involved, compare scratch to the adjudicated golden.
- [ ] Document the rule and add a specification revision-history entry.
- [ ] Confirm no fixture was silently reshaped to make the suite green.

**Outputs**

- Root-cause note
- Bad and good fixtures (plus near-miss where useful)
- Narrow fix at the correct layer
- Verification results
- Specification/revision-history update

## 5. Builder `channel_map` ingest (adjudicated)

**Goal:** take an unbounded-format builder sheet (owner's-manual channel table)
into tier-4 config facts without writing a per-builder parser.

Founding fixture: Outremer 55N60 p46 **C-ZONE CHANELS**, Ind C 05/05/2026.

- [ ] Store PDF in the vessel artifact store (`kind` / `source_class`:
      `channel_map`); cite source doc, page, revision/date.
- [ ] Extract with LLM against `channel_map_schema`
      (`channel_entries[]` + `device_locations[]`) — never a format parser.
- [ ] Emit `channel_map_parsed.md` for human review; mark ambiguous cells;
      do **not** commit facts until adjudication (column-shift is the highest
      reader-visible error class).
- [ ] On approval: commit facts with citations; split `config_unsourced`
      (circuits sourced; modes/favourites/alarms still unsourced); locate COI
      instances; wire Controls config-layer; re-run vessel and surface
      contradictions without auto-resolve.
- [ ] OPT/CUS channels are fitted only when inventory-corroborated; else
      `context_shaping`.

Machine artifacts (`.zcf`) stay on the `device_configuration` parser path.

---

## Quick decision rules

- **A check is red:** investigate; do not rewrite its expected output first.
- **A fact is missing:** inspect source and routing before prompting harder.
- **A result flaps:** retain grounded presence, vote material attributes, and
  archive variants.
- **A repair looks easy:** prove the detector and adjudicate the class first.
- **A source conflicts:** preserve both claims and record why one wins.
- **A human-entered note mixes seeing and concluding:** split observation from
  inference.
- **A fixture differs from live output:** fixture wins until an authorized
  review changes it.
- **Code already knows the answer:** pass that computed fact forward; never ask
  the LLM to re-derive it.

## Shared gates and path index

From `backend/`:

| Gate | Command |
|------|---------|
| Offline fixtures | `make pipeline-verify` |
| Live scratch vs golden | `make pipeline-compare-scratch` |
| Both | `make pipeline-regression` |

| Role | Path |
|------|------|
| Spec tip | `backend/equipment-classification-spec-v4.38.md` (retire "day-to-day" globally, xliii; Nav frozen nav-i–nav-xiii + `startup` spine slot per v4.37; frozen set = Solar + Batteries + Controls + Electrical + Nav) |
| Pipeline plan | `backend/guide-pipeline-plan.md` |
| Fixture policy | `backend/tests/fixtures/POLICY.md` |
| Extract → scratch | `backend/scripts/extract_interaction_profile.py` |
| Procedure inventory / repair | `backend/scripts/run_procedure_inventory.py`, `repair_adjudicated_procedures.py` |
| Instability triage | `backend/scripts/report_instability_triage.py` |
| Evidence attachment | `backend/vessel_evidence.py`, `scripts/verify_evidence_unattached.py` |
| Solar compose / criteria | `backend/guide_section_solar.py`, `scripts/draft_solar_section.py` |
| Controls compose / criteria | `backend/guide_section_controls.py`, `scripts/draft_controls_section.py` |
| Batteries compose / criteria | `backend/guide_section_batteries.py`, `scripts/draft_batteries_section.py` |
| Electrical compose / criteria | `backend/guide_section_electrical.py`, `scripts/draft_electrical_section.py` |
| Nav compose / criteria | `backend/guide_section_nav.py`, `scripts/draft_nav_section.py` |
| Vessel reconcile | `backend/scripts/generate_outremer_reconciliation_report.py`, `fixtures/pipeline/outremer/` |
| Defect ↔ golden pair | `tests/fixtures/stage15_defective_extraction.json` ↔ `smartsolar_corrected_extraction.json` |
| Owners | `.github/CODEOWNERS` |
