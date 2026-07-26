# Inventory event — Heads plant preparing (Outremer / Supernova)

**When:** 2026-07-25  
**Class:** add (partial plant) + Stage 4 composer prepare (Playbook 2A)  
**Source:** Owner/admin — Generic Blackwater Tank Discharge Valve ×3 attached on
Supernova; Tecma Compass Eco in registry but not yet vessel-linked / extracted  
**Fixture-Auth:** chat Heads Stage 4 founding prepare — blackwater discharge
valves into Outremer fixture; Tecma Stage 1 still queued

## Claims

| Claim | Class |
|-------|--------|
| Three blackwater tank discharge valves are fitted | attested (Supernova `vessel_equipment` ×3; registry `e7a23c5d…`) |
| Exact per-valve bilge/cabin placement + normal under-way position | unconfirmed — queued as `discharge_valve_locations_and_normal` |
| Tecma Compass Eco (or 2G) electric heads ×5 are the intended Heads founding ISLAND | planned (checklist P1; registry `797ee578…`) — **not** on Supernova vessel_equipment yet |
| Tecma operators manual on disk (`manuals/Tecma/…`) is ingested / Stage 1 extracted | unconfirmed — no `manual_work` linked; Playbook 1 queued |

## Live state changes (`fixtures/pipeline/outremer/`)

- Added `blackwater_tank_discharge_valve` to `equipment.json`
  (`system_category: sanitation`, quantity 3).
- Added stub profile (PASSIVE — empty surfaces/actions).
- Added role (`PASSIVE`) + section (`heads`) to `expected.json`.
- Founding composer + draft/verify scripts (not in `PUBLISHED_SECTIONS`).

## Follow-up (ordered)

1. **Playbook 1** — clear/ingest Tecma manual; Stage 1 extract → promote.
2. **Playbook 3** — attach Tecma heads on Supernova + fixture; record qty/model.
3. **Playbook 2 §B–D** — flesh Heads composer from Tecma profile + valve
   walkthrough facts; human review via `standard_frame.txt`; freeze tip;
   then add `heads` to `PUBLISHED_SECTIONS` / Stage 4 publish path.

## Verification

- `python scripts/draft_heads_section.py` — writes
  `scratch/heads_section_inputs.json` + founding draft.
- `python scripts/verify_heads_section_v4.py` — input set + founding gates.
- `python scripts/verify_system_graph.py` — valve role/section expected.
