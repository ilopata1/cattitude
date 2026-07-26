# Equipment classification specification — v4.43

Follow-on to
[`equipment-classification-spec-v4.42.md`](equipment-classification-spec-v4.42.md).

## Navigation & Helm — Watchkeeper absorb (supersedes v4.37 freeze for plant)

Know chapter `nav` Stage 4 re-compose adds Sea.AI Watchkeeper as a full
section member (already ISLAND / `nav` in inventory). Zeus / Halo / software
arc from v4.37.6 remains; this tip adds Watchkeeper guest body.

**Guest body (when `sea_ai_watchkeeper` is full):**
- **capability** — AI camera fitted; on-device User Interface
- **how_it_works** — threat-level alarms Object / Warning / Danger (orientation)
- **monitoring** — thermal or color view; voice alarm enable/disable
- **adjusting** — camera tilt for boat trim (after MOB in helm arc)

**Context_shaping (omitted):** maintenance chores, firmware updates, remote
access, NMEA buzzer / personalization / sensitivity modes, reboot/power checks.

**Locked assets (updated)**

| Asset | Path |
|-------|------|
| Composer / evaluate | `guide_section_nav.py` (v4.43) |
| Draft harness | `scripts/draft_nav_section.py` |
| Regression gate | `scripts/verify_nav_section_v4.py` |
| Expectations | `tests/fixtures/nav_section_v4_expectations.json` |

Ship-with-honest-gaps and `zeus_czone_controller_visible` unchanged. Global
xlv (places table) still applies. Evaluator adds `names_watchkeeper`.

**Composer tip lineage:** founding v4.37 → nav-xiii v4.37.6 → **v4.43**
Watchkeeper absorb.

**Watchkeeper display host (owner review after v4.43 absorb):** Guest prose
must **not** treat ``control_surfaces.location_class: on_device`` as a
dedicated on-camera screen. The manual documents MFD-hosted UI; on Supernova
the UI is on the Zeus SR chartplotters (`vessel_fact.watchkeeper_ui_on_zeus`).
Station wording matches Halo: controlled from those displays / from a
chartplotter. Evaluator: `watchkeeper_no_on_device_ui`,
`watchkeeper_station_on_displays`.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.43** | Nav re-compose — Sea.AI Watchkeeper guest prose; owner review: UI on Zeus (not on-device) |
| 4.42 | Global xlv — inventory places in Equipment Locations table |
| 4.41 | Engines Stage 4 frozen |
| 4.40 | Affirmative station only (xliv) |
| 4.39 | Water systems Stage 4 frozen |
| 4.38 | Retire "day-to-day" globally (xliii) |
| 4.37 | Navigation & Helm Stage 4 frozen (nav-i–nav-xiii) |
