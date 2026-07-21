# Equipment classification specification — v4.38

Follow-on to
[`equipment-classification-spec-v4.37.md`](equipment-classification-spec-v4.37.md).

## xliii — retire "day-to-day" timing labels (global)

Promotes Nav-local **nav-x** to a global composition rule. Guest prose must
not label a normal-operations action "day-to-day" (or "day to day"). Guests
already assume non-emergency actions are ordinary, so the phrase reads as a
daily chore and adds nothing.

- **Redundant label** → drop it. "day-to-day switching and monitoring run
  through the touchscreen" → "switching and monitoring run through the
  touchscreen".
- **Imperative that leaned on "Day-to-day," for its occasion** → give a real
  when/why occasion (xxxix still applies). "Day-to-day, open Monitoring to
  read …" → "Open Monitoring when you want to read …".
- **Real routine-vs-exceptional contrast** → use a plain adjective
  ("routine" / "everyday") or state the occasion, not "day-to-day". Example:
  isolation switch is left connected during normal operation; the CZone
  touchscreen is used "when you need to switch those circuits".

**Lint / check:** `lint_routine_timing_label` in `guide_composition_rules.py`;
global check `no_routine_timing_label` (part of `run_global_composition_checks`,
now **v4.38**). Nav keeps its equivalent local `no_routine_timing_label`.

## Frozen-section regressions (this pass)

Global rule change → all five frozen Stage 4 sections re-run. Reader prose
edited in Controls (capability + Monitoring occasions + menu-visibility line),
Electrical (COI switching occasion), Batteries (house-bank loads + meter
readings), Solar (VictronConnect check occasion). Nav already clean.

| Section | Result |
|---------|--------|
| Solar v4 | pass |
| Batteries & Energy | pass |
| Controls and Monitoring | pass |
| Electrical Panel | pass |
| Navigation & Helm | pass |

Harness: `python scripts/verify_{solar,batteries,controls,electrical,nav}_section_v4.py`
(also `make pipeline-verify` from `backend/`).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.38** | Retire "day-to-day" globally (xliii); prose cleanup across all five frozen sections |
| 4.37 | Navigation & Helm frozen (nav-i–nav-xiii); `startup` global spine slot |
