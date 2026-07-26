# Equipment classification specification — v4.44

Follow-on to
[`equipment-classification-spec-v4.43.md`](equipment-classification-spec-v4.43.md).

## Stage 1 — `control_surfaces[].hosting` (display host)

Where the operator **sees/uses** a control surface is distinct from
`location_class` (physical-vs-remote body of the control on the product).

| Value | Meaning |
|-------|---------|
| `integral_display` | Built-in screen on this product |
| `external_mfd` | Third-party chartplotter / MFD app, RTSP into an MFD, MFD-compatibility chapters |
| `external_pc_app` | Windows/Mac application on an onboard PC |
| `mobile_app` | Phone/tablet app |
| `unclear` | Manual silent or ambiguous |

Omit `hosting` when unknown and excerpts do not imply external hosting
(backward compatible). When excerpts mention onboard MFD / chartplotter /
RTSP / PC app, Stage 1.5 emits warning `display_host_unresolved` until a
surface resolves with `external_mfd`, `external_pc_app`, or `mobile_app`.
Invalid enum → `display_host_invalid` (warning).

**Playbook 1C:** clear `display_host_unresolved` before promote. Do not read
`location_class: on_device` as “dedicated on-product screen” when the manual
describes MFD/PC hosting.

**Locked assets**

| Asset | Path |
|-------|------|
| Extract prompt | `prompts/guide/llm/extract_interaction_profile.txt` (rule 13 + calibration Q) |
| Schema keys | `interaction_profile_schema.py` (`DISPLAY_HOSTING_VALUES`) |
| Stage 1.5 | `interaction_profile_validate.py` (`check_display_host_flags`) |
| Merge / repair | `interaction_profile_merge.py`, `interaction_profile_repair.py` |
| Checklist | `PLAYBOOKS.md` §1.C |

**Watchkeeper §1.D:** `hosting: external_mfd` on the User Interface surface
(manual Connecting Onboard MFD). Nav Stage 4 guest prose remains tip v4.43
(Zeus vessel fact).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.44** | Stage 1 `control_surfaces[].hosting` + `display_host_unresolved` |
| 4.43 | Nav re-compose — Watchkeeper; UI on Zeus (owner review) |
| 4.42 | Global xlv — inventory places in Equipment Locations table |
| 4.41 | Engines Stage 4 frozen |
| 4.40 | Affirmative station only (xliv) |
| 4.39 | Water systems Stage 4 frozen |
| 4.38 | Retire "day-to-day" globally (xliii) |
| 4.37 | Navigation & Helm Stage 4 frozen (nav-i–nav-xiii) |
