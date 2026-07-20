# Equipment classification specification — v4.34

Follow-on to
[`equipment-classification-spec-v4.33.md`](equipment-classification-spec-v4.33.md).

## Vessel place ≠ control-surface `location_class` (lxviii)

`control_surfaces[].location_class: on_device` means the control lives on
the equipment body (vs remote / network). It is **not** a vessel place
(“on deck”, “in the locker”, “aft panel”).

**Compose rule:** guest prose may say **local** (or omit place) from
`on_device` / “local only” evidence. Vessel places appear only when a
vessel location fact is cited (`device_locations`, installation note,
owner confirmation). Never invent place from taxonomy tokens.

**Lint:** `lint_vessel_place_from_surface` in `guide_reader_voice.py`
(flags `on-deck` / `on deck`). Electrical **lxviii** hard-fails that class.

**Fact query:** `electrical_component_locations` includes the plain rotary
switch; do not treat any isolation device as place-sourced until answered.

Founding miss: Electrical template “separate on-deck disconnect” while
sources only supported local rotary / `on_device`.

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| Queued ML/Class-T/busbar locations (v4.32) | Extended to rotary; removed false “already has on-deck cue” | Same query id |
| Solar “deck photo” installation notes | Unrelated — not `on-deck` place claims in guest body | No change |
| v4.11 reader-voice warnings | New warning code; Electrical hard-fails | Compatible |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.34** | Ban inventing vessel place from `on_device`; Electrical lxviii |
| 4.33 | Vessel-first opening; ban chapter-meta framing |
| 4.32 | Electrical operator-voice review lxii–lxvi |
| 4.31 | Electrical Stage 4 composer |
