# Engineering principles

Standing rules distilled from the equipment-classification specification
history, the pipeline fixtures, and the Outremer reconciliation work. These
rules apply across extraction, validation, vessel modeling, and guide
composition.

## 1. Detector before repairer

Build and validate the detector before enabling anything that can make its
output look better.

- Inventory the expected facts and record an accounting trail for every item:
  `matched`, explicitly `classified`, `filtered` with a named rule, or
  `unaccounted`.
- Tune and adjudicate the detector while repair is disabled or tightly gated.
- Enable repair only for reviewed defect classes with known-positive fixtures.
- Keep the original defect, repair action, and post-repair result auditable.
- A repair miss remains a visible warning. It must not silently become a
  deterministic assertion.

This is why procedure repair was built but gated in v4.2, then enabled only for
the adjudicated classes in v4.3.

## 2. Honest red beats synthetic green

A failing check that describes a real gap is healthier than a passing check
manufactured by filtering, guessing, broad fuzzy matching, or fixture drift.

- Zero is meaningful only when the accounting trail explains how every item
  reached zero.
- Do not hide genuine omissions behind structure filters, installer
  classification, combined-alternative labels, or permissive matching.
- Do not backfill unsupported requirements, optional equipment, platform
  versions, vessel topology, or operator behavior.
- Preserve unresolved dependencies and uncertainty as flags.
- A golden records an adjudicated truth, not the latest model output.

The system should stay red until the source, detector, extraction, or explicit
adjudication actually closes the gap.

## 3. Diagnose before patching

Name the failure layer before changing code.

Check, in order:

1. **Source identity** — correct document, edition, language, and genre?
2. **Ingest** — complete bytes, expected page count, declared edition?
3. **Routing** — did the relevant heading and text reach the extractor?
4. **Extraction** — did the map output contain the fact?
5. **Merge / normalization** — was a valid fact dropped or altered?
6. **Validation / derivation** — was it rejected, repaired, or synthesized?
7. **Graph / composition** — was it resolved or rendered incorrectly?

Fix the earliest layer that is wrong. Do not compensate downstream for an
upstream defect. The CZone Climate incident was first treated as truncation,
then correctly diagnosed as a wrong-edition ingest; a later missing-page issue
was separately traced to merge and routing.

## 4. Code owns computed facts

**The LLM never re-derives anything code has already computed.**

- Heuristics and indexes route source material.
- The LLM extracts grounded, structured facts from routed text.
- Deterministic code validates, normalizes, derives mechanical consequences,
  resolves dependencies, assigns graph roles and homes, deduplicates, and
  applies section policies.
- Any later LLM receives computed facts as inputs; it does not recompute them
  from prose.
- Composition may make a conservative `composed_inference`, but it must list
  all contributing facts and may use only attached evidence or document
  citations.

This boundary keeps model variability from overwriting deterministic vessel
state.

## 5. Fixtures change only deliberately

Fixtures are contracts, not convenient output snapshots.

- `backend/tests/fixtures/` contains defect regressions and goldens.
- `backend/fixtures/pipeline/outremer/` is a hand-authored vessel contract and
  is governed like a golden.
- `backend/fixtures/pipeline/scratch/` is disposable live output.
- `backend/fixtures/pipeline/last_green/` is an archived diagnostic baseline,
  not authority to rewrite a golden.
- Never reshape a fixture merely to match a new live extraction.
- A fixture change requires explicit human authorization recorded as
  `Fixture-Auth: <ticket-or-chat-ref> — <reason>`.
- Add or retain negative fixtures: a detector must prove it fires on the defect
  as well as passes the corrected case.

See `backend/tests/fixtures/POLICY.md`.

## 6. Every source lies differently

No source class is universally authoritative. Record what each source can
attest, where it can mislead, and how conflicts were resolved.

| Source | Useful for | Typical failure |
|--------|------------|-----------------|
| Manufacturer manual | Model capabilities, procedures, conditional features | Describes options not installed; may be wrong edition or setup-only |
| Filename / admin metadata | Discovery and cataloging | Can disagree with the document's self-declared edition |
| Schematic / commissioning drawing | Intended topology and identifiers | Can be stale, generic, or internally inconsistent |
| Device configuration | Vessel-specific screens, circuits, and modes | May be absent, exported from another revision, or incomplete |
| Owner inventory / survey | Current target state, quantities, labels | May mix attestation, inference, and shorthand |
| Physical inspection / photo | Installed identity, placement, visible geometry | Shows one moment; does not by itself prove behavior or network membership |
| Live LLM extraction | Scalable structured reading | Can omit, flap, merge alternatives, or infer from taxonomy leakage |

Therefore:

- Preserve source class, evidence reference, confidence, and conflict history.
- Split attested, inferred, and unconfirmed claims.
- Prefer specific direct evidence for the claim at hand; do not invent one
  global source-precedence ladder.
- Reconcile conflicts explicitly and retain the losing claim in the audit
  record when it matters.

## 7. Observation is not inference

Human-entered vessel facts must separate what was observed from what was
concluded.

- `observation`: what a document, screen, photo, or inspection directly shows.
- `entered_inference`: a human conclusion, with `depends_on` links to its
  observations.
- `composed_inference`: a section-level conclusion synthesized from multiple
  sourced facts.

Inspection and walkthrough observations must reference resolvable artifacts.
Missing references raise `evidence_unattached`. Such facts may be rendered as
reduced-confidence observations or caveats, but they cannot contribute to a
new composed inference.

## 8. Preserve provenance through every transformation

Extraction, voting, repair, derivation, graph resolution, and composition must
not erase where a fact came from.

- Keep source tags such as `extracted`, `derived`, and `repaired`.
- Keep vote variants and material-versus-cosmetic instability.
- Keep repair trails and deterministic-fill labels.
- Keep resolver evidence and rejected alternatives.
- Map each reader-facing sentence to its source facts.
- When several facts support one sentence, retain the extra facts as
  provenance metadata rather than rendering duplicate prose.

## 9. Uncertainty is data

Flags are part of the model, not embarrassing residue.

- Blocking defects stop promotion.
- Warnings keep the pipeline honest and direct review.
- Composition classifies flags as `operator_caveat`, `scope_limit`, or
  `internal`.
- Internal flags inform composition but never leak as reader-facing machinery.
- Absence and gated-off facts are `context_shaping`: they shape wording and
  appear in provenance, but are not rendered as “does not have / not fitted”
  sentences (unless tagged `planted_expectation`).
- Operator caveats and conditional scope limits become integrated prose once
  per underlying fact.

## 10. Promotion follows review, not mere execution

A successful command is not sufficient evidence of correctness.

- Review coverage, instability, unaccounted trails, provenance, and negative
  cases.
- Compare live scratch to adjudicated fixtures.
- Require human review before publishing guest-facing content.
- Freeze a profile or section only after its acceptance criteria and review
  pass are explicit.

## Reference documents

- `backend/guide-pipeline-plan.md`
- `backend/equipment-classification-spec-v3.1.md` through `v4.8.md`
- `backend/tests/fixtures/POLICY.md`
- `backend/tests/fixtures/README.md`
- `backend/fixtures/pipeline/README.md`
- `backend/fixtures/pipeline/outremer/reconciliation_records.json`
- `backend/fixtures/pipeline/outremer/RECONCILIATION_REPORT.md`
