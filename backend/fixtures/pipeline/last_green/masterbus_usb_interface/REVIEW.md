# MasterBus USB Interface — Playbook 1 review

**Device:** Mastervolt / MasterBus USB Interface  
**Equipment id:** `248e1de6-31c4-471c-80e9-9236a7b00d22`  
**Scratch stem:** `fixtures/pipeline/scratch/masterbus_usb_interface*`  
**Baseline:** `outremer/profiles.json` entry is a **stub** (`source: stub`) — live extract is richer and not yet promoted.

## A. Source and genre — PASS

| Check | Result |
|-------|--------|
| Registry | Present; `electrical_dc`; branded_major |
| Manual work | `34e8580d-…` — *MasterBus USB Interface Users Manual* |
| Legal / type / tier | `cleared` / `operators` / `tier_1` |
| Edition admin | `initial` (no version token) |
| Local PDF | `C:\Users\ilopa\Downloads\MasterBus-USB_Interfa080916EN.pdf` |
| Hash vs ingest | **Match** `435747fcbfd749b2…` |
| Pages | 12 EN (file is English section only; cover lists other languages starting p13 in full multi-lang editions) |
| Self-declared | **v 2.1 September 2008** (body); filename date-coded `080916EN`; `edition_mismatch` guard = no mismatch (no comparable version tokens on filename/admin) |
| Genres | Combined: installation + MasterAdjust commissioning/operation + troubleshooting + reference |

## B. Route and extract — PASS (artifacts written)

```text
python scripts/extract_interaction_profile.py \
  --manufacturer Mastervolt --model "MasterBus USB Interface" \
  --out fixtures/pipeline/scratch/masterbus_usb_interface.json \
  --citations-out fixtures/pipeline/scratch/masterbus_usb_interface_citations.json
```

- Heading coverage **94.1%** (48/51); missing: `1.4 LIABILITY`, `4.1 GENERAL`, part-number crumb — not material.
- Stability: 3/3 votes; **0 material** instability; 5 cosmetic presence flaps (MasterAdjust start/scan actions, bogus “interface as control surface”, UTP/terminator requires).
- Procedure inventory: **0 unaccounted**; 15 procedures classified `not_operator_relevant:installer` (MasterAdjust/setup); 15 filtered.

## C. Review — FAIL gate (`needs_rextraction: true`)

### Blocking flags (must adjudicate before promote)

1. **`action_without_surface`** on `install MasterAdjust software on PC or notebook`  
   - Layer: **extraction omission** (MasterAdjust is the documented PC UI; `control_surfaces` stayed empty after vote/repair).  
   - Procedure inventory already treats MasterAdjust flows as installer — consistent with audience, but validator still requires a surface when actions imply one.

2. **`direction_mismatch`** on evidence supporting `data_roles.exposes_data_to_network`  
   - Note: “MasterAdjust software monitors and controls connected devices” (hub-commanding).  
   - Layer: **validation/repair** — auto evidence repair *added* support for `exposes_data_to_network` / `displays_data_from_other_devices`. For an ENDPOINT USB adapter those roles are likely **false** (matches current stub). Commanding belongs to MasterAdjust on the PC, not to USB-stick data_roles.

### Warnings (non-blocking)

- `evidence_verbatim` ×2  
- `evidence_support_mismatch` (install vs adjust linkage)

### Live vs stub (intentional diffs once green)

| Field | Stub | Live extract |
|-------|------|--------------|
| operator_actions | connect PC via USB (commissioning) | install/adjust/program MasterAdjust + LED/cable troubleshooting |
| data_roles | all false | exposes/displays true (suspect — see flag 2) |
| supply_requirements | [] | USB cable (included) |
| genres | (none) | commissioning, installation, operation |
| source | stub | extracted |

## D. Adjudication — APPROVED 2026-07-23 (owner/human)

| Id | Decision | Applied |
|----|----------|---------|
| D1 | Add MasterAdjust PC control surface | `control_surfaces[0]` label MasterAdjust (`other` / `remote_wired`) |
| D2 | Software owns display/control, not this device | Dropped hub-commanding data_roles evidence; `displays`/`controllable` false; **`exposes_data_to_network` kept true** as MasterBus participant (avoids `speaks_but_inert` while MasterBus remains in `networks.speaks`) |

Promote script: `scripts/promote_masterbus_usb_interface.py`  
Archive: `fixtures/pipeline/last_green/masterbus_usb_interface/`  
Live profiles: `outremer/profiles.json`, `outremer_post_batch_b/profiles.json`

## E. Promote — DONE

- `needs_rextraction`: **false**
- Remaining flags: `evidence_verbatim` (warnings), `evidence_support_mismatch` (warning), `extraction_omission_adjudicated` (info)
- Role expectation unchanged: **ENDPOINT** / electrical

## Artifacts

- `masterbus_usb_interface.json` — annotated profile (`needs_rextraction: true`)
- `masterbus_usb_interface_input.json` — full observability
- `masterbus_usb_interface_groups/` — map I/O
- `masterbus_usb_interface_procedures.json` — inventory + trail
- `masterbus_usb_interface_citations.json`
