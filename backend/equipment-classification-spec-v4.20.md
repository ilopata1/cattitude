# Equipment classification specification — v4.20

Follow-on to
[`equipment-classification-spec-v4.19.md`](equipment-classification-spec-v4.19.md).

## Wisdom slot: no capability quantity restatement (xxxv)

A filled `wisdom_slot` points at a `composed_inference` that must add
**behavior, comparison, or guidance** the reader does not already get from
capability/identity prose.

### Rule

- The wisdom sentence must state something **no capability/identity sentence**
  in **this section** or a **pointed-to section** already states.
- Allowed: behavior, comparison, operational guidance (Solar boom-shade class).
- Forbidden: restating capability quantities (kW / kWh / W ranges or singles)
  already present in those capability sentences — **even when fully sourced**.
- Pointing the wisdom slot at the section’s own `capability_summary`
  composed_inference also fails (identity/capacity is not wisdom).

Lint: `lint_wisdom_quantity_restatement` in `guide_composition_rules.py`
(feeds `wisdom_slot_ok` / global **xxxv**). Peer capability lines may be
supplied via `pointed_section_capability_sentences` on the composed object
(Batteries → Solar leaf totals).

### Founding counterexample

Batteries monitoring previously restated Solar S1
(“about 1.6–1.8 kW across both arrays”) while pointing readers to Solar notes.
Under this tip: drop the quantity; keep at-anchor solar vs engines-running
alternator **comparison** (see v4.21 xli — not “under way” as a proxy).

## Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| xxxv wisdom slot filled/pending | Adds quality gate on filled content | Compatible — pending unchanged; filled must not restate |
| Solar **(vii)** boom-shade inference | Behavior/guidance, no total-kW restatement | Compatible — Solar remains founding pass |
| PRINCIPLES §7 composed_inference | Still requires attached evidence | Compatible — evidence ≠ license to restate |
| xxxvi same-breath identity+capacity | Capability packing rule | Orthogonal — wisdom is a different slot |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.20** | xxxv: wisdom ≠ capability quantity restatement (this or pointed-to) |
| 4.19 | Field-pack `occasion`; Silentwind inventory removal |
