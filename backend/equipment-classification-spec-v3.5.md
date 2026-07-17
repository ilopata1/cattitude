# Equipment classification specification — v3.5

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v3.5** adds mechanical auto-repair for builtin/requires contradictions, a
narrow re-extraction policy (max 1 differing retry), and a harness rule that
SKIP of golden comparison fails the run. Rules apply to **every** equipment
model.

---

## Pipeline

| Stage | Name | Who | Scope |
|------:|------|-----|--------|
| 0 | Manual section index / excerpt routing | Heuristics (cheap LLM fallback) | Per manual |
| 1 | Interaction profile extraction | LLM, structured JSON, temp 0 | Per equipment model |
| **1.5** | **Post-extraction validation (+ auto-repair + optional evidence repair)** | **Pure code** (+ one LLM evidence repair) | **Per profile** |
| **1.6** | **Derived operator actions** | **Pure code** | **Per profile** |
| 2 | System graph + section assignment | Pure code | Per vessel |
| 3 | Tier + section fallback | Small LLM over computed facts | Per vessel |
| 4 | Guide assembly (views) | Templating / code | Per vessel |

**Extract ordering:** Stage 1 → 1.5 validate (incl. contradiction auto-repair) →
optional evidence repair → 1.6 derive → final validate → if
`needs_rextraction`, **one** retry with a targeted correction instruction
(must differ from the first temp-0 call) → else human review.

Design rule: **the LLM never re-derives anything code has already computed.**

---

## Auto-repair vs re-extraction (v3.5)

| Flag | Remedy | `needs_rextraction`? |
|------|--------|----------------------|
| `contradiction_builtin_requires_accessory` | **Auto-repair:** drop the `requires_devices` entry; leave control surface untouched; warning flag with `repaired: dropped_entry`; original entry in `repairs[]` | **No** |
| `evidence_incomplete` | One-shot LLM repair for missing evidence on true `data_roles`, each `requires_devices`, and true `safety_role` fields; re-validate; remaining flag for human review | **No** |
| `evidence_verbatim` | Warning only | No |
| `fewshot_leakage` | Re-extract (max 1) with targeted instruction naming the leaked content; then human review | **Yes** |
| `dangling_needed_for` (empty / unresolvable) | Re-extract (max 1) with targeted instruction; then human review | **Yes** |
| `unknown_field` / `evidence_shape_invalid` | Surface for human review (no mechanical repair; not a temp-0-identical re-extract loop) | **No** |

Identical temp-0 re-extracts are forbidden: the retry prompt **must** append a
correction block listing the flagged content. Cap: **1** retry.

---

## Stage 1 — Interaction profile

Vessel-agnostic structured facts. Schema highlights unchanged from v3.4
(OR `requires_devices`, evidence priority a–d, strict JSON Schema).
Calibration isolation preamble required (examples concern OTHER devices).

Canonical shape: [`prompts/guide/schemas/interaction_profile.txt`](prompts/guide/schemas/interaction_profile.txt).

---

## Stage 1.5 — Post-extraction validator

Module: `interaction_profile_validate.py`.

Annotates:

```json
{
  "validation_flags": [
    {"flag": "...", "severity": "blocking|warning", "detail": "...", "field_path": "..."}
  ],
  "repairs": [
    {
      "repair": "dropped_entry",
      "flag": "contradiction_builtin_requires_accessory",
      "field_path": "requires_devices[N].needed_for",
      "original_entry": {"description_verbatim": "...", "needed_for": "..."}
    }
  ],
  "needs_rextraction": false
}
```

### Contradiction auto-repair

When `requires_devices[].needed_for` targets a control surface with
`optional_accessory: false`: drop that entry, append `repairs[]`, emit the
flag at **warning** severity with detail `repaired: dropped_entry`. Legitimate
entries (`optional_accessory: true` surfaces, `data_roles.*` paths) are
unaffected. Surfaces are never modified.

Regression: `scripts/verify_interaction_profile_autorepair.py`.

---

## Stage 1.6 — Derived actions

Unchanged from v3.4: when `has_emergency_procedure` and evidence
`manual_section` matches `/error|fault|alarm|troubleshoot/i`, append
`consult error codes and alarms` (`source: derived`) unless a similar action
already exists.

---

## Harness / golden comparison (v3.5)

`scripts/compare_smartsolar_scratch.py`:

- Compares the **post-validation** live scratch to golden asserts.
- If `needs_rextraction` is true: print **`BLOCKED - golden not compared`** and
  exit **nonzero** (exit 3). `OK` is reserved for runs where every assertion
  executed.
- Offline suite: `.\pipeline_verify.ps1 -Regression`.

---

## Stage 2 — System graph

Unchanged from v3.3/v3.4 (OR alternatives by shared `needed_for`).

---

## Revision history

| Ver | Notes |
|-----|-------|
| 3.0 | Interaction profiles + deterministic vessel graph (spike) |
| 3.1 | Stage 1.5 validator; arbitrary `needed_for` paths; calibration H/I |
| 3.2 | Evidence note-only similarity; never-remove-actions; calibration J |
| 3.3 | Multi-entry `requires_devices` OR; evidence cap 1–8 priority (a–d) |
| 3.4 | Stage 1.6 derived actions; fewshot/evidence_incomplete; repair pass |
| 3.5 | Contradiction auto-repair + `repairs[]`; narrow `needs_rextraction`; retry cap 1 with differing instruction; SKIP-fails-run harness |
