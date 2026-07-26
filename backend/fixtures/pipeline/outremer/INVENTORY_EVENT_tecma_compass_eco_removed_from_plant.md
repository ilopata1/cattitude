# Inventory event — Tecma Compass Eco removed from vessel plant

**When:** 2026-07-26  
**Class:** remove from vessel plant (catalog profile retained)  
**Source:** Owner review Heads section draft v4.0-founding — Tecma heads
are not in Supernova inventory  
**Fixture-Auth:** chat Heads review — Tecma not inventory-corroborated

## Claims

| Claim | Class |
|-------|--------|
| Tecma Compass Eco is **not** fitted inventory for Supernova Stage 4 plant | attested (owner review) |
| Stage 1 profile + cleared manual remain valid catalog knowledge | retained |
| Prior provisional live `vessel_equipment` attach was over-attribution from Playbook 1 | corrected |

## Live state changes

- Removed `tecma_compass_eco` from Outremer `equipment.json` plant / roles /
  home_section.
- Deleted provisional Supernova `vessel_equipment` row for Tecma (if present).
- Profile stays in `profiles.json` (outremer + post_batch_b) for future
  Playbook 3 when owner adds heads via admin inventory.

## Follow-up

- Owner adds heads (manufacturer/model/qty/locations) in admin inventory →
  Playbook 3 re-attach + Heads recompose.

## Verification

- `python scripts/verify_system_graph.py`
- `python scripts/draft_heads_section.py` / `verify_heads_section_v4.py`
