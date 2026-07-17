# Equipment classification specification — v4.10

Follow-on to
[`equipment-classification-spec-v4.9.md`](equipment-classification-spec-v4.9.md).

## Stage 4 section input assembly (general)

A section’s input set is computed from the vessel graph (not “assigned
devices only”):

1. **Members** (section assignment) — depth `full`
2. **Platforms** any member runs (`runs_platform`) — depth `full`
3. **Boundary control / monitor targets** — depth `summary`
   - Candidacy: control-path targets/sources that cross the section
     boundary, **or** network-reachable devices that
     `exposes_data_to_network` toward the station
   - Membership: **documented present platform page** or **documented
     member surface** (graph reachability alone is not enough)
4. **Path devices** of those edges (bridges, COIs) — depth `provenance`
   only: never named in body prose; available to troubleshooting
   provenance maps
5. **Flags** on anything above — existing `reader_relevance` rules apply;
   depth is a per-contributor attribute respected by composition

Persist the computed input set beside the draft as `inputs.json` for review.

**Principle:** graph reachability establishes *candidacy*; documented
visibility establishes *membership* (see `PRINCIPLES.md` §9).

### Leaf / subsection regression

When a subsection restricts members (e.g. Solar MPPTs via `member_keys`),
the closed input set must equal that assignment-only set if those members
introduce no platforms or boundary paths.

### Controls fixture (Outremer / Supernova)

| Depth | Keys |
|-------|------|
| full | `czone_touch_7`, `czone_2_0` |
| summary | `mass_combi_pro_*` via Inverter Charger page; `mli_ultra_*` via Monitoring page |
| provenance | `coi`, `masterbus_bridge_interface` |
| excluded from summary | `alpha_pro_iii_*` — reachable but not on a documented present page/surface; config-layer evidence may later admit them |

## New Know section: `controls`

Catalog id `controls`, UI label **Controls and Monitoring**. Touch / CZone
station home moves here from Electrical; distribution / bridges remain on
Electrical.

## Standing policy — ship-with-honest-gaps

Sections render from available sources. Unsourced config layers
(`config_unsourced`) produce a clearly framed boat-specific **placeholder**
that upgrades when the source arrives. They must **never** block the
section. Default for all vessels.

## Controls composition pilot

Same Solar-era voice rules (task grouping, absence / `context_shaping`,
vocabulary lint, one-parenthetical, confidence-through-phrasing,
`planted_expectation` exception).

Content layers:

- Platform pages present on this boat; Modes / Control / Monitoring / Alarms
  / Inverter Charger behaviours that are sourced
- Gated-off pages (AC Mains, Climate): `context_shaping` — not rendered as
  “not fitted”; **one** planted-expectation orientation sentence in
  troubleshooting is permitted
- Control/monitor summary of Combi and battery monitoring with xrefs to home
  sections
- Config placeholder for Modes / circuits / Favourites
- iPad/app alternate host: one sentence if the wireless path is confirmed on
  inventory; otherwise `context_shaping` only

## Evaluation criteria (continued)

Retained Solar (i)–(xix).

**Added:**

| Id | Check |
|----|-------|
| **(xx)** | Computed input set matches fixture |
| **(xxi)** | Summary-depth contributors stay summary (no home-section manual restatement) |
| **(xxii)** | Config placeholder present and clearly boat-upgradeable |

## Revision history

| Ver | Notes |
|-----|-------|
| **4.10** | Section input assembly + depths; controls Know chapter; ship-with-honest-gaps; Controls pilot; criteria xx–xxii; candidacy vs membership |
| 4.9 | Solar v4 template; context_shaping; reader voice; criteria iv′/vi′/ix′ + xi–xix |
| 4.8 | observation/inference; evidence_unattached; Solar v3 freeze |
