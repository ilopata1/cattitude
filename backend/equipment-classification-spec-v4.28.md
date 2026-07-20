# Equipment classification specification — v4.28

Follow-on to
[`equipment-classification-spec-v4.27.md`](equipment-classification-spec-v4.27.md).

## Self-evidencing gated requires (li)

Platform `ui_pages[].appears_if_gate.verbatim` expands into
`requires_devices[].gate_verbatim`. Those requires were still flagged
`evidence_incomplete` (five on CZone 2.0 ACMI / Inverter-Charger / Climate),
even though the gate sentence is already the manual evidence.

### Rule

1. `requires_devices` entries with non-empty `gate_verbatim` are
   **self-evidencing** — they do not require a separate LLM evidence row for
   completeness (`missing_priority_evidence_paths` skips them).
2. At platform expand / merge (and on validate), auto-derive evidence rows
   from `gate_verbatim` (`derive_gate_verbatim_evidence`) so the evidence list
   still documents the gate when the cap allows.
3. Ordinary requires without `gate_verbatim` still need evidence as before.

### Founding fixture

`fixtures/pipeline/scratch/czone_2_0.json` — five gated requires (ACMI,
Mastervolt charger/inverter alts, Climate). After expand/validate: no
`evidence_incomplete` on those paths; `needs_rextraction` not forced by them.

Verify: `scripts/verify_gate_verbatim_self_evidence.py`

### Collision notes

| Existing | This tip | Resolution |
|----------|----------|------------|
| Evidence priority (a) each requires | Gate requires already cited | Skip + optional derive |
| Evidence cap 8 | Five gates can crowd OA evidence | `prioritize_evidence` keeps requires first |
| Zeus MFD (no gate requires) | Unaffected | Orthogonal |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.28** | li: gate_verbatim self-evidencing requires + derived evidence |
| 4.27 | l: pre-merge evidence index rewrite + support mismatch lint |
| 4.26 | xlix: data_roles controllable_from_network polarity |
| 4.25 | xlviii: grounded networks.speaks / bridges |
| 4.24 | xlvii: other-variant procedure scope |
