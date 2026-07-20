# Equipment classification specification — v4.16

Follow-on to
[`equipment-classification-spec-v4.15.md`](equipment-classification-spec-v4.15.md).

## Global composition clarifications (all sections)

No vessel- or chapter-specific logic. Founding counterexamples may cite
Batteries & Energy drafts; the rules themselves are global.

### 1. Same-breath identity + deliverable (was guidance; now checked)

**Origin:** v4.9 — “Open with what the boat has and what it delivers” and
“When a technical detail appears, state its operational significance in the
**same breath**.” That was **composition guidance**, not a Stage 4 validator
criterion (no `checks[...]` key failed identity/capacity split).

**v4.15** co-location already required related facts of one functional group
in one paragraph — identity + capacity/rating for the same equipment group
is that case.

**Now (xxxvi):** When `capability_summary` emits both an identity sentence and
an immediately following capacity/rating sentence for the same group, treat
as a **same-breath violation** (style finding → hard fail in global assess).
Compose them as **one** paragraph/sentence instead.

### 2. Sentence-initial numerals (xxxvii)

When a sentence begins with a number, **spell it out** (“Two inverter-chargers…”,
not “2 inverter-chargers…”). Applies to all guest-facing guide prose.
Mid-sentence figures, ranges, and units (`1.6–1.8 kW`, `24 V / 110 A`) stay
numeric.

### 3. Functional-group paragraph (clarifies v4.15 §1)

Charge sources, protection chain members, or other peer members of one
functional group in `how_it_works` (or equivalent spine slot) form **one
integrated paragraph** (multiple sentences allowed inside it), not a stack of
disconnected one-liners. Plain owner English — no opaque jargon such as
“move AC/DC power for invert and charge.”

### 4. Surface-bound operator instructions (xxxviii)

An adjusting/settings instruction must name the **control surface(s)** from
the interaction profile (and any documented station page on the vessel path).

- If the action has no bound surface and no documented station page →
  **drop-and-report** (do not write around the gap).
- Do not invent optional remotes (e.g. MasterView) not on the vessel profile /
  inventory.
- DIP / commissioning surfaces stay out of guest prose.

## Collision notes

| Existing | This tip |
|----------|----------|
| v4.9 “same breath” (unvalidated) | Elevated to global check **xxxvi** |
| v4.15 co-location | Unchanged; identity+capacity and charge-group paragraphs are founding applications |
| Solar one-paren / first-use model | Unchanged — integrate carefully so one paren still holds |
| Outremer Combi stub vs last_green MasterView | Vessel stub wins for this boat; last_green is not auto-imported |

## Evaluation additions

| # | Criterion |
|---|-----------|
| **(xxxvi)** | Same-breath: no split identity→capacity pair in `capability_summary` |
| **(xxxvii)** | No sentence-initial Arabic numerals in guest prose |
| **(xxxviii)** | Adjusting instructions name profile surfaces / documented station pages, or are dropped |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.16** | Same-breath check; spell-out sentence-initial numbers; surface-bound adjusting; charge-group paragraph clarification |
| → | See [`equipment-classification-spec-v4.17.md`](equipment-classification-spec-v4.17.md) for occasion / paragraph-final pointers |
