# Equipment classification specification — v4.18

Follow-on to
[`equipment-classification-spec-v4.17.md`](equipment-classification-spec-v4.17.md).

## Provenance-leak vocabulary (extends xxxiv)

Guest prose must not carry **provenance / evidence-class** tokens. Confidence
belongs in phrasing (`about`, ranges); source class stays in the provenance
map (v4.9 confidence-via-phrasing).

Banned in guest-facing draft (non-exhaustive; add founding hits as found):

| Banned | Prefer |
|--------|--------|
| `surveyed` | plain quantity (`solar capacity is about …`) |
| `attested` | omit; cite in provenance only |
| `per inspection` | omit |
| `owner-survey` / `survey estimate` | omit (already Solar xvii) |
| `protective status` | owner language (v4.15 founding) |

Lint: `lint_internal_vocabulary` in `guide_composition_rules.py` (global
**xxxiv**). Solar `lint_source_citations_in_prose` (xvii) mirrors the same
tokens for defense in depth.

## Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| v4.9 / Solar **(xvii)** confidence via phrasing | Bare `surveyed` was not matched | Compatible — extend both global vocab and Solar citation patterns. |
| v4.15 **xxxiv** vocabulary | Same criterion | Extended banned list; no new criterion number. |
| PRINCIPLES attested/inferred/unconfirmed split | Pipeline metadata | Unchanged — those words remain valid in provenance / reconciliation, not guest prose. |

## Carry-forward fact queries (unresolved until dispositioned)

| ID | Status after this tip |
|----|------------------------|
| `silentwind_brake_occasion` | Still open — no new sources this round |
| `combi_ac_input_limit_occasion` | Re-checked Combi / Power Sharing evidence; still open (see missing note on queue row) |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.18** | Provenance-leak tokens in global vocabulary lint; Combi occasion source re-check |
| → | See [`equipment-classification-spec-v4.20.md`](equipment-classification-spec-v4.20.md) for wisdom non-restatement |
