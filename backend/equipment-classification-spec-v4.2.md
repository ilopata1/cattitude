# Equipment classification specification — v4.2

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v4.2** adds a **procedure inventory** recall check (reference-free): inventoriable
procedures and enumerated alternatives from routed excerpts must map to
extracted|derived profile rows or an explicit `not_operator_relevant`
classification. Unaccounted items emit warning flags. Targeted map-retry
**repair is implemented and fixture-tested but disabled**
(`PROCEDURE_REPAIR_ENABLED = False`) until inventory lists are adjudicated.

Inherits union-with-provenance voting + `needed_for` normalize from
[`equipment-classification-spec-v4.1.md`](equipment-classification-spec-v4.1.md).

### Addendum — accounting trail (audit)

Every inventory item (including structure-filtered drops) gets a trail row in
`<device>_procedures.json` → `reconciliation.accounting_trail[]`:

| `disposition` | Fields |
|---------------|--------|
| `matched` | `matched_to: {field_path, text, similarity}` (or `part_matches` for OR-alts) |
| `classified` | `auto_classified`, `rule` (e.g. `rule:installer:alarm severities`) |
| `filtered` | `filter` (e.g. `filter:bare_chapter`, `filter:no_imperative_verb`) |
| `unaccounted` | no match — emits warning flag |

**Operator-mode protect:** titles matching Gen-/Mains support / Power sharing /
Power assist **cannot** be installer-classified or structure-filtered; if the
profile lacks a matching action they stay `unaccounted` (true positives).

**Per-alternative matching:** each OR-alternative must match a *single-product*
`requires_devices` or `control_surfaces` row. Combined labels like
`SmartRemote or EasyView 5` do **not** satisfy the parts; family fuzzy to a
different product (MasterView) is rejected.

Matcher for procedures uses verb–object token agreement and a higher similarity
threshold so Gen-/Mains support cannot absorb into unrelated AC-limit actions.

---

## Stage 1.6 derived actions (audit)

| Rule | Trigger (evidence-shaped) | Action text | `derived_from` |
|------|---------------------------|-------------|----------------|
| Consult error codes | `safety_role.has_emergency_procedure` **and** `evidence[N]` section/note matches `error\|fault\|alarm\|troubleshoot` (or supports `has_emergency_procedure`) | `consult error codes and alarms` | `evidence[N]` |
| Shutdown / restart | Excerpt or evidence text matches titled **`shutdown and restart procedure`** **and** at least one `evidence[]` row exists | `shutdown the device` / `restart the device` (structural “the device”, not brand/golden wording) | `evidence[N]` preferring section/note match |

No rule is golden-expectation-shaped. Ungrounded derived items → blocking
`derived_ungrounded`. Optional-surface requires + DC-fuse supply fills remain
mechanical fills (v3.7 table), not Stage 1.6 action derives.

---

## Procedure inventory (recall side)

### 2a — Extract inventory (deterministic first)

Per routed excerpt / map group:

1. Numbered section titles (`5.3. Updating firmware`)
2. Imperative / gerund headings (`Setting the Sunset action`, `Disabling and enabling Bluetooth`)
3. Step-block first lines when procedure verbs are present
4. Enumerated alternatives: `GX device or GlobalLink 520`-style noun phrases

Cheap LLM fallback per group **only** when heuristics find zero procedures for
a group that has text (optional; wired when a callback is provided).

Persist as `<device>_procedures.json` beside the extract.

### 2b — Reconcile (code)

Every inventory procedure → fuzzy-match an `operator_actions` row
(extracted|derived) **or** `classification: not_operator_relevant:*`
(spec/front-matter / installer-only). Else → `procedure_unaccounted`
(warning) naming `excerpt_ref` (+ group).

Every enumerated alternative part → must appear in `requires_devices`;
else → `alternative_unaccounted` listing missing parts (re-pins GlobalLink).

### 2c — Targeted repair (gated off)

Trailer pattern:

> these excerpts contain procedures not yet profiled: \<headings\>; extract
> them or state why they are not operator actions.

Plus an alternatives trailer when OR-parts are missing. One scoped map call;
merge via union + grounding. **Default: disabled** (`PROCEDURE_REPAIR_ENABLED`).

---

## Fixtures / harness

- `tests/fixtures/smartsolar_procedure_inventory.json` — pins firmware /
  Bluetooth / sunset + GlobalLink alternative in synthetic inventory
- `scripts/verify_interaction_profile_procedures.py` — flags-only + gated
  repair fixture
- `scripts/run_procedure_inventory.py` — regenerate live last_green /
  scratch inventories for adjudication

---

## Revision history

| Ver | Notes |
|-----|-------|
| 4.1 | Union-with-provenance; needed_for speaks→data_roles |
| **4.2** | Procedure inventory + reconcile flags; repair built but gated off |
