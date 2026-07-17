# Equipment classification specification — v4.3

How Clever Sailor turns manufacturer manuals into per-device interaction
facts, validates them, and builds a vessel system graph. Companion to
[`guide-pipeline-plan.md`](guide-pipeline-plan.md).

**v4.3** **ungates** procedure repair under an **adjudicated-classes-only**
policy: the config gate is on, but map-retry runs only for the six residual
items that survived trail-audited detector tuning (3 SmartSolar + 2 Combi +
1 MLI). Inherits procedure inventory + accounting trails from
[`equipment-classification-spec-v4.2.md`](equipment-classification-spec-v4.2.md).

---

## Repairer ungating policy (adjudicated-classes-only)

`PROCEDURE_REPAIR_ENABLED = True`, scoped by `ADJUDICATED_REPAIR_IDS`:

| Id | Device | Inventory item |
|----|--------|----------------|
| `smartsolar_sunset` | SmartSolar | Setting the Sunset action |
| `smartsolar_firmware` | SmartSolar | Updating firmware |
| `smartsolar_globallink` | SmartSolar | GX device or GlobalLink 520 (missing GlobalLink) |
| `combi_gen_mains` | Mass Combi | Gen-/Mains support |
| `combi_power_sharing` | Mass Combi | Power sharing mode |
| `mli_panel_alts` | MLI Ultra | SmartRemote or EasyView 5 |

**Mechanics**

1. Filter unaccounted → adjudicated set only (noise keeps its flag / trail).
2. One map-retry **per excerpt_ref group**; trailer names heading + `excerpt_ref`
   and embeds adjudication notes.
3. Union + grounding merge of map partials (no whole-profile re-vote against
   narrow group excerpts — that would drop earlier group fills).
4. If the LLM miss leaves the item unmatched: one **deterministic** grounded
   fill from the inventory title / missing alternative, then **flag stands**.
5. Post-hooks: unify MasterView/SmartRemote/EasyView `needed_for`; align
   GlobalLink `needed_for` with the GX sibling (OR semantics).

**Adjudication notes encoded in trailers**

- Combi Gen-/Mains + Power sharing: extract as the manual frames them (mode
  selection/behavior); installer audience OK if text says so; step-form not
  required.
- MLI panels: separate `requires_devices` per alternative; unify `needed_for`
  with MasterView family when presented as alternatives.
- SmartSolar GlobalLink: restore as second alternative to GX (existing OR
  fixtures must keep passing).

---

## Detector-tuning postmortem (zeros must be trail-verified)

v4.2 detector tuning drove residual unaccounted toward **0**, but several
“zeros” were **false**: structure filters / installer auto-classify / combined
OR-surface matches hid true operator gaps. **Accounting trails are mandatory**
before declaring inventory green:

| False zero (pre-adjudication) | Correct disposition |
|------------------------------|---------------------|
| Combi Gen-/Mains, Power sharing | Protected operator-mode → `unaccounted` if no action |
| MLI SmartRemote / EasyView 5 | Per-alternative only (no combined OR label; no MasterView family fuzzy) |
| SmartSolar sunset / firmware / GlobalLink | Genuine extract omissions → repair targets |

**Rule:** residual `counts.unaccounted == 0` is accepted only when every
adjudicated item’s trail row is `matched` (or `classified` with an explicit
rule) — never because it was `filtered` away. Post-repair inventories for the
three last_green devices must show **0/0/0** unaccounted with the six items
**trail-accounted via extraction** (not filtered).

---

## Fixtures / harness

- Goldens updated under `Fixture-Auth: this chat` (sunset + firmware +
  GlobalLink; Gen-/Mains + Power sharing; SmartRemote + EasyView 5).
- `scripts/repair_adjudicated_procedures.py` — offline last_green → scratch
  repair with live Azure map calls.
- `scripts/verify_interaction_profile_procedures.py` — gate on + scope checks.
- Compare harnesses assert the six presence classes.

---

## Revision history

| Ver | Notes |
|-----|-------|
| 4.1 | Union-with-provenance; needed_for speaks→data_roles |
| 4.2 | Procedure inventory + reconcile flags; repair built but gated off |
| **4.3** | Repair ungated for adjudicated classes only; trail-verified zeros |
