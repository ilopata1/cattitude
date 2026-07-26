# Inventory event — Tecma Compass Eco electric head added (Outremer / Supernova)

**When:** 2026-07-25  
**Class:** add + profile extraction (device already in DB registry; owner
confirmed model for Heads founding)  
**Source:** Owner request (chat); registry equipment `797ee578…`; Downloads PDF
`Tecma Compass Eco Manual.pdf` (sha256 `9820eedd…` matches cleared
`manual_work 821045ee`)  
**Fixture-Auth:** chat Tecma Compass Eco Stage 1 extract — live extraction
promoted; Flush (lower ECO Rocker switch) added as source-grounded §1.D
adjudication (extraction omission; evidence already cited OPERATION §7)

## Claims

| Claim | Class |
|-------|--------|
| Tecma Compass Eco electric head is the heads model for this vessel | attested (owner request + registry row) |
| Operators manual is the cleared Compass Eco INSTALLATION AND USE MANUAL (50 pp EN/FR/ES) | attested (hash match to Downloads PDF; legal_status cleared) |
| Operated via on-device ECO Rocker (Add Water upper / Flush lower) | attested (manual §7 OPERATION) + §1.D Flush adjudication |
| Fitted quantity (how many heads) | unconfirmed — fixture quantity=1 pending owner confirmation |

## Live state changes (`fixtures/pipeline/outremer/`)

- Added `tecma_compass_eco` to `equipment.json` (`system_category: sanitation`).
- Promoted Stage 1 profile into `profiles.json` (outremer + post_batch_b).
- Added role (`ISLAND`) + section (`heads`) to `expected.json`.
- Archived scratch extract under `last_green/tecma_compass_eco/`.

## Playbook 1 Stage 1 extraction

- Manual already cleared/ingested (`manual_work 821045ee`, 54 vector chunks).
- `scripts/extract_interaction_profile.py --equipment-id 797ee578…` →
  `fixtures/pipeline/scratch/tecma_compass_eco.json`. Heading coverage ~0.83;
  0 unaccounted procedures; `needs_rextraction` false.
- Extracted: ECO Rocker surface; Add Water action; emergency discontinue-use.
- Review (§1.C) found Flush omitted despite OPERATION evidence; added in
  `scripts/promote_tecma_compass_eco.py` (§1.D).

## Follow-up

- Owner confirms head **quantity** and locations → update quantity / instances.
- Heads Stage 4 composer (§2.B–D) absorbs Tecma flush/Add Water; freeze tip
  after human review.
- Attach on live Supernova `vessel_equipment` (admin) if not already linked.

## Verification

- `python scripts/promote_tecma_compass_eco.py`
- `python scripts/verify_system_graph.py`
- `python scripts/draft_heads_section.py` / `verify_heads_section_v4.py`
