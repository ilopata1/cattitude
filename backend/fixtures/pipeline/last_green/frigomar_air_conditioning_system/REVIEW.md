# Frigomar Air Conditioning System — Playbook 1 review

**Device:** Frigomar / Air Conditioning System  
**Equipment id:** `d3f0228f-5c1d-48a1-acdc-dbba6afbd3ee`  
**Scratch stem:** `fixtures/pipeline/scratch/frigomar_air_conditioning_system*`  
**Baseline:** none prior — now in `outremer/profiles.json` + plant

## A. Source and genre — PASS

| Check | Result |
|-------|--------|
| Registry | Present; `hvac`; branded_major; discrete_option; nameplate |
| Manual work | `08e30678-…` — *Instruction Manual* |
| Legal / type / tier | `cleared` / `operators` / `tier_1` |
| Edition admin | `initial` (no version token) |
| Local PDF | `C:\Users\ilopa\Downloads\User-Manual-Self-contained-unit-INVERTER-BLDC_rev20190118.pdf` |
| Hash vs ingest | **Match** `1e9ca775641747af…` |
| Pages | **32** EN |
| Self-declared | Cover **Rev. 20190118** (matches filename); body footers often **Rev. 20180919** |
| Models covered | Self-contained INVERTER BLDC: SCU07VFD / SCU10VFD / SCU12VFD / SCU16VFD |
| Genres (document) | Combined: **installation** (§5) + **operation** (§6) + alarms (§7) |
| Setup-only? | **No** |

**Inventory:** Supernova `vessel_equipment` `6d36a369-…` — saloon_living_area / saloon_general, `team_verified` (wired 2026-07-28).

## B. Route and extract — PASS

```powershell
cd backend
python scripts/extract_interaction_profile.py `
  --manufacturer Frigomar --model "Air Conditioning System" `
  --out fixtures/pipeline/scratch/frigomar_air_conditioning_system.json `
  --citations-out fixtures/pipeline/scratch/frigomar_air_conditioning_system_citations.json
```

- Heading coverage **75%** (54/72); `coverage_low: false`
- Stability: 3/3 votes; **0 material**; **5 cosmetic**
- Procedure inventory: **0 unaccounted** (vacuous via imperative filters; actions still extracted)

## C. Review — PASS after adjudication

Validators clean on raw extract (`needs_rextraction: false`). Items below adjudicated in §D.

## D. Adjudication — APPROVED 2026-07-28 (owner/human)

| Id | Decision | Applied |
|----|----------|---------|
| D1 | `is_protective_device` **false**; keep `has_emergency_procedure` | Yes — dropped circuit-breaker protective evidence |
| D2 | Single wall panel; drop duplicate physical_controls | Yes — `remote_panel_accessory` / `remote_wired` (not command-station `touchscreen`, which spuriously made it a HUB via shared NMEA2000 with CZone) |
| D3 | Genres `["installation","operation"]` | Yes |
| D4 | Add seawater-pump-only (mode hold 10s while OFF) | Yes |
| D5 | Wire Supernova inventory + fixture plant places | Yes (owner wired VE; promote mirrored places) |

Promote script: `scripts/promote_frigomar_air_conditioning_system.py`  
Archive: `fixtures/pipeline/last_green/frigomar_air_conditioning_system/`  
Live profiles: `outremer/profiles.json`, `outremer_post_batch_b/profiles.json`

## E. Promote — DONE

- Role expectation: **ENDPOINT** / section **ac** (speaks NMEA2000 → reaches CZone/Zeus hubs)
- Stage 4 substrate re-seeded; plant drift **OK**
- Vessel regression: **PASS**
- Remaining flags: `evidence_verbatim`, `evidence_support_mismatch` (warnings), `extraction_omission_adjudicated` (info), `network_alias_gap` (expected)
- `needs_rextraction`: **false**

## Artifacts

- `profile.json` — promoted (adjudicated)
- `extraction_input.json` — full observability (scratch raw)
- `groups/` — map I/O
- `procedures.json` — inventory + trail
- `citations.json`
- Scratch mirrors under `fixtures/pipeline/scratch/frigomar_air_conditioning_system*` (pristine raw)
