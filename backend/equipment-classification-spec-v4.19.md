# Equipment classification specification — v4.19

Follow-on to
[`equipment-classification-spec-v4.18.md`](equipment-classification-spec-v4.18.md).

## Field-pack migrations (schema evolution after extracts)

When Stage 4 (or Stage 1) adds optional profile fields after manuals have
already been extracted, do **not** full-reextract the catalog. Use a
**field pack**:

| Piece | Role |
|-------|------|
| Optional schema field | Empty/absent = not backfilled or manual silent |
| Debt registry | `scan_pack_debt(pack_id)` over last_green + vessel |
| Offline / live backfill | Additive merge only (empty → value + evidence) |
| Vessel promote | Copy filled attributes onto matching stub actions |
| Stage 4 fallback | Demote / queue until debt cleared (xxxix pattern) |

Shared module: `profile_field_packs.py`.  
CLI: `scripts/backfill_field_pack.py`.

### Additive merge contract

Backfills may only:

- set an empty field to a sourced value
- append `evidence[]` rows for that path

They must not (without adjudication): change audience, drop actions, retag
DIP↔operator, or import optional remotes not on the vessel.

### Founding pack: `occasion`

Optional `operator_actions[].occasion` (and `ui_pages[].actions[].occasion`):
when/why from THIS manual text only.

- Extract prompt rule **4b** (forward path for new extracts).
- Offline derives (excerpt-grounded): Combi remainders, Victron MPPT,
  MLI Ultra; vessel CZone Modes/Climate CONTROLS from QSG purpose notes.
- CLI catch-up: `python scripts/backfill_field_pack.py --pack occasion --catch-up`.
- Honest leftovers (no invent): plain battery switch, Touch 7 calibrate
  (no calibrate excerpt in corpus). Silentwind removed from Outremer
  inventory (not fitted) — see `outremer/INVENTORY_EVENT_silentwind_removed.md`.
- `commissioning` context satisfies occasion (installer setup when/why).

Composition: `action_has_sourced_occasion()` prefers `occasion`, then
daily/emergency/maintenance/**commissioning** context, then occasion words
in `action`.

## Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| xxxix demote-without-occasion | Pack fills occasion when text supports | Compatible — demote remains safety valve |
| Vessel stub vs last_green | Promote is explicit | Compatible — no auto-import of MasterView |
| Installer Power Sharing row | May receive occasion; audience unchanged | Guest Stage 4 still uses operator AC-limit action |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.19** | Field-pack migration platform; `occasion` schema; catch-up Combi/MPPT/MLI/CZone |
| → | See [`equipment-classification-spec-v4.20.md`](equipment-classification-spec-v4.20.md) for wisdom non-restatement |
| 4.18 | Provenance-leak vocabulary |
