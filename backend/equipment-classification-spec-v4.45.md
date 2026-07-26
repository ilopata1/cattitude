# Equipment classification specification — v4.45

Follow-on to
[`equipment-classification-spec-v4.44.md`](equipment-classification-spec-v4.44.md).

## Heads & waste Stage 4 — frozen for reuse

Know chapter `heads` Stage 4 composer and acceptance criteria are
**frozen** after human review (Outremer / Supernova). Further change needs a
versioned tip that supersedes this freeze — do not silently rewrite the
template in place.

**Plant (Supernova today):** full member
`blackwater_tank_discharge_valve` (qty 3, places → Equipment Locations table).
Electric heads model remains unknown — Tecma is catalog-only, not on plant.

Ship-with-honest-gaps remains in force: queued `heads_model_unknown` must
**not** block freeze. Wisdom slot may remain `pending`. Standing discharge
rules (pump-out ≠ open valves; nearshore closed; empty per local rules /
≥12 nm tip) are locked. Global xlv: never inline valve places in capability.

**Locked assets**

| Asset | Path |
|-------|------|
| Composer / evaluate | `guide_section_heads.py` (v4.1) |
| Draft harness | `scripts/draft_heads_section.py` |
| Regression gate | `scripts/verify_heads_section_v4.py` |
| Expectations | `tests/fixtures/heads_section_v4_expectations.json` |
| Scratch draft | `fixtures/pipeline/scratch/heads_section_draft_v4.{md,json}` |

**Composer tip lineage:** founding v4.0 → freeze tip **v4.45**.

## Frozen Know chapters (this tip)

Eight Stage 4 Know chapters are frozen for reuse (Solar folds into Batteries):

| Section | Gate |
|---------|------|
| Solar v4 | `verify_solar_section_v4.py` |
| Batteries & Energy | `verify_batteries_section_v4.py` |
| Controls and Monitoring | `verify_controls_section_v4.py` |
| Electrical Panel | `verify_electrical_section_v4.py` |
| Navigation & Helm | `verify_nav_section_v4.py` |
| Water systems | `verify_water_section_v4.py` |
| Engines | `verify_engines_section_v4.py` |
| Heads & waste | `verify_heads_section_v4.py` |

Harness: `python scripts/verify_{solar,batteries,controls,electrical,nav,water,engines,heads}_section_v4.py`
(also `make pipeline-verify` from `backend/`). Published via
`PUBLISHED_SECTIONS` including `heads`.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.45** | Heads & waste Stage 4 frozen (valves + honest `heads_model_unknown`) |
| 4.44 | Stage 1 `control_surfaces[].hosting` + `display_host_unresolved` |
| 4.43 | Nav re-compose — Watchkeeper; UI on Zeus (owner review) |
| 4.42 | Global xlv — inventory places in Equipment Locations table |
| 4.41 | Engines Stage 4 frozen |
| 4.40 | Affirmative station only (xliv) |
| 4.39 | Water systems Stage 4 frozen |
| 4.38 | Retire "day-to-day" globally (xliii) |
| 4.37 | Navigation & Helm Stage 4 frozen (nav-i–nav-xiii) |
