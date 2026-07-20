# Equipment classification specification — v4.24

Follow-on to
[`equipment-classification-spec-v4.23.md`](equipment-classification-spec-v4.23.md).

## Other-variant procedure scope (xlvii)

Shared family manuals often document features that apply only to named
sibling models. Present in the routed excerpt ≠ applicable to the equipment
row under extraction.

### Rule

1. **Extract (prompt rule 8):** profile the requested model only — ignore
   accessories, requires, actions, ui_pages, and procedures the manual scopes
   exclusively to other variants. Word-boundary model match (`Zeus SR` ≠
   `Zeus SRX`).
2. **Procedure reconcile:** when an inventory item’s excerpt states
   `applies to … only` / `for … units only` / `available only on …` and the
   target model is not in that list (or is named under `not available on`),
   classify as `not_applicable:other_variant` with
   `rule:variant_scope:*` — **not** `procedure_unaccounted`, **not** repair.
3. Trail disposition remains `classified` (playbook D — never silent filter).

### Founding fixture

B&G Zeus SR + Video input touch control: excerpt
“This functionality applies to NSO 4 and Zeus SRX only.”
→ classified other-variant; no `procedure_unaccounted`.

Verify: `scripts/verify_interaction_profile_procedures.py` (Zeus variant block).

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| Rule 8 accessories/requires only | Broader field list | Compatible expansion |
| Installer auto-classify | Different axis | Orthogonal; variant runs first |
| Adjudicated repair classes | Sibling-only is not a miss | Do not enqueue repair |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.24** | xlvii: `not_applicable:other_variant` + rule 8 expansion |
| 4.23 | xlvi: diagram callout junk + heading carry-forward |
| 4.22 | xlii–xlv: Stage 1.5 gate / evidence / dedup / surfaces |
| 4.21 | xli: charge-path enabling conditions |
