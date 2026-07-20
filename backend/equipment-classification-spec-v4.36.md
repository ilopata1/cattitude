# Equipment classification specification — v4.36

Follow-on to
[`equipment-classification-spec-v4.34.md`](equipment-classification-spec-v4.34.md)
(Electrical ACR body landed as composer v4.35 without a separate tip file).

## Electrical Panel Stage 4 — frozen for reuse

Know chapter `electrical` Stage 4 composer and acceptance criteria are
**frozen** after human review (post–COI promote recompose + multi-occasion
ACR override review). Further change needs a versioned tip that supersedes
this freeze — do not silently rewrite the template in place.

Ship-with-honest-gaps remains in force: Class-T / busbar / plain rotary /
MasterBus bridge may stay stub-thin; queued
`electrical_component_locations` must **not** block freeze. Wisdom slot may
remain `pending` until a filled comparative claim is sourced.

**Locked assets**

| Asset | Path |
|-------|------|
| Composer / evaluate | `guide_section_electrical.py` (criteria lvi–lxix) |
| Draft harness | `scripts/draft_electrical_section.py` |
| Regression gate | `scripts/verify_electrical_section_v4.py` |
| Expectations | `tests/fixtures/electrical_section_v4_expectations.json` |
| Scratch draft | `fixtures/pipeline/scratch/electrical_section_draft_v4.{md,json}` |

**Template:** capability → how_it_works → adjusting → troubleshooting /
reference. Full members: ACR, Class-T, COIs, plain rotary, busbar,
MasterBus bridge/USB (USB commissioning omitted). Controls / Batteries
xrefs for day-to-day switching and BMS / bank depth.

**Composer tip lineage:** introduced v4.31; operator-voice lxii–lxvi;
vessel-place lxviii; ACR v4.35; freeze tip: **v4.36** (includes xlii/lxix).

## Multi-occasion same surface — action first (xlii / Electrical lxix)

When **two or more occasions** share the **same control surface / action**,
do **not** emit one `When …, use the <surface>` sentence (or paragraph) per
occasion.

**Compose instead:**

1. Lead with the surface and what it achieves (fact / function).
2. Then list the occasions (bullets preferred) under a single imperative
   cue such as `Use it when:`.

This is a specialization of **xxxix** (instruction occasion): occasion is
still required, but when occasions cluster on one action, the action leads
and occasions follow as a list rather than repeating the action.

**Helpers / lint:** `format_action_first_occasions`,
`lint_repeated_action_occasions` in `guide_composition_rules.py`.
Global check `multi_occasion_action_first_ok` (xlii). Electrical founding:
ACR Manual Control Override Knob (**lxix**).

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| **xxxix** same-sentence occasion | Lead uses `Use it when:` then bullets | Compatible — cue stays on the imperative sentence; bullets are the occasion list |
| Purpose-fronted “To X, use Y” is not an occasion (v4.17) | Lead states function; occasions are the when/why list | Compatible — lead is not a fake occasion |
| **viii** no per-action enumeration | Listing occasions for one action ≠ enumerating distinct actions | Compatible |
| **xxxviii** surface-bound adjusting | Lead still names the surface | Compatible |

## Frozen-section regressions

Frozen Stage 4 sections: **Solar v4**, **Batteries & Energy**, **Controls
and Monitoring**, **Electrical Panel**. Any global composition /
reader-voice rule change must re-run all four and report pass / what broke
(`standard_frame.txt`).

Harness reminders:

- `python scripts/verify_solar_section_v4.py`
- `python scripts/verify_batteries_section_v4.py`
- `python scripts/verify_controls_section_v4.py`
- `python scripts/verify_electrical_section_v4.py`

Also covered by `make pipeline-verify` from `backend/`.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.36** | Electrical Stage 4 frozen; multi-occasion action-first (xlii/lxix); frozen set = Solar + Batteries + Controls + Electrical |
| 4.35 | Electrical ACR replace ML switch |
| 4.34 | Ban inventing vessel place from `on_device` |
