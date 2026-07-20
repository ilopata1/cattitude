# Equipment classification specification — v4.22

Follow-on to
[`equipment-classification-spec-v4.21.md`](equipment-classification-spec-v4.21.md).

## Stage 1.5 integrity (Zeus SR founding)

Founding fixture: `fixtures/pipeline/scratch/bg_zeus_sr.json` (as extracted —
blocking `evidence_incomplete`, bad `manual_section` crumbs, menu-as-surface
collapse). Verify: `scripts/verify_stage15_zeus_v422.py`.

### (xlii) Blocking-flag gate

Any remaining **blocking** member of `BLOCKING_FLAGS` after repair attempts
sets `needs_rextraction` and fails `stage15_gate_passes`.

- `evidence_incomplete` still triggers the one-shot LLM evidence repair pass
  first; if gaps remain at blocking severity, the gate fails.
- Mechanical repairs that downgrade to warning (e.g. contradiction drop) do
  **not** force re-extraction.

Prior design reserved `needs_rextraction` only for `fewshot_leakage` /
unresolvable `dangling_needed_for`, leaving Zeus green despite blocking
evidence gaps.

### (xliii) Evidence heading floor + action-text linkage

- `manual_section` must be a short heading/title — not a sentence dump and not
  letter-fragment noise (`D E`). Flag: blocking `evidence_heading_invalid`.
- After action dedup/merge/expand, rewrite `supports_field: operator_actions[N]`
  → `operator_actions[action=<exact text>]` (`rewrite_operator_action_evidence_paths`).

### (xliv) Action dedup antonyms / synonyms

- Antonym pairs (`open`/`close`, `on`/`off`, …) must not fuzzy-collapse even at
  high token overlap (Zeus: open vs close quick access menu).
- Synonym tokens for the same object (`display`/`screen`) do collapse (Zeus:
  clean the display / clean the screen).

### (xlv) One physical screen = one surface

- Device `control_surfaces`: one row per physical screen.
- Named menus / panels / tabs / drawers → `ui_pages` (not extra touchscreens).
- Zero-action settings-section pages (`General`, `Simulation`, `Screen Layout`,
  …) are demotion candidates (`demoted_ui_pages`).
- Platforms keep legacy per-page surface expansion for Stage 2 gate wiring
  until gates read `ui_pages.appears_if_gate` directly (collision noted below).

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| Docstring: needs_rextraction only fewshot/dangling | (xlii) all blocking flags | Superseded |
| CZone `expand_ui_pages` → N touchscreens | (xlv) one screen | Platform expand kept for Stage 2 gates; devices consolidate |
| Prompt: devices `ui_pages []` | MFD menus as ui_pages | Prompt rule 12 updated |
| Merge fuzzy 0.7 collapses open/close | (xliv) antonym guard | Compatible with same-polarity fuzzy |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.22** | xlii–xlv: Stage 1.5 blocking gate, evidence integrity, dedup antonyms, surface/ui_page |
| 4.21 | xli: charge-path comparisons name enabling conditions |
| 4.20 | xxxv: wisdom ≠ capability quantity restatement |
| 4.19 | Field-pack `occasion`; Silentwind inventory removal |
