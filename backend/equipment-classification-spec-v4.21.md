# Equipment classification specification — v4.21

Follow-on to
[`equipment-classification-spec-v4.20.md`](equipment-classification-spec-v4.20.md).

## Charge-path occasions by enabling condition (xli)

When guest prose compares or sequences charge sources by situation, name
each source’s **enabling condition**. Do not use vessel navigation state
as a proxy for propulsion charging.

### Rule

- Alternator / engine-driven charge → “when the engines are running” /
  “while motoring” — never “under way” or “under sail” alone.
- Solar → sun / shade / array conditions that actually govern yield.
- Shore / generator AC → when that AC input is present.
- On sailing (and sail-capable) vessels, under way includes under sail
  with engines off — no alternator charge.

Lint: `lint_charge_path_enabling_conditions` in `guide_composition_rules.py`
(feeds `charge_path_enabling_ok` / global **xli**).

### Founding counterexample

Batteries wisdom previously said “under way, those alternators add
engine-driven charging.” How-it-works already said “when the engines are
running.” Under this tip: keep the at-anchor solar half; key the
alternator half to engines running.

Solar “Under sail…” boom-shade monitoring remains allowed — that is sail
configuration affecting yield, not a claim that sail produces engine charge.

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| how_it_works “when the engines are running” | Same causal cue for wisdom | Compatible — wisdom must match |
| xxxv wisdom ≠ capability quantity | Different axis (causal framing) | Orthogonal |
| Solar **(vii)** boom-shade “Under sail” | No alternator-charge claim | Compatible |
| v4.20 founding note “vs under-way alternators” | Superseded phrasing | Use engines-running comparison |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.21** | xli: charge-path comparisons name enabling conditions, not nav state |
| 4.20 | xxxv: wisdom ≠ capability quantity restatement (this or pointed-to) |
| 4.19 | Field-pack `occasion`; Silentwind inventory removal |
