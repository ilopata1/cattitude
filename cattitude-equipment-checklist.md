# Cattitude — admin equipment & manual checklist

Use this while populating Postgres via the admin portal so Cattitude matches the live PWA guide (`mobile/src/data/bootstrap/cattitude.json`). Tick boxes as you go.

**Goal:** accurate `vessels` + `vessel_equipment` + manual library linkage — inputs for guide generation, not a manual rewrite of guide text.

**Admin paths**

| Task | URL |
|------|-----|
| Verify vessel | `/admin/vessels` → **Cattitude** → Edit |
| Equipment | `/admin/vessels/{id}/equipment` |
| Operating base context | `/admin/operating-bases` → **Abacos** |
| Manuals | `/admin/manuals` |
| Option packs (reference) | `/admin/option-packs` |

**Legend**

- **VE** = row on `vessel_equipment` (installed on Cattitude)
- **Manual** = `manual_work` uploaded, legally **cleared**, linked to that equipment (or hull/system)
- **P1** = must-have for generation benchmark
- **P2** = should-have; generic or safety gear — add if registry has a good match

---

## 1. Vessel & tenancy (verify first)

- [ ] **Charter company:** Cruise Abaco (`/admin/companies`)
- [ ] **Operating base:** Abacos — `guide_context` matches PWA emergency/branding (VHF Ch 09/68, Jesse contact, marina, local rules)
- [ ] **Vessel:** Cattitude, slug `cattitude`, type `sailing_catamaran`
- [ ] **Hull model:** Fountaine Pajot **Tanna 47** linked on vessel record
- [ ] **Guide modules:** leave existing `guide_content":content` as benchmark — do not re-import from JSON

---

## 2. Option packs (fast path)

On `/admin/vessels/{id}/equipment`, apply packs linked to **Tanna 47** before hand-picking rows.

- [ ] Review applicable packs on the equipment page (filtered by hull model)
- [ ] Apply **factory / structural** pack(s) for FP Tanna 47 if present
- [ ] Apply **Garmin / nav** pack(s) if present *(note: some Garmin packs may link to hull but have empty equipment BOM — add nav rows manually)*
- [ ] Apply **Victron / electrical** pack(s) if present
- [ ] After apply: remove anything Cattitude does **not** have; add gaps from section 3

---

## 3. Branded major equipment (by guide system)

Match registry rows as closely as possible. Set `confirmed_by` → **team_verified** when you add via admin.

### Hull & layout (overview)

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Fountaine Pajot | Tanna 47 | — | via hull | — | On vessel record, not `vessel_equipment` |

### Propulsion — `engines`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Yanmar | **4JH45** (×2) | propulsion | ☐ | ☐ | Twin diesels, port & stbd; EVC helm controls |
| P2 | Yanmar | EVC / electronic engine control | propulsion | ☐ | ☐ | If separate registry row exists |
| P1 | — | **Generator** (diesel, port tank) | electrical / propulsion | ☐ | ☐ | Guide references saloon/chart-table start; confirm make/model on boat |
| P2 | — | Shore power inlet / cord | electrical | ☐ | ☐ | For AC loads |

### Electrical & energy — `electrical`, `batteries`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Victron | **MultiPlus** (inverter/charger) | electrical | ☐ | ☐ | `victron_multiplus_manual` |
| P1 | Victron | **Multi Control** panel | electrical | ☐ | ☐ | `victron_digital_multi_control` |
| P1 | Victron | **GX** / Cerbo (energy monitor) | electrical | ☐ | ☐ | `victron_gx_display_manual` |
| P1 | Victron | **HUB-1** display / layout | electrical | ☐ | ☐ | `victron_hub1_system_layout` |
| P1 | Victron | Solar MPPT / PV charger | electrical | ☐ | ☐ | HUB-1 shows “PV Charger” |
| P2 | Victron | BMS / battery monitor | electrical | ☐ | ☐ | If fitted |
| P2 | — | House & start battery banks | electrical | ☐ | ☐ | May be generic `branded_major` or AGMs |

### Water — `water`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Spectra / Aqua-Base | **Watermaker** (3-button panel) | freshwater_system | ☐ | ☐ | PWA says “Aqua-Base”; seed used Spectra Catalina 340 — **confirm on board** |
| P2 | — | Freshwater pressure pump | freshwater_system | ☐ | ☐ | DC panel “Fresh Water Pump” |
| P2 | — | Hot water heater | freshwater_system | ☐ | ☐ | AC-powered per guide |

### Heads — `heads`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Tecma | **Electric heads** (2G / Compass Eco) ×5 | sanitation | ☐ | ☐ | `tecma_macerator_toilets_2g_manual`, `tecma_compass_eco_manual` |
| P2 | — | Holding tanks (45L each) | sanitation | ☐ | ☐ | Often generic |

### Galley — `galley`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Whirlpool | **Induction stove** | galley | ☐ | ☐ | Needs gen + inverter |
| P2 | — | Saloon fridge 1 & 2 | galley / electrical | ☐ | ☐ | DC panel breakers |
| P2 | — | Freezer | galley / electrical | ☐ | ☐ | |
| P2 | — | Cockpit fridge (helm stairs) | galley | ☐ | ☐ | Separate thermostat |
| P2 | — | Microwave | galley | ☐ | ☐ | Inverter breaker |

### Navigation — `nav`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Garmin | **GPSMAP 74xx/76xx** MFD | navigation | ☐ | ☐ | Owner confirmed Garmin; `garmin_gpsmap_74xx_76xx_owner_manual` |
| P1 | Garmin | VHF + **AIS** transponder | navigation | ☐ | ☐ | Owner confirmed Garmin nav stack |
| P2 | Garmin | **Autopilot** (Reactor) | navigation | ☐ | ☐ | Owner confirmed Garmin; factory pack # unknown |
| P2 | — | Wind / depth (integrated in MFD) | navigation | ☐ | ☐ | PWA mentions at helm |

### Anchoring — `anchoring`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Quick | **Dylan DH4** windlass | ground_tackle | ☐ | ☐ | Vertical windlass, handheld remote |
| P1 | Quick | **QNC CHC** chain counter | ground_tackle | ☐ | ☐ | Bow display |
| P1 | — | **Anchor** | ground_tackle | ☐ | ☐ | Type unknown — windlass confirmed only |
| P2 | — | Chain (12mm ISO / 13mm DIN) | ground_tackle | ☐ | ☐ | Generic hardware OK |

### Sails & rigging — `sails`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Karver | **KMS Gaff Lock** | rigging_sail_handling | ☐ | ☐ | Square-top mainsail |
| P1 | Karver | **KBH batten hook** | rigging_sail_handling | ☐ | ☐ | |
| P2 | — | Roller furling genoa | rigging_sail_handling | ☐ | ☐ | |
| P2 | — | Square-top mainsail | rigging_sail_handling | ☐ | ☐ | |
| P2 | — | Powered winches (×2) + manual (×1) | rigging_sail_handling | ☐ | ☐ | Confirm manufacturer if known |
| P2 | — | Clutch / jammer banks | rigging_sail_handling | ☐ | ☐ | Generic hardware OK |

### Dinghy — `dinghy`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | — | **Hydraulic stern platform** | deck_hardware | ☐ | ☐ | Tender lift — confirm make |
| P1 | — | **RIB dinghy** | deck_hardware | ☐ | ☐ | Inflatable on platform |
| P1 | — | **Outboard** | propulsion | ☐ | ☐ | Unknown — tender RIB linked without engine row |
| P2 | — | Platform handheld remote | deck_hardware | ☐ | ☐ | Stored in anchor well per guide |

### Air conditioning — `ac`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P1 | Dometic | **CapTouch / climate panels** (cabins + saloon) | hvac | ☐ | ☐ | `dometic_captouch_panel`, `dometic_elite_control` |
| P2 | Dometic | AC units (split/marine) | hvac | ☐ | ☐ | One per cabin + saloon |

### Safety — `safety`

| P | Manufacturer | Model / description | System | VE | Manual | Notes |
|---|--------------|---------------------|--------|:--:|:------:|-------|
| P2 | — | Life jackets (cockpit lazarette) | safety | ☐ | ☐ | Count vs PWA |
| P2 | — | Fire extinguishers | safety | ☐ | ☐ | Galley, cockpit, engine auto outlets |
| P2 | — | Life raft | safety | ☐ | ☐ | Under helm stairs |
| P2 | — | Flare kit | safety | ☐ | ☐ | Saloon coffee table |
| P2 | — | First aid kit | safety | ☐ | ☐ | Saloon coffee table |

---

## 4. Manual library cross-check

Every `manualTitles` key in the PWA should have a cleared edition in `/admin/manuals`, linked to the equipment above.

| manual_id (PWA key) | Display title | Equipment link | Cleared | Ingested |
|---------------------|---------------|----------------|:-------:|:--------:|
| `yanmar_4jh45_operators` | Yanmar 4JH45 Operator Manual | Yanmar 4JH45 | ☐ | ☐ |
| `yanmar_jh-cr_operator` / `yanmar_jh_cr_operator` | (duplicate keys — same doc) | Yanmar 4JH45 | ☐ | ☐ |
| `victron_multiplus_manual` | Victron MultiPlus | MultiPlus | ☐ | ☐ |
| `victron_digital_multi_control` | Victron Multi Control Panel | Multi Control | ☐ | ☐ |
| `victron_gx_display_manual` | Victron GX Display | GX / Cerbo | ☐ | ☐ |
| `victron_hub1_system_layout` | Victron HUB-1 Layout | HUB-1 / system | ☐ | ☐ |
| `garmin_gpsmap_74xx_76xx_owner_manual` | Garmin GPSMAP 74xx/76xx | MFD | ☐ | ☐ |
| `dometic_captouch_panel` | Dometic CapTouch Panel | AC panels | ☐ | ☐ |
| `dometic_elite_control` | Dometic Elite AC Control | AC control | ☐ | ☐ |
| `tecma_macerator_toilets_2g_manual` | Tecma Electric Heads (2G) | Tecma heads | ☐ | ☐ |
| `tecma_compass_eco_manual` | Tecma Compass Eco | Tecma heads | ☐ | ☐ |

**Also ingest (recommended, not in `manualTitles` today):** Quick windlass, Karver, watermaker OEM manual, generator manual, outboard manual — as you identify exact models.

---

## 5. Guide system coverage map

When done, each PWA **Know** system should be explainable from installed equipment + manuals:

| Guide system key | Primary equipment rows |
|------------------|------------------------|
| `overview` | Hull model only |
| `safety` | Safety gear (P2) + base `guide_context` |
| `sails` | Karver, furling, winches |
| `engines` | Yanmar 4JH45 ×2 |
| `electrical` | Victron stack, panel loads |
| `batteries` | Victron GX / HUB-1, solar, batteries |
| `water` | Watermaker, pumps, tanks |
| `heads` | Tecma ×5 |
| `galley` | Whirlpool stove, fridges, generator |
| `nav` | Garmin MFD, VHF/AIS, autopilot |
| `anchoring` | Quick windlass, anchor |
| `dinghy` | Platform, RIB, outboard |
| `ac` | Dometic panels + units |

---

## 6. Known gaps & verify on board

Owner confirmed (2026-07): **Garmin** navigation stack; **Quick Dylan DH4** windlass (+ chain counter). Still unknown: anchor type, generator make, tender outboard, Garmin factory pack number (2 vs 3), watermaker OEM model (panel says Aqua-Base).

- [ ] **Anchor:** type unknown — windlass only confirmed (Quick Dylan DH4)
- [ ] **Generator:** manufacturer/model unknown — generic registry row linked
- [ ] **Tender outboard:** brand/HP unknown — RIB + platform linked only
- [ ] **Garmin pack:** owner confirms Garmin; Pack 2 vs 3 not known — linked to GPSMAP 74xx/76xx per PWA
- [ ] **Watermaker:** panel branded Aqua-Base in PWA; Spectra Catalina 340 is best registry placeholder until confirmed
- [ ] **Windlass power:** 12V 1500W vs 24V 1700W (Quick Dylan DH4 variant)

---

## 7. Definition of done

You are ready to start **guide generation v0** when:

- [ ] All **P1** rows in section 3 have **VE** checked (or consciously marked N/A with a note)
- [ ] All section 4 manuals are **cleared** and linked
- [ ] Operating base `guide_context` verified against PWA `emergency` + home rules
- [ ] Installed equipment count on admin page is plausibly complete (expect **~25–40** branded rows, not 3)
- [ ] No duplicate/conflicting models for the same system (e.g. two different watermakers)

**Not required yet:** every P2 safety/generic row, perfect option-pack coverage, or re-entering guide prose in admin.

---

## Reference

- PWA content source: `mobile/src/data/bootstrap/cattitude.json`
- **Registry manifest:** `data/cattitude_vessel_equipment.csv` (25 planned links after owner review)
- **Seed script:** `backend/scripts/seed_cattitude_equipment.py`
- Seed placeholder (replace): `backend/scripts/seed_dev_data.py` → 3 sample `vessel_equipment` rows only
- Data model onboarding matrix: `clever-sailor-data-model.md` § Onboarding channels

### Automated first pass (registry + vessel_equipment)

```powershell
# 1. Update Postgres registry from data/*.csv
cd backend
python scripts/import_registry.py

# 2. Replace Cattitude vessel_equipment from manifest
python scripts/seed_cattitude_equipment.py --replace
```

### Guide generation v0 (branding + emergency + home rules)

Prerequisites: equipment linked, Azure OpenAI env vars set, existing approved modules used as reference.

```powershell
cd backend
python scripts/generate_guide.py --slug cattitude
# or snapshot only:
python scripts/generate_guide.py --slug cattitude --snapshot-only
```

Admin: `/admin/vessels` → Cattitude → Guide → **Generate v0 drafts** → Approve each draft → Publish.

Systems/checklists generation is not in v0 yet.
