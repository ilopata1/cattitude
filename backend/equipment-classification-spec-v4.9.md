# Equipment classification specification — v4.9

Follow-on to
[`equipment-classification-spec-v4.8.md`](equipment-classification-spec-v4.8.md).

## Stage 4 section template (Solar v4 — supersedes v3/v4.8 freeze)

**Order:** capability summary → monitoring → adjusting → troubleshooting.

- Open with what the boat has and what it delivers, at source precision
  (survey estimates stay estimates — never promote approximations to
  nameplate claims).
- Then one user goal per paragraph; routine before exceptional functions.
- When a technical detail appears, state its operational significance in
  the same breath.

### Reader voice

- Address the boat by recorded `vessel_display_name` (and “she” where natural);
  never “this vessel”. Composition **hard-fails** if the name is missing —
  do not invent one.
- Name equipment by function/role first; manufacturer + model in parentheses
  on **first use only**.
- **One parenthetical per sentence maximum** — split overloaded sentences so
  model-intro parens never share a sentence with wattage or source parens.
- Confidence is expressed through phrasing (`about`, ranges, `up to`), never
  through source citations in reader text (no “owner-survey estimate”,
  “per the manual”, folio/photo parentheticals). Sources stay in the
  provenance map.
- Do not restate a sentence’s point in the next clause (ban “— that is
  where/how…” restatement markers). Operational significance may still appear
  as a causal clause (“because …”), not a paraphrase of the same claim.
- Owner language: app / screen / user interface — not catalog terms
  (`control_surfaces`, device keys, role enums, pipeline vocabulary).
- State verified facts plainly. Reserve uncertainty for genuinely unresolved
  items and phrase as conditions (“If firmware supports …”), not hedges
  (“does not appear to”, “is described in the manuals”).

### Flag `reader_relevance` (extends v4.8)

| Relevance | Behavior |
|-----------|----------|
| `operator_caveat` | Integrated prose when it guides an action (not an absence claim). |
| `scope_limit` | Integrated condition when the limit is version-/config-conditional. |
| `context_shaping` | **Consumed by composition, never rendered.** Shapes wording and must appear in provenance of sentences it shaped. |
| `internal` | Pipeline-only; never rendered. |

**Absence / gated-off facts** (no GX, optional accessory not fitted, no CZone
solar page) are `context_shaping`. No “does not have” / “not fitted” /
“not confirmed” sentences.

**Planted-expectation exception:** in troubleshooting/reference only, when
materials the owner will plausibly see (their manuals, CZone screens) create
an expectation they would act on, an absence may be stated and tagged
`planted_expectation`. Solar v4 fixture: GX and optional MPPT display stay
**unrendered** (monitoring provenance carries those absence facts instead).

### Guest-content filter

Exclude commissioning and wiring. Keep physical placement when it matters for
operation (which array, which controller).

## Evaluation criteria (Solar)

Retained: (i) shared monitoring once · (ii) section-level synthesis ·
(iii) zero unsourced · (v) zero internal vocabulary · (vii) composed_inference ·
(viii) no per-action enumeration · (x) evidence-clean inference.

**Superseded / replaced:**

| Was | Now |
|-----|-----|
| (iv) flags as caveats (incl. GX prose) | (iv′) no absence prose; context_shaping in provenance |
| (vi) each rendered flag-fact once | (vi′) each context_shaping absence appears in provenance of the sentence it shaped, not as its own sentence |
| (ix) identity→daily→guidance→caveats→reference | (ix′) capability→monitoring→adjusting→troubleshooting |

**Added:** (xi) vessel named / no “this vessel” · (xii) role-first, model once ·
(xiii) no catalog vocabulary · (xiv) no hedging of verified facts ·
(xv) no untagged absence sentences · (xvi) task ordering ·
(xvii) confidence via phrasing (no source cites in prose) ·
(xviii) ≤1 parenthetical per sentence · (xix) no clause restatement.

## Collision notes (v3 → v4)

- v4.8 “frozen” template and `operator_caveat|scope_limit|internal` triad are
  **superseded** for Stage 4 rendering by this revision (explicit review
  feedback), not silently rewritten in place without a version bump.
- PRINCIPLES “uncertainty is data / flags as caveats” still holds for
  *action-guiding* caveats; **absence** flags move to `context_shaping`.
- Fixture wattage text that said “nameplate” while carrying `~` ranges
  conflicts with estimate-precision policy — corrected to survey estimate.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.9** | Solar v4 template; context_shaping; reader voice; planted_expectation; criteria iv′/vi′/ix′ + xi–xix (prose economy) |
| 4.8 | observation/inference; evidence_unattached; Solar v3 freeze |
| 4.7 | ui_pages; Climate gate; edition ingest |
