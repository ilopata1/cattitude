# Inventory event — Sea.AI Watchkeeper added (Outremer / Supernova)

**When:** 2026-07-23  
**Class:** add (device already in DB registry and attached to Supernova) + Playbook 1 Stage 1 extraction  
**Source:** Owner request (Playbook 1 — New Equipment); User Guide Watchkeeper Series  
**Fixture-Auth:** chat Sea.AI Watchkeeper Stage 1 extract — live extraction promoted; genres normalized; NMEA Gateway commissioning + duplicate remote-access actions dropped

## Claims

| Claim | Class |
|-------|--------|
| A Sea.AI Watchkeeper is fitted on this vessel | attested (DB registry equipment 3b14f3a7 + Supernova `vessel_equipment`) |
| User Guide Watchkeeper Series (Doc SEAAI-442870296-11, Rev 26 Nov 2025, 18 pp) | attested (cleared `manual_work` 14570452; file Watchkeeper Series_1.2) |
| On-device User Interface for thermal/color views, alarms, personalization | attested (manual ch. 4; `control_surfaces[0]`) |
| Threat-level alarms Object / Warning / Danger | attested (manual ch. 6; `alarm_severity`) |
| NMEA Gateway model selection is guest day-to-day | unconfirmed — treated as commissioning; dropped |

## Playbook 1 Stage 1 extraction

Manual already cleared/ingested (21 chunks). Ran:

- `scripts/extract_interaction_profile.py --equipment-id 3b14f3a7…` →
  `fixtures/pipeline/scratch/sea_ai_watchkeeper.json` (+ input / groups /
  procedures / citations). Heading coverage **0.9**, **0** unaccounted
  procedures, `needs_rextraction` false, no blocking flags (cosmetic
  `group_unutilized` + one context vote flap).
- Review (§1.C): combined-manual genre gap; Setup-tab NMEA Gateway
  commissioning labelled as operator; duplicate remote-access action.
- Three source-grounded §1.D adjudications in
  `scripts/promote_sea_ai_watchkeeper.py`:
  1. genres → `installation` / `operation` / `maintenance`;
  2. drop `select and configure the NMEA Gateway model` (commissioning);
  3. drop duplicate short `enable or disable temporary remote access`.
- Promote wrote profile + `expected.json` role/section/note (outremer +
  post_batch_b), archived `last_green/sea_ai_watchkeeper/`.

## Graph result

- Role `ISLAND`, section `nav` — `SECTION_LOOKUP` extended with
  `watchkeeper` / `sea.ai` / `seaai` / `object detection`.

## Stage 4 impact

Navigation & Helm is **frozen** (spec v4.37). Watchkeeper is inventory +
graph only; guest Nav prose does **not** name it until a superseding tip
re-composes Nav. No frozen-section rewrite in this event.

## Records

- `equipment.json`: added `sea_ai_watchkeeper`.
- `reconciliation_records.json`: `rec_sea_ai_watchkeeper_added` +
  `rec_sea_ai_watchkeeper_extracted`.
- `system_graph.py`: nav `SECTION_LOOKUP` keywords.

## Left unchanged

- Historical snapshots: `outremer_pre_batch_b/`.
- Frozen Nav Stage 4 composer / expectations / oracle byte-match content.
