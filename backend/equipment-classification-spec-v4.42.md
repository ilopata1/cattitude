# Equipment classification specification — v4.42

Follow-on to
[`equipment-classification-spec-v4.41.md`](equipment-classification-spec-v4.41.md).

## Global composition — xlv (Equipment Locations, not inline capability)

**xlv:** Vessel inventory places (`places` / `location_label`) belong in the
Know **Equipment Locations** table emitted by `section_to_system_module`.
Capability prose must not list those places inline (e.g. “They are located in
Port – …”).

- Lint: `lint_inline_equipment_places` in `guide_composition_rules.py`
- Aggregate check: `no_inline_equipment_places` in `assess_global_composition`
  (criteria xxxii–**xlv**; composition rules version **v4.42**)
- When places are missing for cited plant, queue a places fact-query (pattern
  already used by Electrical / Heads / Engines) — do not invent coordinates
- Control-surface stations (“from the NAVIGATOR panel”) remain allowed
- Distinct from **xliv** (affirmative station vs “not on X”)

Heads founding previously carried this as section standing policy; that copy
now points at global xlv.

**Frozen chapters:** re-run
`verify_{solar,batteries,controls,electrical,nav,water,engines}_section_v4.py`
after this tip (global rule change). Engines freeze tip remains v4.41; this tip
adds a global criterion only.

## Frozen Know chapters (unchanged set)

| Section | Gate |
|---------|------|
| Solar v4 | `verify_solar_section_v4.py` |
| Batteries & Energy | `verify_batteries_section_v4.py` |
| Controls and Monitoring | `verify_controls_section_v4.py` |
| Electrical Panel | `verify_electrical_section_v4.py` |
| Navigation & Helm | `verify_nav_section_v4.py` |
| Water systems | `verify_water_section_v4.py` |
| Engines | `verify_engines_section_v4.py` |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.42** | Global xlv — inventory places in Equipment Locations table, not capability prose |
| 4.41 | Engines Stage 4 frozen (founding v4.1; xliv station) |
| 4.40 | Affirmative station only (xliv); Water freeze supersession for station prose |
| 4.39 | Water systems Stage 4 frozen |
| 4.38 | Retire "day-to-day" globally (xliii) |
