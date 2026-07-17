# Equipment classification specification — v4.7

Follow-on to
[`equipment-classification-spec-v4.6.md`](equipment-classification-spec-v4.6.md).

## Platform extraction: `ui_pages[]`

Platforms extract page inventory in-schema (not via promote hand-fill):

```json
"ui_pages": [
  {
    "name": "Climate",
    "purpose": "…",
    "appears_if_gate": {
      "verbatim": "The Climate page will appear if a supported air conditioner (HVAC) is configured on the system.",
      "description_verbatim": "supported air conditioner (HVAC)",
      "functional_class": "supported_hvac"
    },
    "actions": [{ "action": "…", "audience": "operator", "context": "daily" }]
  }
]
```

Always-present pages use empty gate strings. Code expands `ui_pages` into
`control_surfaces` + `requires_devices` for Stage 2 conditionality.

Completeness check (same spirit as procedure inventory): extracted page names
vs intro page-tile inventory. Founding tiles for CZone 2.0 V1.1:

Favourites · Modes · Control · Monitoring · Alarms · AC Mains ·
Inverter/Charger · Climate

## Ingest edition discipline

Wrong-edition files are not truncation bugs. The V1.0 mirror (16pp, no Climate)
was ingested under a v1.1 filename; V1.1 is 19pp and includes CLIMATE PAGE +
CLIMATE CONTROLS. Prefer the downloads.czone.net attachment (downloadId=239).

## Climate gate nuance

`functional_class: supported_hvac` does **not** satisfy from generic vessel air
conditioning. **AC-present ≠ CZone-supported-HVAC.** Until a line item is
explicitly marked `czone_supported_hvac` / `hvac_czone_integrated`, Climate
stays inactive + `unresolved_dependency`.

## Revision history

| Ver | Notes |
|-----|-------|
| **4.7** | ui_pages schema; calibration P; Climate gate ≠ AC-present; V1.1 ingest |
| 4.6 | platform entity; runs_platform; flag split; .zcf |
