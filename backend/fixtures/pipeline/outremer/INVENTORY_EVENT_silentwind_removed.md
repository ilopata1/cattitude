# Inventory event — Silentwind removed (Outremer / Supernova)

**When:** 2026-07-18  
**Class:** remove (corrected assumption — not fitted)  
**Source:** Owner / admin vessel_equipment unlink (team verified)  
**Fixture-Auth:** chat 2026-07-18 — Silentwind not fitted on Outremer

## Claims

| Claim | Class |
|-------|--------|
| Silentwind Hybrid 1000 is not fitted on this vessel | attested (owner/admin) |
| Prior fixture listing was incorrect inventory | corrected assumption |

## Live state changes (`fixtures/pipeline/outremer/`)

- Removed `silentwind` from `equipment.json`
- Removed `silentwind` stub from `profiles.json`
- Removed role/section from `expected.json`; added `notes.silentwind_removed`
- Updated `tests/fixtures/batteries_section_v4_expectations.json` (input set + forbidden wind prose + no brake fact-query)

## Left unchanged (audit / generic)

- Historical snapshots: `outremer_pre_batch_b/`, `outremer_post_batch_b/`
- Generic routing keywords in `system_graph.py` / `guide_system_assembly.py`
- Conditional Silentwind branches in `guide_section_batteries.py` (other vessels may still carry wind)

## Verification

- Batteries / Solar / Controls section verifies: pass
- Occasion debt: Silentwind row cleared (2 leftovers remain: plain switch, Touch calibrate)
- `verify_system_graph.py`: still reports pre-existing B&G role drift (PASSIVE vs ENDPOINT); unrelated to this removal
