# Cattitude equipment manuals

PDFs downloaded from public manufacturer sources (May 2026). Large files are gitignored — see root `.gitignore`.

**On-board check:** Confirm model numbers on labels match each manual before relying on it for maintenance.

## Downloaded

| File | Equipment | ~Size |
|------|-----------|-------|
| `Yanmar/CGU_EN.pdf` | Yanmar common guide (partial; full JH-CR manual not in repo) | 0.2 MB |
| `Victron_Energy/victron_digital_multi_control.pdf` | Victron Multi Control panel | 1.1 MB |
| `Victron_Energy/victron_multiplus_manual.pdf` | Victron MultiPlus inverter/charger | 2.4 MB |
| `Victron_Energy/victron_gx_display_manual.pdf` | Victron Color Control / Cerbo GX | 19 MB |
| `Victron_Energy/victron_hub1_system_layout.pdf` | Victron HUB-1 assistant layout | 0.8 MB |
| `Dometic/dometic_captouch_panel.pdf` | Dometic CapTouch cabin control | 15 MB |
| `Dometic/dometic_elite_control.pdf` | Dometic Elite marine AC control | 2.1 MB |
| `Garmin/GPSMAP_74xx-76xx_OM_EN-US.pdf` | Garmin GPSMAP 74xx/76xx (**verify MFD model**) | 12 MB |
| `Tecma/tecma_compass_eco_manual.pdf` | Tecma Compass Eco head (**verify model**) | 3 MB |
| `Tecma/tecma_macerator_toilets_2g_manual.pdf` | Tecma electric heads (2G family) | 2.2 MB |
| `Volvo_Penta/Volvo D2-60 Operators Manual.pdf` | Volvo Penta D2-60 | 11 MB |

## Not downloaded (blocked or login required)

| Equipment | Action |
|-----------|--------|
| Quick **QNC CHC** chain counter | [ManualsLib](https://www.manualslib.com/manual/2762636/Quick-Qnc-Chc.html) — download in browser |
| Quick **Dylan DH4** windlass | Request from Quick / Cruise Abaco |
| **Aqua-Base** watermaker | [Documentation](https://aquabase-watermakers.com/en/pages/documentation) — login for full manual |
| **Karver** KMS gaff lock | [Karver product pages](https://www.karver-systems.com/en/product-category/locks/kgl-gaff-locks/) |
| Generator, exact Garmin model | Photograph on-board labels |

## Re-download

From repo root, most direct URLs work with `Invoke-WebRequest` or `curl -L`. Yanmar requires the alternate URL used in setup (see git history or Cruise Abaco).
