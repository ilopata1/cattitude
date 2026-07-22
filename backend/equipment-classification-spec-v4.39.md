# Equipment classification specification — v4.39

Follow-on to
[`equipment-classification-spec-v4.38.md`](equipment-classification-spec-v4.38.md).

## Water systems Stage 4 — frozen for reuse

Know chapter `water` Stage 4 composer and acceptance criteria are
**frozen** after human review (Outremer / Supernova; Dessalator Duo AC & DC
Navigator). Further change needs a versioned tip that supersedes this freeze —
do not silently rewrite the template in place.

Ship-with-honest-gaps remains in force: queued
`watermaker_intake_and_tank_path` must **not** block freeze. Wisdom slot may
remain `pending`. Optional Mini Remote Control and commissioning `flush system`
stay omitted from the guest body.

**Locked assets**

| Asset | Path |
|-------|------|
| Composer / evaluate | `guide_section_water.py` |
| Draft harness | `scripts/draft_water_section.py` |
| Regression gate | `scripts/verify_water_section_v4.py` |
| Expectations | `tests/fixtures/water_section_v4_expectations.json` |
| Scratch draft | `fixtures/pipeline/scratch/water_section_draft_v4.{md,json}` |

**Template:** capability → how_it_works → startup → monitoring → adjusting →
troubleshooting → reference. Full member: `dessalator_duo` (ISLAND). Batteries /
Electrical xrefs for DC supply support.

**Composer tip lineage:** founding v4.1; freeze tip: **v4.39**.

## Frozen Know chapters (this tip)

Six Stage 4 Know chapters are frozen for reuse:

| Section | Gate |
|---------|------|
| Solar v4 | `verify_solar_section_v4.py` |
| Batteries & Energy | `verify_batteries_section_v4.py` |
| Controls and Monitoring | `verify_controls_section_v4.py` |
| Electrical Panel | `verify_electrical_section_v4.py` |
| Navigation & Helm | `verify_nav_section_v4.py` |
| Water systems | `verify_water_section_v4.py` |

Harness: `python scripts/verify_{solar,batteries,controls,electrical,nav,water}_section_v4.py`
(also `make pipeline-verify` from `backend/` when wired).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.39** | Water systems Stage 4 frozen (founding v4.1) |
| 4.38 | Retire "day-to-day" globally (xliii) |
| 4.37 | Navigation & Helm frozen |
