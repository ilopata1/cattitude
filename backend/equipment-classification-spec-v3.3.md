# Equipment classification specification — v3.3

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v3.3** documents OR semantics for multiple `requires_devices` entries that
share the same `needed_for`, and raises the evidence list cap to 1–8 with an
explicit fill priority. Rules apply to **every** equipment model.

---

## Pipeline

| Stage | Name | Who | Scope |
|------:|------|-----|--------|
| 0 | Manual section index / excerpt routing | Heuristics (cheap LLM fallback) | Per manual |
| 1 | Interaction profile extraction | LLM, structured JSON, temp 0 | Per equipment model |
| **1.5** | **Post-extraction validation** | **Pure code** | **Per profile** |
| 2 | System graph + section assignment | Pure code | Per vessel |
| 3 | Tier + section fallback | Small LLM over computed facts | Per vessel |
| 4 | Guide assembly (views) | Templating / code | Per vessel |

Design rule: **the LLM never re-derives anything code has already computed.**
Stage 2 consumes only **resolved** capability values after dependency checks.

---

## Stage 1 — Interaction profile

Vessel-agnostic structured facts: control surfaces, operator actions,
networks, data roles, dependencies, safety role, evidence.

### Schema highlights (v3.3)

- `requires_devices[].needed_for` — **non-empty** path to **any** profile field
  whose value is conditional on that dependency (not only `control_surfaces[N]`).
  Examples: `control_surfaces[0]`, `data_roles.exposes_data_to_network`.
- **OR alternatives:** multiple `requires_devices` entries that share the same
  `needed_for` are alternatives — Stage 2 activates the capability if **any**
  entry is satisfied on the vessel. Within a single `description_verbatim`,
  `" or "` / commas are also alternatives.
- `safety_role` keys (exact): `is_protective_device`, `has_manual_override`,
  `has_emergency_procedure`.
- `evidence[]` — 1–8 objects `{supports_field, manual_section, note}`.
  Fill priority: (a) true `data_roles` + each `requires_devices` entry;
  (b) true `safety_role` fields; (c) representative `operator_actions`
  (at least emergency-context); (d) `control_surfaces`.
  `manual_section` may be a verbatim section title; similarity checks apply
  only to `note`.
- Strict JSON Schema with `additionalProperties: false` on every object
  (enforced in the extraction call when the Azure deployment supports
  `json_schema` / `strict`).

Canonical shape: [`prompts/guide/schemas/interaction_profile.txt`](prompts/guide/schemas/interaction_profile.txt).
Machine schema: `interaction_profile_schema.INTERACTION_PROFILE_JSON_SCHEMA`.

### Extraction rules (summary)

1. Use only provided manual text; never guess.
2. Empty arrays are meaningful.
3. Audience / context from the manual’s framing.
4. Split combined verb phrases into separate actions (one verb, one context).
   **Never remove actions when splitting** — every distinct operator procedure
   in the manual must appear (including shutdown, restart, fault/error-code
   procedures). Prescribed shutdown/restart or an error-code table ⇒
   `has_emergency_procedure: true`.
5. Built-in vs optional surfaces: `optional_accessory`; dependencies via
   `requires_devices` with a real `needed_for` path — never `""`.
6. Ports/protocols that exist on the device go in `networks.speaks` even when
   useful only with another product; express dependency with `requires_devices`,
   not by omitting the speak or zeroing the capability.
7–8. Profile the requested model only; ignore accessories that apply only to
   other variants.
9. Evidence: short paraphrases (+ section title) naming the field supported.
   Prefer coverage across consequential fields, not multiple rows for one field.
10–11. Optional protection/supply hints; exact `safety_role` keys only.

### Calibration examples (additions in v3.1)

**H — Conditional network capability**

> “Connect the unit's VE.Direct port to a GX device to monitor it remotely via VRM.”

Expected: `speaks` includes VE.Direct (wired); `exposes_data_to_network: true`;
`requires_devices` → `{description_verbatim: "GX device",
needed_for: "data_roles.exposes_data_to_network"}`.

**I — Accessory for other model variants**

> “BlueSolar models without built-in Bluetooth require the VE.Direct Bluetooth
> Smart Dongle.” (when profiling a SmartSolar with built-in Bluetooth)

Expected: no `requires_devices` entry for the dongle; no surface change.

**J — Orderly shutdown is not emergency**

> “To shut down the charger for service or storage: disconnect the PV supply,
> then the battery supply.”

Expected: context **situational** (or maintenance), **not** emergency.
Fault response (error codes, protective disconnect recovery) is emergency;
prescribed service/storage shutdown is not.

Evidence rule (v3.2+): prefer coverage via the v3.3 priority list (cap 1–8);
do not invent additional mandatory evidence rules beyond that priority.

Full prompt: [`prompts/guide/llm/extract_interaction_profile.txt`](prompts/guide/llm/extract_interaction_profile.txt).

---

## Stage 1.5 — Post-extraction validator

Module: `interaction_profile_validate.py`.

Runs on **every** profile between Stage 1 and Stage 2. Annotates:

```json
{
  "validation_flags": [
    {"flag": "...", "severity": "blocking|warning", "detail": "...", "field_path": "..."}
  ],
  "needs_rextraction": true
}
```

### Checks

| Defect | Flag | Severity |
|--------|------|----------|
| Empty / unresolved `needed_for` | `dangling_needed_for` | blocking |
| `needed_for` → surface with `optional_accessory: false` | `contradiction_builtin_requires_accessory` | blocking |
| Property not in schema | `unknown_field` | blocking |
| Evidence not `{supports_field, manual_section, note}` | `evidence_shape_invalid` | blocking |
| `evidence[].note` too similar to excerpts (length-gated) or note too long | `evidence_verbatim` | warning |

**Evidence similarity scope (v3.2):** `evidence_verbatim` runs on `note` only —
never on `manual_section` (titles are expected to be verbatim). Similarity is
skipped when the note has fewer than 10 words **and** fewer than 60 characters
(short factual notes trivially overlap source).

`needs_rextraction` is true if any **blocking** flag is present. Blocking
profiles must not enter Stage 2 (re-extraction queue).

Regression samples:
- Defective (asserts flags fire): `tests/fixtures/stage15_defective_extraction.json`
- Corrected SmartSolar (asserts **zero** `evidence_verbatim`, restored
  shutdown/restart/error-code actions, `has_emergency_procedure: true`):
  `tests/fixtures/smartsolar_corrected_extraction.json`

Via `scripts/verify_interaction_profile_validate.py`.

---

## Stage 2 — System graph (dependency resolution)

Module: `system_graph.py` (`resolve_dependencies`).

For each `requires_devices` entry:

1. `satisfied` ← fuzzy match against **other** vessel line items (never self).
   Within one `description_verbatim`, alternatives may be separated by `` or ``
   or commas (e.g. `"GX device or GlobalLink 520"`).
   **Multiple entries sharing the same `needed_for` are OR alternatives** —
   the capability is active if **any** entry is satisfied. Stage 2 forces a
   boolean capability `false` only when **no** alternative for that path is
   satisfied. `unresolved_dependency` is likewise per-`needed_for` path (OR).
2. If `needed_for` names an optional control surface → set `active` from
   OR satisfaction (existing accessory behaviour).
3. If `needed_for` names a **boolean** field (e.g. `data_roles.*`) and **no**
   alternative is satisfied → force that field to `false`.
4. Emit `unresolved_dependency` when a `needed_for` path has zero satisfied
   alternatives.

HUB / ENDPOINT / ISLAND / … classification and control paths must read
**resolved** `data_roles` and surface `active` flags — never raw extraction.

Conditional-capability regression:
`tests/fixtures/conditional_capability_*.json` (covered by
`scripts/verify_system_graph.py`). OR-alternative unit checks: separate
`"GX device"` and `"GlobalLink 520"` entries → same `needed_for`, vs
`"Victron Cerbo GX"` (active/ENDPOINT) and vs neither (inactive/ISLAND + flag).

---

## Section / guide ids

Guide sections remain existing Know `SYSTEM_IDS` (`electrical`, `batteries`,
…). Do not invent a parallel taxonomy.

---

## Revision history

| Ver | Notes |
|-----|-------|
| 3.0 | Interaction profiles + deterministic vessel graph (spike) |
| 3.1 | Stage 1.5 validator; arbitrary `needed_for` paths; calibration H/I; evidence object shape; `safety_role` key rename |
| 3.2 | Evidence similarity note-only + length gate; never-remove-actions; `or`/comma in one description; calibration J; fixture POLICY/CODEOWNERS |
| 3.3 | Multi-entry `requires_devices` OR by shared `needed_for`; evidence cap 1–8 with fill priority (a–d) |
