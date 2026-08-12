# Design note — equipment class vs vessel plant role

**Recorded:** 2026-07-28 (after Phase 4 W4 human read of `sister-test`)  
**Decisions locked:** 2026-07-31 (hybrid roles; thin admin UI; big-bang shim migration)  
**Status:** big-bang + thin admin landed 2026-07-31 — `GUEST_*` maps empty; Stage 4 plant admin at `/admin/vessels/{id}/stage4-plant`  
**Parent plan:** [`guide-stage4-integration-plan.md`](guide-stage4-integration-plan.md)
(Phase 4 / Decision 4a).

---

## Non-negotiable

Once mature, **adding an equipment registry item must not require composer code
changes.** Classification and guest-facing semantics live in data (registry /
interaction profile / vessel substrate / vessel facts), not in per-model
dictionaries in Python.

The tables in `guide_composer_device.py`:

- `GUEST_LABEL_BY_CATALOG`
- `GUEST_ROLE_BY_CATALOG`
- `GUEST_ROLE_BY_KEY`

are **Outremer freeze shims** — transitional for byte-match — not the target
architecture. **Accepted (2026-07-31):** empty them in one big-bang migration
after seeding equivalent data (Decision C below). Until that PR lands, do not
add new entries for new gear.

---

## Two layers (do not collapse)

| Layer | Question | Example | Where it lives |
|-------|----------|---------|----------------|
| **Equipment class** (model-level) | What kind of device is this? | `solar_charge_controller`, `lithium_battery`, `watermaker` | Interaction profile (`plant_class`); same for every boat that fits that model |
| **Plant role / nickname** (vessel-level) | How is *this install* used / named on this boat? | `house_bank`; “the davit array controller” | Vessel substrate (`guest_role` override and/or structured facts) — **not** the manual alone |

A battery can be the house bank on one vessel and an engine/start bank on
another. Extraction from the MLI manual cannot know that. **Class ≠ role.**

---

## Locked decisions (2026-07-31)

### Decision A — Guest nicknames: **hybrid** (derive + store override)

**Accepted.**

1. **Derive** a default guest phrase at Generate time from `plant_class` +
   existing plant fields when that is enough:
   - singular/plural ← `quantity`
   - port/starboard ← `side` / place / `instance_label` when present (do not
     invent side from Outremer prose convention alone)
   - future structured facts (e.g. array mount, bank role) → derived phrases
2. **Store** `equipment.guest_role` (vessel substrate row) as an **override**
   when derivation would be wrong or too vague — not a parallel nickname for
   every catalog key by default.
3. **Disallow brand-as-role** as the preferred pattern (e.g. platform nicknamed
   only “CZone”); prefer function phrase or manufacturer/model first-use.
   Existing Controls “CZone” prose may need an explicit override or voice-policy
   exception during migration so byte-match holds.
4. Optional `equipment.guest_label` `{manufacturer, model}` when registry
   strings are too verbose for guest parens (prefer fixing registry long-term).

**Resolution order (composers):**

1. `equipment.guest_role` if set  
2. Derived default from class + qty/side/facts  
3. Legacy `GUEST_*` shims only until big-bang empties them  
4. Else `"the device"` / honest gap

**Implication for vessel setup:** most rows need no nickname field; staff fill
override only when the default reads wrong. Repeating patterns (davit vs
coachroof, house vs start bank) should graduate from free-text overrides into
**structured facts/roles** over time — overrides are the bridge, not the end
state for every pattern.

---

### Decision B — Vessel setup surface: **thin admin UI**

**Accepted.**

Ship a **minimal** staff UI on the vessel equipment / Stage 4 substrate path so
operators can set what composers read without Cursor:

| Field | Surface | Notes |
|-------|---------|--------|
| `plant_class` | Read-only from profile (link to equipment library) | Confirmed at promote/review; not an owner form |
| `guest_role` | Editable optional text on Stage 4 plant row | Override only; empty = derive |
| `guest_label` | Editable optional mfr/model override | Rare; empty = registry / profile device fields |
| Structured facts (array mount, bank role, …) | Later / vessel facts editor as needed | Prefer enums when a pattern repeats |

**Out of thin UI (still deferred):**

- Full admin ↔ Stage 4 **merge** (Phase 4b) — thin UI edits the Stage 4
  substrate (or a clearly labeled Stage 4 overlay), not a fake single inventory
- Owner onboarding UI for plant roles (separate product)
- Phase 6 extract/promote/compose authoring suite
- Founding new composers / tip freezes

**Implication:** staff can fix nicknames and labels on a seeded boat without
the monorepo; engineers still seed substrate and run promote for new models.
Thin UI should not pretend admin `vessel_equipment` and Stage 4 plant are
already one store.

---

### Decision C — Shim retirement: **big-bang migrate**

**Accepted.**

One migration (fixture + seed + code) that:

1. Seeds every current `GUEST_LABEL_BY_CATALOG` / `GUEST_ROLE_BY_CATALOG` /
   `GUEST_ROLE_BY_KEY` entry onto Outremer (and thinned) substrate /
   `plant_class` on profiles as appropriate.
2. Implements hybrid **derive defaults** for classes where Outremer today relies
   on maps that are purely class+qty (e.g. engines, watermaker) so those rows
   need not keep redundant stored roles forever — but storing the current
   string for byte-match in the same PR is allowed.
3. Empties (or deletes) the three `GUEST_*` dicts in
   `guide_composer_device.py`.
4. Keeps Outremer byte-match + `sister-test` / vessel-B smoke green.
5. Re-seeds live Supernova substrate from the updated fixture.

**Not part of the bang:** inventing the full structured role vocab; that can
follow once free-text overrides are the only non-derived path.

**Implication:** short dual-world window; no “Outremer forever shimmed, new
gear data-only” split. Cost is one large fixture/oracle-gated PR instead of
many family spikes.

---

## How class gets onto a profile (avoid end-user forms)

Stage 1 already emits `device.category_freeform` in the **manual’s own words**
(e.g. `"solar MPPT charge controller"`). Keep that rule.

Mapping freeform → closed `plant_class`:

- Module: [`guide_plant_class.py`](guide_plant_class.py) — closed vocab +
  deterministic normalizer.
- Prefer deterministic normalize; optional small classify at **profile promote /
  review** on misses — same posture as Stage 1.5 / Stage 3.
- **No LLM at Stage 4 Generate.**
- High confidence → auto-write `plant_class`; low confidence → staff library
  review — **not** guest/owner inventory forms.
- **Do not** ask once-per-model classify to emit vessel roles (`house_bank`).

---

## Classes implied by frozen composers (locked table)

| `plant_class` | Example Outremer models |
|---------------|-------------------------|
| `solar_charge_controller` | Victron SmartSolar MPPT 150/60, 75/15 |
| `lithium_battery` | Mastervolt MLI Ultra |
| `inverter_charger` | Mastervolt Mass Combi Pro |
| `alternator_regulator` | Mastervolt Alpha Pro III |
| `generator` | Fischer Panda 8000i |
| `propulsion_engine` | Nanni N4.65 |
| `watermaker` | Dessalator Duo |
| `air_conditioner` | Frigomar self-contained BLDC |
| `chartplotter` | B&G Zeus SR |
| `radar` | B&G Halo 20+ |
| `ai_camera` | Sea.AI Watchkeeper |
| `digital_switching_touchscreen` | CZone Touch 7 |
| `digital_switching_platform` | CZone 2.0 |
| `combination_output_interface` | CZone COI |
| `automatic_charging_relay` | Blue Sea ACR |
| `battery_switch` | rotary battery switch |
| `class_t_fuse` | Blue Sea Class T |
| `busbar` | ProInstaller busbar |
| `masterbus_bridge` | MasterBus Bridge Interface |
| `masterbus_usb` | MasterBus USB Interface |
| `blackwater_discharge_valve` | blackwater tank discharge valve |
| `electric_toilet` | Tecma Compass Eco |
| `wind_generator` | Silentwind Hybrid 1000 |

---

## What already exists vs what lands next

### Existing

- Equipment / substrate: `manufacturer`, `model`, `quantity`, `description`,
  `system_category`, `side`, `places`, `instance_label`
- Profile: `device.*`, `control_surfaces`, `operator_actions`, networks,
  `category_freeform`
- Graph: section assignment, topology roles, `assemble_section_inputs`
- Vessel facts: layout, wattage, array observations, UI host facts
- MPPT spike: `plant_class` + `guest_role` / `guest_label` on Victron rows;
  those keys removed from `GUEST_*`

### Queued implementation order

1. ~~**Big-bang data seed**~~ — done 2026-07-31 (`scripts/migrate_guest_shims_to_data.py`;
   `GUEST_*` emptied; derive helper in `guide_composer_device.py`; Outremer
   byte-match + vessel-B green; Supernova re-seeded).
2. ~~**Thin admin UI**~~ — done 2026-07-31 (`/admin/vessels/{id}/stage4-plant`;
   edit `guest_role` / `guest_label`; read-only `plant_class`).
3. **Later** — structured plant-role/facts enums where overrides repeat; Phase
   4b full admin↔plant merge; Phase 6 authoring UI; instance-level nickname
   edits in admin (parent-row only today).

---

## Relationship to Phase 4 decisions

- **Decision 3** (naming from profile/equipment): affirmed; maps are debt.
- **Decision 4** (family via graph/profile predicates): still valid; class
  bindings are the long-term selector.
- **Decision 4a:** this note; decisions A–C locked 2026-07-31.

---

## Explicitly deferred

- Registry ↔ Stage 4 substrate **full merge** (decision 7 / Phase 4b) — thin
  UI does not replace this
- Universal “any OEM stack” composers
- LLM inside `compose_*` / Generate
- Owner onboarding UI for plant roles
- Full structured vessel-role vocabulary (graduates from overrides over time)
