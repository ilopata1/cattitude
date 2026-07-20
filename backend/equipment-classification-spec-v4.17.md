# Equipment classification specification — v4.17

Follow-on to
[`equipment-classification-spec-v4.16.md`](equipment-classification-spec-v4.16.md).

## Global composition clarifications (all sections)

### 1. Instruction occasion (xxxix)

Every **rendered instruction** (imperative owner action) must carry its
**occasion** (when/why) in the same sentence, and that occasion must be
**sourced**.

Sourced occasion includes any of:

- `operator_actions.when` / `trigger` / `occasion` / `why` when present
- `context` in `{daily, emergency, maintenance}`
- occasion words embedded in the action string itself (`after`, `when`, …)

`context=situational` alone is **not** an occasion.

If no sourced occasion exists: **demote** to `reference` as a capability /
surface inventory statement — do **not** render a floating imperative, and do
**not** invent a when/why. Queue a fact query for the missing occasion.

Purpose-fronted framing (“To change X, use Y”) is **not** an occasion.

### 2. Paragraph-final pointers (xl)

When a cross-section or leaf-chapter pointer shares a multi-sentence paragraph
with other content, that pointer must be the **final sentence** of the
paragraph (not mid-group).

Founding counterexample: Solar leaf pointer embedded in the first charge-source
sentence while Combis / Alphas / wind continued afterward.

### 3. Co-location clarifications (applies v4.15 §1; no new criterion number)

- Operational **ratings** for a charge-source group co-locate with that group’s
  `how_it_works` identity (e.g. alternator 24 V / 110 A with the Alpha mention),
  not only in a later monitoring survey sentence.
- Daily checks and the meter / station path for the same bank share one
  `monitoring` paragraph.
- Fault orientation and the matching recovery action for the same protective
  event share one `troubleshooting` paragraph.

## Collision notes (do not silently resolve)

| Existing policy | This tip | Resolution |
|-----------------|----------|------------|
| **xxxviii** surface-bound adjusting | Occasion gates *whether* an imperative may render | Compatible: surfaces still required when an instruction renders; without occasion → reference inventory (still names surfaces). |
| **xxxiii** orphan-fact (contribution + interaction) | Interaction without occasion cannot stay imperative | Compatible: contribution stays in `how_it_works`; interaction demotes to `reference` (device then has ≥2 rows or complete treatment without bare imperative). |
| Solar **(ix′)** / Solar `SECTION_ORDER` lacked `reference` | Demotion needs a reference slot | **Mapped:** Solar `SECTION_ORDER` gains optional trailing `reference` (global spine subsequence). Do not revive caveats/identity. |
| Solar configure action (`situational`) | Occasion rule demotes former adjusting imperative | Apply same rule — declarative reference sentence; queue occasion if owner wants an instruction later. |
| Controls Monitoring / circuit / alarm opens | Bare imperatives | Same rule — add sourced day-to-day / when cues (Controls is the daily station). |
| v4.13 xref **voice** (reader navigation phrasing) | xl is **placement**, not voice | Compatible — voice unchanged. |
| v4.15 xref **slot consolidation** | xl is **within-paragraph** placement | Compatible — different axis. |

## Evaluation additions

| # | Criterion |
|---|-----------|
| **(xxxix)** | No floating imperatives without same-sentence occasion cues (reference exempt) |
| **(xl)** | Leaf/section pointers are paragraph-final when sharing a multi-sentence paragraph |

Shared assessor: `assess_global_composition()` in `guide_composition_rules.py`
(also `action_has_sourced_occasion()`).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.17** | Instruction occasion; paragraph-final pointers; co-location clarifications for ratings / daily+meters / BMS join |
| → | See [`equipment-classification-spec-v4.18.md`](equipment-classification-spec-v4.18.md) for provenance-leak vocabulary |
