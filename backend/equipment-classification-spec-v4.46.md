# Equipment classification specification — v4.46

Follow-on to
[`equipment-classification-spec-v4.45.md`](equipment-classification-spec-v4.45.md).

## Air Conditioning Stage 4 — frozen for reuse

Know chapter `ac` Stage 4 composer and acceptance criteria are **frozen**
after human review (Outremer / Supernova; Frigomar self-contained BLDC).
Further change needs a versioned tip that supersedes this freeze — do not
silently rewrite the template in place.

**Plant (Supernova today):** full member
`frigomar_air_conditioning_system` (saloon place → Equipment Locations table).

**Standing AC rules (locked)**

- Primary guest UI is the wall-mounted touch-screen.
- Passive station prose — never address readers as Operators / Crew when the
  panel can be the subject.
- No generic Electrical Panel circuit-protection xref.
- No `(Configuration pending)` when the section's primary control path is
  fully sourced (AC narrow of xxii). CZone Climate / supported HVAC stays a
  queued fact query (`ac_czone_climate_supported`) until sourced.
- Queued `ac_seawater_intake_location` must not block freeze.
- Wisdom slot may remain `pending`. Global xlv: never inline places in
  capability.

**Locked assets**

| Asset | Path |
|-------|------|
| Composer / evaluate | `guide_section_ac.py` (v4.1) |
| Draft harness | `scripts/draft_ac_section.py` |
| Regression gate | `scripts/verify_ac_section_v4.py` |
| Expectations | `tests/fixtures/ac_section_v4_expectations.json` |
| Scratch draft | `fixtures/pipeline/scratch/ac_section_draft_v4.{md,json}` |

**Composer tip lineage:** founding v4.0 → review-1 (passive / no electrical
xref / no config-pending) → freeze tip **v4.46**.

## Frozen Know chapters (this tip)

Nine Stage 4 Know chapters are frozen for reuse (Solar folds into Batteries):

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
| Air Conditioning | `verify_ac_section_v4.py` |

Harness: `python scripts/verify_{solar,batteries,controls,electrical,nav,water,engines,heads,ac}_section_v4.py`
(also `make pipeline-verify` from `backend/`). Published via
`PUBLISHED_SECTIONS` including `ac`.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.46** | Air Conditioning Stage 4 frozen (Frigomar; AC xxii narrow; passive station) |
| 4.45 | Heads & waste Stage 4 frozen (valves + honest `heads_model_unknown`) |
| 4.44 | Stage 1 `control_surfaces[].hosting` + `display_host_unresolved` |
| 4.43 | Nav re-compose — Watchkeeper; UI on Zeus (owner review) |
| 4.42 | Global xlv — inventory places in Equipment Locations table |
