# Equipment classification specification — v4.6

Follow-on to
[`equipment-classification-spec-v4.5.md`](equipment-classification-spec-v4.5.md).

## Catalog entity kind: `platform`

Interaction profiles and vessel inventory rows may declare:

```text
entity_kind: device | platform   # default device
```

| Kind | Meaning |
|------|---------|
| `device` | Physical equipment (default). |
| `platform` | Non-physical software UI shared across host devices. |

**Creation rule:** platform catalog entries are created only when extraction finds
operator content belonging to software that is shared across devices (founding:
**CZone 2.0** Quick Start). Never invent a platform speculatively because a
display “might” run one.

Physical hosts reference the platform via a `runs_platform` edge:

```json
"runs_platform": [
  {
    "platform_key": "czone_2_0",
    "host_kind": "display",
    "optional": false
  },
  {
    "platform_key": "czone_2_0",
    "host_kind": "mobile_app",
    "optional": true,
    "note": "iPad / CZone app — vessel-optional alternate host"
  }
]
```

Stage 2 role for platform nodes: `PLATFORM` (not HUB / ENDPOINT). Guide operate
content for a hub that `runs_platform` is drawn from the platform profile when
present.

### Version tagging

Platform profiles carry:

```text
documented_version: string   # e.g. "CZone 2.0 v1.1 (software v6.12.4.0+)"
```

Until a vessel artifact confirms the software version on *this* boat (settings
page photo or config artifact), Stage 2 emits `platform_version_unconfirmed`.

## Vessel flags (replaces monolithic `hub_operation_unsourced`)

| Flag | When |
|------|------|
| `platform_version_unconfirmed` | Hub `runs_platform` a versioned platform and vessel has not confirmed `documented_version`. |
| `config_unsourced` | Day-to-day modes / circuits / favourites for *this* boat still need a tier-4 `device_configuration` or tier-5 walkthrough. |

`hub_operation_unsourced` is **retired** for platform-backed hubs. Legacy
setup-only hubs with no platform edge may still emit it.

## `device_configuration` and `.zcf`

Tier-4 `device_configuration` includes transferable CZone configuration files.
The CZone 2.0 Quick Start Favourites section states that favourites configuration
requires a copy of the system configuration (`.zcf`) file, and uploads favourites
packages (`.cfp`) to displays. Treat `.zcf` as the transferable vessel config
artifact for CZone platforms (alongside screen walkthrough when no file is
available).

## Conditional platform pages

Pages that the manual states appear only when equipment is configured map to
`control_surfaces[]` + `requires_devices[]` (`needed_for` → surface path), using
existing Stage 2 conditionality:

| Page | Gate (manual wording) |
|------|------------------------|
| AC Mains | AC Mains Interface (ACMI) configured |
| Inverter/Charger | Mastervolt charger / inverter / inverter-charger on network |
| Climate | Supported HVAC configured (when documented in the sourced edition) |

Unresolved gates → surface inactive + `unresolved_dependency` — flag, don't guess.

## Founding fixture

- Platform: `czone_2_0` (Manufacturer=CZone, Model=CZone 2.0)
- Host: Outremer 55N60 `czone_touch_7` `runs_platform` `czone_2_0`
- Alternate host: iPad / CZone app (vessel-optional)

## Revision history

| Ver | Notes |
|-----|-------|
| **4.6** | platform entity kind; runs_platform; platform_version_unconfirmed + config_unsourced; .zcf note on device_configuration |
| 4.5 | device_configuration; genres; config_defined_operation; hub_operation_unsourced; Touch 7 |
