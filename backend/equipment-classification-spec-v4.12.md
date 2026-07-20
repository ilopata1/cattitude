# Equipment classification specification — v4.12

Follow-on to
[`equipment-classification-spec-v4.11.md`](equipment-classification-spec-v4.11.md).

## Source-class taxonomy: builder documentation vs machine artifacts

| Class | Tier | Layer | How it is ingested |
|-------|------|-------|--------------------|
| `operators_manual` / `installation_manual` | 1–3 | catalog | Existing cleared manuals (vendor PDFs) |
| `device_configuration` | **4** | config | **Vendor machine artifacts** only (e.g. CZone `.zcf`). Format-specific parsers allowed. |
| `channel_map` | **4** | config | **Builder documentation** — human-readable shadow of the switching / circuit config (owner's-manual channel tables, builder COI maps). |
| `owner_screen_walkthrough` | **5** | config | Live UI capture when no machine config is available |

### Builder documentation (unbounded format)

Builder packs (owner's manuals, yard schedules, custom bureau sheets) have
**no stable machine layout**. They are handled **only** via adjudicated
extraction against fixed schemas — never per-builder parsers.

- Founding fixture: Outremer 55N60 owner's manual p46 **"C-ZONE CHANELS"**
  (OUT55N60, VERSION Offshore / MFS Custom : Bureau Lit, DATE/VERSION
  **05/05/2026 Ind C**) → vessel_artifact subclass `channel_map`.
- Target schema: `channel_entries[]` + `device_locations[]`
  (`channel_map_schema.py`).
- Facts are not committed until a human adjudicates the parsed table against
  the PDF (column-shift is the highest reader-visible error class).
- **Empty-row integrity (extraction rule):** blank Fonction rows must still
  emit a `channel_entry` with `empty_row: true`. Skipping blanks shifts later
  names onto earlier refs (founding defect class). Slot-forced REPERE lists +
  sequence-gap checks belong in the extract harness.
- **Not an extraction rule:** which pins are blank on a given sheet is
  vessel-/revision-specific. Record those only as adjudicated facts for that
  artifact — never as “COI3 high-current O1–O3 are usually empty” harness logic.

Format-specific parsers remain reserved for vendor machine artifacts
(`.zcf`, etc.).

### `channel_map` vessel_artifact

| Field | Role |
|-------|------|
| `source_class` | `channel_map` |
| `tier` | 4 (config-layer) |
| Citation | `source_doc`, `page`, `revision` / `date` |
| `supersedes_where_conflicting` | Toward older schematics / DC folios when the map revision postdates them (founding: Ind C 05/05/2026 vs 2023-era DC folios) |

A channel existing on the map is **not** proof the option is fitted.
`option_flag` `OPT` / `CUS` channels assert as fitted only when corroborated by
inventory or other sources; otherwise they are `context_shaping`.

### Config gap split (after adjudicated commit)

| Was under `config_unsourced` | After channel_map commit |
|------------------------------|--------------------------|
| Circuit / monitoring inventory | **Sourced** from `channel_map` |
| Modes / favourites / alarm config | Remains **unsourced** (`.zcf` or screen walkthrough) |

### Evaluation additions (global numbering continues)

| # | Criterion |
|---|-----------|
| **(xxiii)** | Every rendered circuit name traces to an adjudicated `channel_entry` |
| **(xxiv)** | No uncorroborated OPT/CUS channel is asserted as fitted |
| **(xxv)** | Modes / favourites gap still explicitly represented (placeholder or planted-expectation sentence) |

(User brief labeled these xiv–xvi; they continue after Solar/Controls xi–xxii.)

## Revision history

| Ver | Notes |
|-----|-------|
| **4.12** | `channel_map` source class; builder-doc adjudicated extract vs machine parsers; founding Outremer Ind C fixture; eval xxiii–xxv |
| 4.11 | Global reader voice; style_warnings; `guide_reader_voice.py` |
| 4.10 | Section input assembly; controls; ship-with-honest-gaps; xx–xxii |
| → | See [`equipment-classification-spec-v4.14.md`](equipment-classification-spec-v4.14.md) for Batteries Stage 4 |
