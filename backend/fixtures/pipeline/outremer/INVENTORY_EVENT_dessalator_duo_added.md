# Inventory event — Dessalator Duo watermaker added (Outremer / Supernova)

**When:** 2026-07-20  
**Class:** add (owner-confirmed fitted; corrected assumption — OPT circuit → fitted device)  
**Source:** Owner confirmation (chat)  
**Fixture-Auth:** chat Dessalator Duo add — owner-attested watermaker

## Claims

| Claim | Class |
|-------|--------|
| A watermaker is fitted on this vessel | attested (owner) |
| It is a Dessalator, model "Duo AC & DC Navigator" | attested (owner) |
| Runs on AC or DC; local Navigator control panel | attested (owner) + model designation |
| Corresponds to channel_map DCD2-04 `[OPT] DESSALINISATEUR / WATER MAKER` (35A) | corroborated (channel_map Ind C) |
| Standalone appliance — not on CZone/MasterBus data network | inferred (channel_map shows a DC power circuit only) |
| Documented operation (start/stop, flush, rinse) | unconfirmed — no manufacturer manual ingested |

Supersedes `rec_channel_map_opt_nav_owner`, which had left the watermaker OPT
circuit unchanged (not promoted to a device).

## Live state changes (`fixtures/pipeline/outremer/`)

- Added `dessalator_duo` to `equipment.json` (`system_category: fresh_water`).
- Added role (`ISLAND`) + section (`water`) + note to `expected.json`.
- Added `rec_dessalator_duo_added` to `reconciliation_records.json`.
- Mirrored profile + expected role/section/note into
  `fixtures/pipeline/outremer_post_batch_b/` (matching promote-script practice;
  that snapshot's `equipment.json` is not edited by promote scripts).

## Follow-up — Playbook 1 Stage 1 extraction (supersedes the stub)

The manual was already cleared/ingested (operators start-up guide v4.9,
`manual_work ffe1b474`, 9 embedded chunks). Ran the real Stage 1 extraction:

- `scripts/extract_interaction_profile.py --equipment-id 6f36568d… ` →
  `fixtures/pipeline/scratch/dessalator_duo.json` (+ input / groups / procedures
  / citations). Coverage 1.0; 0 unaccounted procedures; `needs_rextraction` false.
- Extracted: 5 operator actions (start / stop / restart / flush / rinse), the
  optional Mini Remote Control surface, `data_roles` all false.
- Review (§1.C) found two true extraction omissions vs. the source; added in
  `scripts/promote_dessalator_duo.py` (§1.D, source-grounded):
  1. primary on-device **NAVIGATOR control panel** (voltage switch + motorized
     pressure-regulator knob) — always present;
  2. mandatory **DC > 5 min → engine / shore charger / generator** supply caveat.
- `scripts/promote_dessalator_duo.py` replaced the stub in `profiles.json`
  (both dirs), archived to `last_green/dessalator_duo/`, and updated the
  `expected.json` note. Added `rec_dessalator_duo_extracted`.
- Graph result unchanged at the contract level: role `ISLAND`, section `water`
  (now `tier=situational`, `source=live_extraction`). An honest
  `unresolved_dependency` flag remains for the optional Mini Remote Control
  (not fitted on this vessel).

## Left unchanged (audit / generic)

- Channel-map circuit rows (`DCD2-04` OPT entry retained as the sourcing
  evidence; not rewritten).
- Historical snapshots: `outremer_pre_batch_b/`.
- No `water` section Stage-4 composer exists yet (frozen sections remain
  Solar / Batteries / Controls / Electrical / Nav); the device is inventory +
  graph state only.

## Verification

- `python scripts/run_outremer_vessel.py`: OK — `dessalator_duo` = role
  `ISLAND`, section `water` (source=lookup), tier `monitor`; existing vessel
  regression assertions still pass.
- `python scripts/verify_system_graph.py`: exact-match roles/sections pass.
- `make pipeline-verify`: offline fixture gates pass.
