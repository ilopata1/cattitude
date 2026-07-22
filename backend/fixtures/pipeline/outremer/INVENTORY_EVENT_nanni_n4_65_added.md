# Inventory event — Nanni N4.65 engines added (Outremer / Supernova)

**When:** 2026-07-22  
**Class:** add + profile extraction (device already in DB registry and attached to the vessel)  
**Source:** Owner registry (Supernova); Stage 4 Engines founding  
**Fixture-Auth:** chat Nanni N4.65 Stage 1 extract — live extraction promoted; Nanni instrument panel added as source-grounded adjudication

## Claims

| Claim | Class |
|-------|--------|
| Nanni N4.65 marine diesel engines are fitted | attested (DB registry equipment f7cb721c + Supernova attachment) |
| Twin interchangeable diesel plant | inferred (Outremer catamaran + SYSTEM_CATALOG engines focus); registry has one attachment row without port/stbd split |
| Operated from a Nanni instrument panel (key or ON/STOP + Start) | attested (operators manual S05/S07) + §1.D adjudication |
| Exact panel variant (Analog / C4-C5 / SI4) | unconfirmed — open owner question |

## Live state changes (`fixtures/pipeline/outremer/`)

- Added `nanni_n4_65` to `equipment.json` (`system_category: propulsion_and_machinery`, quantity 2, interchangeable).
- Added role (`ISLAND`) + section (`engines`) to `expected.json`.
- Added `rec_nanni_n4_65_added`, `rec_nanni_n4_65_extracted`, and
  `rec_nanni_n4_65_panel_variant_question` to `reconciliation_records.json`.

## Playbook 1 Stage 1 extraction

The operators manual was already cleared/ingested
(`manual_work 9e95df10`, DGBXXT09007C-N4.65-80.pdf). Ran the real Stage 1
extraction:

- `scripts/extract_interaction_profile.py --equipment-id f7cb721c…` →
  `fixtures/pipeline/scratch/nanni_n4_65.json` (+ input / groups / procedures
  / citations). `needs_rextraction` false; heading coverage ~0.78.
- Extracted: start/stop + maintenance/emergency actions; `data_roles` all false;
  `control_surfaces` empty after MasterView few-shot repair drop.
- Review (§1.C) found one true extraction omission vs. the source; added in
  `scripts/promote_nanni_n4_65.py` (§1.D, source-grounded):
  1. primary **Nanni instrument panel** (key or ON/STOP + Start + warning lamps).
- `scripts/promote_nanni_n4_65.py` wrote the profile into `profiles.json`
  (outremer + post_batch_b), archived to `last_green/nanni_n4_65/`, and updated
  the `expected.json` note.

## Graph result

- Role `ISLAND`, section `engines` (`source=lookup`).

## Follow-up — Engines Stage 4 composer

Founding composer + draft/verify (Playbook 2) lands next; freeze tip after
human review.
