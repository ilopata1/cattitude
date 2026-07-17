# Equipment classification specification — v4.8

Follow-on to
[`equipment-classification-spec-v4.7.md`](equipment-classification-spec-v4.7.md).

## Human-entered vessel facts: observation vs inference

Owner / inspector entered facts are not free-form notes. Each row declares:

| Field | Purpose |
|-------|---------|
| `kind` | `observation` (what was seen) or `entered_inference` (conclusion) |
| `provenance_tier` | e.g. `physical_inspection`, `walkthrough`, `owner_survey` |
| `evidence_refs[]` | Artifact ids in the vessel artifact store (photos/docs) |
| `depends_on[]` | For entered_inference: observation fact ids it rests on |

**Rule:** do not mix raw observation and yield/behavior conclusions in one
string. Example split:

- observation: boom geometry can cast shade across the coachroof array (photo)
- entered_inference: expect lower coachroof contribution when shaded

## Evidence attachment (`evidence_unattached`)

Inspection-tier facts (`physical_inspection`, `walkthrough`, …) **must**
reference resolvable artifacts in the vessel artifact store. Missing or
dangling refs → warning flag `evidence_unattached`.

Composition:

- Facts with `evidence_unattached` are **reduced-confidence**: still
  renderable as caveats/observations when needed.
- `composed_inference` contributing facts must **all** have attached
  evidence or document citations (`owner_survey`, schematic, …). Building
  an inference on an unattached inspection fact is a hard composition error.

Founding fixture: `tests/fixtures/solar_shading_evidence_unattached.json`
(dangling “inspection photos” shading fact). Retrofit: deck photos
`photo_davit_array` + `photo_coachroof_boom` under
`fixtures/pipeline/outremer/artifacts/`.

## Stage 4 section template (Solar v3 — frozen for reuse)

Order: **identity → daily use → operational guidance → caveats → reference**.

- Actions grouped by context (routine / situational / fault), ≤2 sentences
  per group; no per-action enumeration; no filler (“when needed”).
- Flag `reader_relevance`: `operator_caveat` | `scope_limit` | `internal`
  (internal never rendered).
- Vocabulary lint bans device keys, role enums, pipeline terms.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.8** | observation/inference split; evidence_unattached; Solar v3 template freeze |
| 4.7 | ui_pages schema; Climate gate ≠ AC-present; V1.1 ingest |
| 4.6 | platform entity; runs_platform; flag split; .zcf |
