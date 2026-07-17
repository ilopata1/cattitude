# Equipment classification specification — v4.5

Follow-on to
[`equipment-classification-spec-v4.4.md`](equipment-classification-spec-v4.4.md).

## Source classes (content provenance)

| Class | Tier | Notes |
|-------|------|-------|
| `operators_manual` / `installation_manual` | 1–3 | Existing cleared manuals |
| `device_configuration` | **4** | Machine-readable device config where obtainable (e.g. CZone configuration file). Defines day-to-day screens, circuits, modes not printed in the PDF. |
| `owner_screen_walkthrough` | **5** | Owner / surveyor capture of live UI when no config file is available |

Guide sections for devices flagged ``config_defined_operation`` are **gated** on
either a tier-4 `device_configuration` artifact or a tier-5 owner walkthrough.
Until one arrives, Stage 2 emits ``hub_operation_unsourced`` on the vessel.

## Profile genres (multi-select)

``genres: string[]`` — document coverage, not Stage 2 role:

`installation` | `commissioning` | `operation` | `monitoring` | `maintenance` |
`reference` | `combined`

Validator (`interaction_profile_genre`):

- ``genre_content_mismatch`` — declared genres disagree with extracted actions
- ``config_defined_operation`` — station UI present but manual is setup-only
  (replaces planned ``profile_genre_incomplete``)

Founding fixture: **CZone Touch 7** (Outremer 55N60 hub).

## Touch 7 / Touch 10 cross-model

Owner review (Touch 7 PDF ~23pp, ~4pp “operation”, all first-setup): operational
content is **config-defined**, not undocumented-by-accident.

- Material-stop **closed** with rationale: *document depth / config-defined
  operation, not device divergence*
- Diff-vs-Touch10 disposition: ``document_depth_difference``
- Touch 10 user-guide extract remains archived as the family’s
  **operational-shape reference** (`scratch/czone_touch_10*`)
- Vessel hub uses catalog extract + **vessel_artifact** facts (CZone membership,
  `displays_data_from_other_devices=true`) citing folio 2E + system topology —
  not invented from the manual

## Vessel artifact facts

Stage 2 `apply_vessel_artifact_facts` overlays commissioning / topology
assertions onto catalog profiles before role classification. Provenance on
speaks: `commissioning_artifact`.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.5** | device_configuration source class; genres; config_defined_operation; hub_operation_unsourced; Touch 7 founding fixture |
| 4.4a | COI MasterBus bridge fill; wiring installer classify |
| 4.4 | Deterministic fill guard; options collapse |
