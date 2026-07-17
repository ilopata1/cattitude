# Outremer 55N60 — vessel artifact reconciliation report

**Batch:** VESSEL_ARTIFACT RECONCILIATION BATCH (Outremer 55N60) — revised  
**Fixture-Auth:** `Fixture-Auth: chat VESSEL_ARTIFACT RECONCILIATION BATCH (Outremer 55N60) — revised — align graph/fixtures to owner inventory (Balmar removed; Touch 7; Alpha Pro III ×2)`

## Reconciliation records (audit only)

- **rec_balmar_mc624_removed** — Balmar MC-624 previously listed; superseded by Alpha Pro III evidence; owner-removed from inventory.
- **rec_touch10_to_touch7** — CZone Touch 10 previously assumed; folio 2E TAC box shows Touch 7; owner-corrected. Touch 10 extraction artifacts retained in scratch as diff baseline for batch A; exits vessel graph.
- **rec_alpha_pro_iii_added** — Alpha Pro III ×2 added per folios 17/23 + synoptic 2D (MBUS 01/10/11).
  - provenance_split: attested='Alternators 24V/110A rating attested on vessel documents'; inferred='Mastervolt Alpha family inferred from vessel MasterBus context + Alpha naming on synoptic'; unconfirmed="Exact model string 'Alpha Pro III' unconfirmed pending Manufacturer=Mastervolt Model=Alpha Pro III extraction"
- **rec_combi_qty_and_ultra_label** — Combi ×2 per folio 6/4 / owner's manual. Folio 2C 'Ultra' label recorded as outvoted internal inconsistency (treat as Mass Combi Pro).
- **rec_mli_qty** — MLI Ultra ×3 per cover sheet and folios 3A/3B.
- **rec_solar_photo_tier** — Solar = SmartSolar MPPT 150/60-Tr ×1 + 75/15 ×2 (photo tier). Schematic 2D MasterBus-solar claim overruled.
- **rec_masterbus_interfaces_confirmed** — MasterBus Bridge Interface + USB Interface confirmed on vessel documents.

## Installation notes

- ['mass_combi_pro']: Combi physical locations per owner's manual p55 (port/stbd or listed positions). (source=owner's manual p55)
- ['victron_mppt_150_60', 'victron_mppt']: Solar array shading observed in inspection photos — operator monitoring context. (source=inspection photos)

## Quantity / multi-unit raw graph behavior

```json
{
  "as_encoded_device_keys": {
    "mass_combi_pro": {
      "role": "ENDPOINT",
      "quantity": 2
    },
    "mli_ultra": {
      "role": "ENDPOINT",
      "quantity": 3
    },
    "victron_mppt": {
      "role": "ISLAND",
      "quantity": 2
    },
    "victron_mppt_150_60": {
      "role": "ISLAND",
      "quantity": 1
    }
  },
  "note": "Stage 2 build_vessel_graph keys strictly by device_key and ignores quantity \u2014 one node per key. Expanding to per-unit keys yields N independent ENDPOINT/ISLAND nodes sharing the same profile.",
  "expanded_roles_sample": {
    "mass_combi_pro_*": {
      "mass_combi_pro_1": "ENDPOINT",
      "mass_combi_pro_2": "ENDPOINT"
    },
    "mli_ultra_*": {
      "mli_ultra_1": "ENDPOINT",
      "mli_ultra_2": "ENDPOINT",
      "mli_ultra_3": "ENDPOINT"
    },
    "victron_mppt_*": {
      "victron_mppt_1": "ISLAND",
      "victron_mppt_2": "ISLAND"
    }
  }
}
```

## Retired-node check (fixtures + live roles)

OK — `balmar_mc624` / `czone_touch_10` / `czone_system` absent from equipment keys, profile keys, expected roles, and live roles. `czone_touch_10` scratch extracts remain archived outside the vessel graph.

## Vessel graph report (current)

```
== Outremer vessel report (Stage 2 + Stage 3 preview) ==

SOURCES:
  alpha_pro_iii_port: source=stub
  alpha_pro_iii_stbd: source=stub
  busbar: source=stub
  class_t: source=stub
  coi: source=stub
  czone_touch_7: source=stub
  mass_combi_pro: source=live_extraction
  masterbus_bridge_interface: source=stub
  masterbus_usb_interface: source=stub
  ml_switch: source=stub
  mli_ultra: source=live_extraction
  plain_battery_switch: source=stub
  silentwind: source=stub
  victron_mppt: source=live_extraction
  victron_mppt_150_60: source=stub

ROLES:
  alpha_pro_iii_port: ENDPOINT
  alpha_pro_iii_stbd: ENDPOINT
  busbar: PASSIVE
  class_t: PASSIVE
  coi: BRIDGE
  czone_touch_7: HUB
  mass_combi_pro: ENDPOINT
  masterbus_bridge_interface: BRIDGE
  masterbus_usb_interface: ENDPOINT
  ml_switch: ENDPOINT
  mli_ultra: ENDPOINT
  plain_battery_switch: ENDPOINT
  silentwind: ISLAND
  victron_mppt: ISLAND
  victron_mppt_150_60: ISLAND

SECTIONS (Stage 2 lookup):
  alpha_pro_iii_port: batteries (source=lookup)
  alpha_pro_iii_stbd: batteries (source=lookup)
  busbar: electrical (source=lookup)
  class_t: electrical (source=lookup)
  coi: electrical (source=lookup)
  czone_touch_7: electrical (source=lookup)
  mass_combi_pro: batteries (source=lookup)
  masterbus_bridge_interface: electrical (source=lookup)
  masterbus_usb_interface: electrical (source=lookup)
  ml_switch: electrical (source=lookup)
  mli_ultra: batteries (source=lookup)
  plain_battery_switch: electrical (source=lookup)
  silentwind: batteries (source=lookup)
  victron_mppt: batteries (source=lookup)
  victron_mppt_150_60: batteries (source=lookup)

CONTENT TIERS (Stage 3 preview):
  alpha_pro_iii_port: tier=situational role=ENDPOINT section=batteries — situational-only operator actions → situational
  alpha_pro_iii_stbd: tier=situational role=ENDPOINT section=batteries — situational-only operator actions → situational
  busbar: tier=reference role=PASSIVE section=electrical — PASSIVE / non-interactive → reference
  class_t: tier=emergency role=PASSIVE section=electrical — passive protective hardware → emergency
  coi: tier=reference role=BRIDGE section=electrical — BRIDGE / non-interactive → reference
  czone_touch_7: tier=operate role=HUB section=electrical — HUB with station UI → operate
  mass_combi_pro: tier=situational role=ENDPOINT section=batteries — situational-only operator actions → situational
  masterbus_bridge_interface: tier=reference role=BRIDGE section=electrical — BRIDGE / non-interactive → reference
  masterbus_usb_interface: tier=reference role=ENDPOINT section=electrical — default reference
  ml_switch: tier=emergency role=ENDPOINT section=electrical — protective device with emergency actions → emergency
  mli_ultra: tier=monitor role=ENDPOINT section=batteries — protective device with emergency actions → emergency; also daily monitor + telemetry → monitor (primary)
  plain_battery_switch: tier=situational role=ENDPOINT section=electrical — situational-only operator actions → situational
  silentwind: tier=situational role=ISLAND section=batteries — situational-only operator actions → situational
  victron_mppt: tier=monitor role=ISLAND section=batteries — daily operator actions → monitor
  victron_mppt_150_60: tier=monitor role=ISLAND section=batteries — daily operator actions → monitor

CONTROL PATHS:
  target=mli_ultra taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']
  target=mass_combi_pro taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']
  target=alpha_pro_iii_port taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']
  target=alpha_pro_iii_stbd taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']

RESOLVER (requires_devices):
  mass_combi_pro: 'MasterView Easy remote panel' kind='device' → satisfied=False resolved_to=None tier=None score=None evidence=None
  mass_combi_pro: 'MasterView remote panel' kind='device' → satisfied=False resolved_to=None tier=None score=None evidence=None
  mli_ultra: 'CZone Configuration Tool' kind='commissioning_tool' → satisfied=False resolved_to=None tier=None score=None evidence='commissioning_tool recorded for reference; not vessel-resolved'
  mli_ultra: 'MasterView remote panel' kind='device' → satisfied=False resolved_to=None tier=None score=None evidence=None
  mli_ultra: 'Mastervolt battery charger' kind='device' → satisfied=True resolved_to='mass_combi_pro' tier=2 score=None evidence="tier2 family mastervolt_charger: requirement 'Mastervolt battery charger' → Mastervolt Mass Combi Pro"
  mli_ultra: 'external safety relay' kind='device' → satisfied=True resolved_to='ml_switch' tier=3 score=1.0 evidence="tier3 class external_safety_relay: requirement 'external safety relay' → Blue Sea ML-Series (score=1.0)"
    rejected: 'plain_battery_switch' class='external_safety_relay' score=0.45<0.7 failed=['no remote command path'] reason='no remote command path'
    rejected: 'class_t' class='external_safety_relay' score=0.15<0.7 failed=['protective but not a switch', 'no remote command path'] reason='protective but not a switch; no remote command path'
    rejected: 'busbar' class='external_safety_relay' score=0.15<0.7 failed=['protective but not a switch', 'no remote command path'] reason='protective but not a switch; no remote command path'
  mli_ultra: 'SmartRemote' kind='device' → satisfied=False resolved_to=None tier=None score=None evidence=None
  mli_ultra: 'EasyView 5' kind='device' → satisfied=False resolved_to=None tier=None score=None evidence=None
  victron_mppt: 'VE.Direct TX digital output cable' kind='cable_or_consumable' → satisfied=False resolved_to=None tier=None score=None evidence='cable_or_consumable recorded for reference; not vessel-resolved'
  victron_mppt: 'GX device' kind='device' → satisfied=False resolved_to=None tier=None score=None evidence=None
  victron_mppt: 'MPPT Control - an (optional) external display' kind='device' → satisfied=False resolved_to=None tier=None score=None evidence=None
  victron_mppt: 'GlobalLink 520' kind='device' → satisfied=False resolved_to=None tier=None score=None evidence=None

CROSS-REFERENCES:
  kind=control in_section=batteries to_device=czone_touch_7 note='operated from CZone Touch 7'
  kind=hosts_control in_section=electrical to_device=mli_ultra note=''
  kind=control in_section=batteries to_device=czone_touch_7 note='operated from CZone Touch 7'
  kind=hosts_control in_section=electrical to_device=mass_combi_pro note=''
  kind=control in_section=batteries to_device=czone_touch_7 note='operated from CZone Touch 7'
  kind=hosts_control in_section=electrical to_device=alpha_pro_iii_port note=''
  kind=control in_section=batteries to_device=czone_touch_7 note='operated from CZone Touch 7'
  kind=hosts_control in_section=electrical to_device=alpha_pro_iii_stbd note=''
  kind=protection in_section=batteries to_device=ml_switch note='protective device located in electrical'
  kind=protection in_section=batteries to_device=ml_switch note='protective device located in electrical'
  kind=protection in_section=batteries to_device=class_t note='protective device located in electrical'
  kind=protection in_section=batteries to_device=class_t note='protective device located in electrical'
  kind=protection in_section=batteries to_device=ml_switch note='protective device located in electrical'
  kind=protection in_section=electrical to_device=mli_ultra note='protective device located in batteries'
  kind=protection in_section=electrical to_device=mli_ultra note='protective device located in batteries'
  kind=power_dependency in_section=batteries to_device=class_t note=''
  kind=power_dependency in_section=batteries to_device=class_t note=''
  kind=power_dependency in_section=batteries to_device=class_t note=''

FLAGS:
  {'flag': 'section_low_margin', 'device': 'masterbus_usb_interface'}
  {'flag': 'unresolved_dependency', 'device': 'mli_ultra', 'needed_for': 'control_surfaces[0]'}
  {'flag': 'unresolved_dependency', 'device': 'mass_combi_pro', 'needed_for': 'control_surfaces[0]'}
  {'flag': 'unresolved_dependency', 'device': 'mass_combi_pro', 'needed_for': 'control_surfaces[2]'}
  {'flag': 'island_with_daily_use', 'device': 'victron_mppt_150_60'}
  {'flag': 'unresolved_dependency', 'device': 'victron_mppt', 'needed_for': 'data_roles.exposes_data_to_network'}
  {'flag': 'unresolved_dependency', 'device': 'victron_mppt', 'needed_for': 'control_surfaces[0]'}
  {'flag': 'network_alias_gap', 'device': 'victron_mppt'}
  {'flag': 'island_with_daily_use', 'device': 'victron_mppt'}
  {'flag': 'low_confidence_profile', 'device': 'alpha_pro_iii_port'}
  {'flag': 'low_confidence_profile', 'device': 'alpha_pro_iii_stbd'}
  {'flag': 'suspected_installer_line_item', 'device': 'busbar'}

```

## Diff vs previous run (roles / paths / flags)

### ROLES

**Before:**
```
(missing)
```
**After:**
```
  alpha_pro_iii_port: ENDPOINT
  alpha_pro_iii_stbd: ENDPOINT
  busbar: PASSIVE
  class_t: PASSIVE
  coi: BRIDGE
  czone_touch_7: HUB
  mass_combi_pro: ENDPOINT
  masterbus_bridge_interface: BRIDGE
  masterbus_usb_interface: ENDPOINT
  ml_switch: ENDPOINT
  mli_ultra: ENDPOINT
  plain_battery_switch: ENDPOINT
  silentwind: ISLAND
  victron_mppt: ISLAND
  victron_mppt_150_60: ISLAND

```
- removed: (none)
- added: ['  alpha_pro_iii_port: ENDPOINT', '  alpha_pro_iii_stbd: ENDPOINT', '  busbar: PASSIVE', '  class_t: PASSIVE', '  coi: BRIDGE', '  czone_touch_7: HUB', '  mass_combi_pro: ENDPOINT', '  masterbus_bridge_interface: BRIDGE', '  masterbus_usb_interface: ENDPOINT', '  ml_switch: ENDPOINT', '  mli_ultra: ENDPOINT', '  plain_battery_switch: ENDPOINT', '  silentwind: ISLAND', '  victron_mppt: ISLAND', '  victron_mppt_150_60: ISLAND', '']

### CONTROL PATHS

**Before:**
```
(missing)
```
**After:**
```
  target=mli_ultra taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']
  target=mass_combi_pro taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']
  target=alpha_pro_iii_port taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']
  target=alpha_pro_iii_stbd taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']

```
- removed: (none)
- added: ["  target=mli_ultra taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']", "  target=mass_combi_pro taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']", "  target=alpha_pro_iii_port taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']", "  target=alpha_pro_iii_stbd taught_via=czone_touch_7 edge_provenance_weakest=self_claimed tiers=['self_claimed']", '']

### FLAGS

**Before:**
```
(missing)
```
**After:**
```
  {'flag': 'section_low_margin', 'device': 'masterbus_usb_interface'}
  {'flag': 'unresolved_dependency', 'device': 'mli_ultra', 'needed_for': 'control_surfaces[0]'}
  {'flag': 'unresolved_dependency', 'device': 'mass_combi_pro', 'needed_for': 'control_surfaces[0]'}
  {'flag': 'unresolved_dependency', 'device': 'mass_combi_pro', 'needed_for': 'control_surfaces[2]'}
  {'flag': 'island_with_daily_use', 'device': 'victron_mppt_150_60'}
  {'flag': 'unresolved_dependency', 'device': 'victron_mppt', 'needed_for': 'data_roles.exposes_data_to_network'}
  {'flag': 'unresolved_dependency', 'device': 'victron_mppt', 'needed_for': 'control_surfaces[0]'}
  {'flag': 'network_alias_gap', 'device': 'victron_mppt'}
  {'flag': 'island_with_daily_use', 'device': 'victron_mppt'}
  {'flag': 'low_confidence_profile', 'device': 'alpha_pro_iii_port'}
  {'flag': 'low_confidence_profile', 'device': 'alpha_pro_iii_stbd'}
  {'flag': 'suspected_installer_line_item', 'device': 'busbar'}
```
- removed: (none)
- added: ["  {'flag': 'section_low_margin', 'device': 'masterbus_usb_interface'}", "  {'flag': 'unresolved_dependency', 'device': 'mli_ultra', 'needed_for': 'control_surfaces[0]'}", "  {'flag': 'unresolved_dependency', 'device': 'mass_combi_pro', 'needed_for': 'control_surfaces[0]'}", "  {'flag': 'unresolved_dependency', 'device': 'mass_combi_pro', 'needed_for': 'control_surfaces[2]'}", "  {'flag': 'island_with_daily_use', 'device': 'victron_mppt_150_60'}", "  {'flag': 'unresolved_dependency', 'device': 'victron_mppt', 'needed_for': 'data_roles.exposes_data_to_network'}", "  {'flag': 'unresolved_dependency', 'device': 'victron_mppt', 'needed_for': 'control_surfaces[0]'}", "  {'flag': 'network_alias_gap', 'device': 'victron_mppt'}", "  {'flag': 'island_with_daily_use', 'device': 'victron_mppt'}", "  {'flag': 'low_confidence_profile', 'device': 'alpha_pro_iii_port'}", "  {'flag': 'low_confidence_profile', 'device': 'alpha_pro_iii_stbd'}", "  {'flag': 'suspected_installer_line_item', 'device': 'busbar'}"]

