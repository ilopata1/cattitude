# Inventory event — Fischer Panda 8000i generator (Outremer / Supernova)

**When:** 2026-07-21  
**Class:** profile extraction + guide-section authoring (device already in DB registry and attached to the vessel)  
**Source:** Owner request (Playbook 1 — New Equipment); operators manual  
**Fixture-Auth:** chat Fischer Panda 8000i Stage 1 extract — live extraction promoted; genset authored into Batteries section v4.24

## Claims

| Claim | Class |
|-------|--------|
| A Fischer Panda Panda 8000i genset is fitted on this vessel | attested (DB registry equipment 17c202cc + Supernova attachment) |
| 8 kVA super-silent marine diesel genset; AC power source | attested (manual) |
| Controlled/monitored at the Panda iControl2 panel | attested (manual ch. 15–17, `control_surfaces[0]`) |
| Reports status to iControl2 over the Fischer Panda standard bus | adjudicated (§1.D, grounded standard/CAN bus) |
| When to run the genset (SOC threshold / load policy / autostart setpoints) | unconfirmed — no sourced occasion; open owner query |

## Playbook 1 Stage 1 extraction

The operators manual was already cleared/ingested (combined 8000i + 10000i, EN rev
R10 29.4.25, 178 pp, `manual_work eb6dc5c9`, 307 chunks). Ran the real Stage 1
extraction:

- `scripts/extract_interaction_profile.py --equipment-id 17c202cc…` →
  `fixtures/pipeline/scratch/fischer_panda_8000i.json`. Stable (0 material
  instability, 3 cosmetic), heading coverage 0.58, `needs_rextraction` false.
- Review (§1.C) diagnosed: one **blocking** `speaks_but_inert` flag (grounded bus,
  missed data role), installer-only cable actions, a combined-manual genre gap,
  and 10000i/L3 variant material out of scope for this 8 kVA unit.
- Three source-grounded §1.D adjudications in
  `scripts/promote_fischer_panda_8000i.py`:
  1. set `data_roles.exposes_data_to_network` — genset reports status to the
     iControl2 panel over the grounded Fischer Panda standard bus (resolves the
     blocking `speaks_but_inert`);
  2. normalized `genres` to `installation / maintenance / operation` (combined
     install/operate/maintain manual);
  3. dropped 3 installer-only cable steps (installation chapter).
- `scripts/promote_fischer_panda_8000i.py` wrote the profile + `expected.json`
  entry (both dirs), archived to `last_green/fischer_panda_8000i/`.

## Graph result

- Role `ISLAND`, section `batteries` (power) — `system_graph` `SECTION_LOOKUP`
  maps `genset` / `generator` into the Batteries & Energy section.

## Batteries Stage-4 section impact (Playbook 2)

Adding the genset as a `full` member changed a frozen, human-reviewed section, so
it was re-composed and re-frozen after review:

- `guide_section_batteries.py` — genset content rule: names the generator as the
  on-board AC source (`how_it_works`) and gives the start/stop/monitor-at-iControl2
  + "visual check before starting" thread (`adjusting`). Deeper menu / priming /
  autostart steps remain un-prosed (un-occasioned reference actions).
- Review round (see `standard_frame`): "when to run" classified as a **fact
  query**, not prose — occasion-gate §xxxix forbids inventing an unsourced
  occasion. Emitted as `fact_query genset_run_policy_occasion` and rendered
  without it.
- `tests/fixtures/batteries_section_v4_expectations.json` (v4.24) — genset
  contributor, two `required_prose_substrings`, `expected_fact_query_ids`, and
  Fixture-Auth stamped human-reviewed + re-frozen 2026-07-21.

## Records

- `reconciliation_records.json`: added `rec_fischer_panda_8000i_extracted`
  (reviewed/approved) and `rec_fischer_panda_8000i_run_policy_question`
  (open owner query).
- `scripts/verify_field_pack_occasion.py`: genset's un-occasioned situational
  iControl2 actions documented in `_EXPECTED_REMAINING` (honest leftovers).

## Left unchanged (audit / generic)

- `equipment.json` genset row (already present; provenance retained).
- Historical snapshots: `outremer_pre_batch_b/`.
- Pre-existing `field_pack_occasion` baseline debt (`czone_2_0`, `bg_zeus_sr`,
  `bg_zeus_sr_software`) — unrelated to this event.

## Open owner query (carried forward)

`genset_run_policy_occasion` — when should the genset be run? House-bank SOC
threshold, large-AC-load policy, shore-power fallback, or programmed iControl2
autostart setpoints. To resolve: attest as a `vessel_fact`; the Batteries
composer will then ground a real "when to run" sentence.

## Verification

- `python scripts/verify_batteries_section_v4.py`: OK — Batteries v4 composition
  + xxvi–xli, 0 style warnings; genset input + prose + fact query asserted.
- `pipeline_verify.ps1`: all frozen sections pass (Solar / Controls / Batteries /
  Electrical) + Stage 1/1.5/1.6/2 fixtures; only the pre-existing
  `field_pack_occasion` baseline debt remains red.
