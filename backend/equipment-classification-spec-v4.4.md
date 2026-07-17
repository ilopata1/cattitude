# Equipment classification specification — v4.4

Repair-quality follow-ups on
[`equipment-classification-spec-v4.3.md`](equipment-classification-spec-v4.3.md).

## Deterministic fill guard

`repaired_deterministic` / `deterministic_fill` is allowed **only** when:

- inventory `kind` ∈ `{headed_procedure, numbered_heading}`
- title is **not** a mode description (Gen-/Mains / Power sharing / Power assist)
- title is **not** `enumerated_alternatives`

Action text is the inventory **heading verbatim**. Review queries use the
distinct validation flag `deterministic_fill`. Alternatives that the LLM
repair miss must **remain flagged** — no deterministic requires fill.

Firmware actions are reclassified to `context: maintenance`.

## Options collapse

Repair/reduce/`normalize_profile` merge actions that differ only in an
option-value tail (`… to <option>`) into one action with `options[]`.
SmartSolar sunset → 1 action, 4 options.

## Combi audience collision (adjudicated)

`set AC input current limit` (Mains limit A/B/C / mains fuse via MasterBus)
and `set Power Sharing level` (match external circuit breaker; DIP/MasterView)
are **genuinely distinct** parameters in the manual — keep both; note the
distinction in evidence.

## MasterBus on CZone COI (operators manual)

**Finding: (b) routed-but-unextracted** — not absent, not unrouted.

Full chunk inventory (38 chunks) has MasterBus only in:
1. TOC figure list
2. SYSTEM EXAMPLE 3.7 diagram labels (`CZone/Masterbus Bridge`,
   `CZone - MasterBus Bridge Interface`, NMEA 2000, Mbus)

That diagram chunk **was routed** (excerpt / batch_0) but Stage 1 map emitted
only `NMEA 2000` speaks and empty bridges. Evidence-shaped fill
(`apply_network_bridges_from_excerpts`) now records MasterBus + CZone speaks
and `MasterBus ↔ CZone` when those labels are present. Do **not** stub-fill
when the counterpart manual lacks these labels.

## Swap-live COI

Without bridge: Combi → `controllable_but_unreachable` (MasterBus-only).
Live MLI already speaks CZone, so it may stay reachable. With bridge fill:
Combi control path restored via CZone hub.

## Revision history

| Ver | Notes |
|-----|-------|
| 4.4 | Deterministic fill guard; options collapse; Combi AC vs Power Sharing |
| **4.4a** | COI MasterBus bridge fill; wiring installer classify; connector kit kind; LED surface grounding |
