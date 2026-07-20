# Equipment classification specification — v4.32

Follow-on to
[`equipment-classification-spec-v4.31.md`](equipment-classification-spec-v4.31.md).

## Electrical Panel operator-voice refinements (founding review)

Human review of Electrical v4.31. Elevates composition rules so the
chapter teaches **purpose and operator behavior** before hardware lists.
Frozen Solar / Batteries / Controls already satisfy most of these via
v4.9–v4.16; Electrical was the founding miss.

### Rules

1. **Function-first capability (lxii).** Open with what the system does for
   the boat (isolate / protect / distribute), not a parts inventory.
   Hardware names follow purpose in the same breath or the next sentence.
2. **Operator questions.** Prefer answering: what it does; when to interact;
   what to leave alone in normal use; what to check on a fault. Placement
   only when sourced and operationally useful — never invent locations.
3. **Normal before exceptional.** Use the spine: `how_it_works` /
   `adjusting` = normal leave-alone + occasional isolate; `troubleshooting`
   = fault checks. Do **not** invent markdown “Normal operation” /
   “If a fault occurs” subheads (frozen sections have none).
4. **Gloss unfamiliar terms once (lxiii).** On first use, briefly explain
   Class-T fuse, isolation switch, and busbar in owner English; then use
   the canonical term. One paren max still holds — prefer em-dash or
   clause gloss over a second parenthetical.
5. **Plain English.** Prefer “cables from the house battery bank” / “main
   power distribution point” over “bank feeds” / “distribution node” unless
   the short term was already glossed.
6. **Manufacturer secondary.** Role/function first; manufacturer + model in
   parentheses on first use only (v4.9 xii — enforced for Electrical).
7. **No guest “Installed equipment” dump.** Specs stay in first-use parens
   and the provenance map. A separate inventory list would collide with
   frozen Stage 4 capability style — rejected.
8. **Station control path once.** CZone touchscreen / day-to-day switching
   is stated once, then xref Controls — do not re-teach Modes/circuits.
9. **Xref, don’t duplicate.** BMS reset and bank/charge depth → Batteries
   only (already v4.14/v4.31).
10. **Canonical terms.** Prefer: house battery bank; battery isolation
    switch; Class-T fuse; CZone touchscreen; DC distribution busbar.
11. **One idea per paragraph.** Short paragraphs; no hardware laundry lists
    in continuous prose.
12. **Why it matters (one sentence).** Bridges and similar path devices get
    one operational-significance clause when sourced — do not invent
    display paths (e.g. “battery status on the touchscreen”) without
    vessel evidence.

### Collision notes

| Feedback / existing | Resolution |
|---------------------|------------|
| “Installed equipment” list (#7) | **Rejected** — conflicts with frozen Solar/Batteries/Controls capability style and role-first policy |
| Explicit “Normal operation” headings (#3) | **Rejected as headings** — spine slots already encode normal→fault |
| “Where is it?” for ML/Class-T/busbar | **Queued fact query** — no vessel location facts beyond rotary “on-deck” |
| Bridge “shows battery status on touchscreen” | **Rejected as inventing** — keep network exchange purpose only |
| v4.9 role-first / same-breath | Compatible — Electrical now complies |
| Frozen regressions | Must stay green; no global spine change |

### Evaluation additions (Electrical)

| # | Check |
|---|--------|
| **(lxii)** | Capability opens with system function before hardware enumeration |
| **(lxiii)** | Class-T / isolation / busbar glossed on first use |
| **(lxiv)** | Touchscreen / station control mentioned at most once (then Controls xref) |
| **(lxv)** | No guest inventory / “Installed equipment” block |
| **(lxvi)** | Canonical terms used; manufacturer only in first-use paren |

Harness: `verify_electrical_section_v4.py` (v4.32).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.32** | Electrical operator-voice review: function-first, gloss-once, plain English, no inventory dump; lxii–lxvi |
| 4.31 | Electrical Stage 4 composer; lvi–lxi |
| 4.30 | Controls frozen; Batteries freeze reaffirmed |
