# Equipment classification specification — v4.41

Follow-on to
[`equipment-classification-spec-v4.40.md`](equipment-classification-spec-v4.40.md).

## Engines Stage 4 — frozen for reuse

Know chapter `engines` Stage 4 composer and acceptance criteria are
**frozen** after human review (Outremer / Supernova; Nanni N4.65 twin plant).
Further change needs a versioned tip that supersedes this freeze — do not
silently rewrite the template in place.

Ship-with-honest-gaps remains in force: queued
`engines_panel_variant` and `engines_seacock_and_bay_places` must **not**
block freeze. Wisdom slot may remain `pending`. Maintenance / commissioning /
storage actions stay omitted from the guest body (context_shaping). Affirmative
station only (xliv): no non-safety “where not” contrasts.

**Locked assets**

| Asset | Path |
|-------|------|
| Composer / evaluate | `guide_section_engines.py` |
| Draft harness | `scripts/draft_engines_section.py` |
| Regression gate | `scripts/verify_engines_section_v4.py` |
| Expectations | `tests/fixtures/engines_section_v4_expectations.json` |
| Scratch draft | `fixtures/pipeline/scratch/engines_section_draft_v4.{md,json}` |

**Template:** capability → how_it_works → startup → monitoring → adjusting →
troubleshooting → reference. Full member: `nanni_n4_65` (ISLAND). Batteries /
Electrical xrefs for starting power and DC distribution. Safety stop caveat
(never open main battery switch while running) retained under xliv.

**Composer tip lineage:** founding v4.1; xliv station cleanup v4.40; freeze tip:
**v4.41**.

## Frozen Know chapters (this tip)

Seven Stage 4 Know chapters are frozen for reuse:

| Section | Gate |
|---------|------|
| Solar v4 | `verify_solar_section_v4.py` |
| Batteries & Energy | `verify_batteries_section_v4.py` |
| Controls and Monitoring | `verify_controls_section_v4.py` |
| Electrical Panel | `verify_electrical_section_v4.py` |
| Navigation & Helm | `verify_nav_section_v4.py` |
| Water systems | `verify_water_section_v4.py` |
| Engines | `verify_engines_section_v4.py` |

Harness: `python scripts/verify_{solar,batteries,controls,electrical,nav,water,engines}_section_v4.py`
(also `make pipeline-verify` from `backend/`).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.41** | Engines Stage 4 frozen (founding v4.1; xliv station) |
| 4.40 | Affirmative station only (xliv); Water freeze supersession for station prose |
| 4.39 | Water systems Stage 4 frozen |
| 4.38 | Retire "day-to-day" globally (xliii) |
