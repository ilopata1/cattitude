# Equipment classification specification — v4.37

Follow-on to
[`equipment-classification-spec-v4.36.md`](equipment-classification-spec-v4.36.md).

## Revision history

| Ver | Notes |
|-----|-------|
| **4.37** | Navigation & Helm Stage 4 frozen (nav-i–nav-xiii); `startup` global spine slot (nav-xii); Zeus SR Software platform; frozen set = Solar + Batteries + Controls + Electrical + Nav |

### nav-xiii — startup bridge phrase placement

A startup→next-block bridge ("Once powered on, …") is optional and usually
unnecessary; the spine ordering already makes the sequence clear. If one is
used at all, it attaches only to the **first body action after the startup
step** — the first `monitoring` action, or the first `adjusting` action when
there is no monitoring content. It must never ride the home / app-access step.
Default is to omit it (the Nav home step is plain). Evaluator adds
`no_startup_bridge_on_home`.

### nav-xii — `startup` spine slot (power-on before monitoring)

Global spine change (v4.37.5): a new `startup` slot sits between
`how_it_works` and `monitoring` in `SECTION_SPINE`. A device must be turned
on before it can be watched or adjusted, so the power-on / session-start step
sorts ahead of both `monitoring` and `adjusting` — not just first within
`adjusting`. Powered devices (chartplotters, inverters) emit `startup`;
always-on systems (batteries, solar) omit it (slots may be empty).

For Nav the power on/off sentence moves from `adjusting` to `startup`, so the
rendered arc is: capability → how it works → **power on/off** → monitoring
(Alerts) → adjusting (home, apps, MOB). Evaluator adds `power_in_startup_block`
and `power_precedes_monitoring`.

### nav-xi — power precedes app access

Turning the unit on/off is the session bookend and must precede any
app-access how-to (reaching the home screen / opening apps). Do not
pre-explain app navigation in `how_it_works`; keep that block to conceptual
orientation (network role, cross-section pointers). App-access how-to lives
in `adjusting`, after the power step.

### nav-x — omit routine timing labels

Do not write "day-to-day" (or similar) when the occasion is simply normal
operations. That phrase reads as a daily chore; guests already assume
non-emergency actions are ordinary. Keep explicit timing only for
non-default occasions (emergency, leaving the helm, when you want X).

### CZone on Zeus — commissioned wording

OEM System Guide: control-bar switches appear when a CZone device is
**commissioned on the NMEA 2000 network**. That is not "configure CZone
inside Zeus before it works" as a guest step. When CZone is already fitted,
do not hedge guest prose with "When CZone is commissioned." Queue owner
fact `zeus_czone_controller_visible` until screen confirmation that Zeus
shows the controller (vs Touch 7 only).

## Navigation & helm Stage 4 — frozen for reuse (v4.37.6)

Know chapter `nav` Stage 4 composer and acceptance criteria (nav-i–nav-xiii)
are **frozen** after human review (Outremer / Supernova; Zeus SR Software
platform + Halo radar). Further change needs a versioned tip that supersedes
this freeze — do not silently rewrite the template in place.

Ship-with-honest-gaps remains in force: per-installation chart layouts, radar
overlays, pinned favourites, and alert rules stay a `(Configuration pending)`
placeholder and must **not** block freeze. Owner fact
`zeus_czone_controller_visible` may remain queued; wisdom slot may stay
`pending` until a sourced comparative helm/radar claim.

### nav-ix — helm session reader arc

Extends v4.9 (routine before exceptional) and v4.15 (functional-group
paragraphs) for Navigation. Reader arc as frozen:

1. **capability** — what is fitted (station → sensors → app inventory); one
   paragraph; no imperatives.
2. **how_it_works** — orientation only (network role + CZone xref once, via
   Controls; no "when commissioned" hedge when CZone fitted). No app-access
   how-to here (nav-xi).
3. **startup** — power on/off; sorts before monitoring (nav-xii).
4. **monitoring** — Alerts.
5. **adjusting** — helm session order: home → chart → radar → pin/split →
   MOB (exceptional last).
6. **troubleshooting** — config honest gap; **reference** — care.

**Locked assets**

| Asset | Path |
|-------|------|
| Composer / evaluate | `guide_section_nav.py` (criteria nav-i–nav-xiii) |
| Draft harness | `scripts/draft_nav_section.py` |
| Regression gate | `scripts/verify_nav_section_v4.py` |
| Platform ui_pages reextract | `scripts/reextract_zeus_sr_ui_pages.py` |
| Expectations | `tests/fixtures/nav_section_v4_expectations.json` |
| Scratch draft | `fixtures/pipeline/scratch/nav_section_draft_v4.{md,json}` |

**Frozen set:** Solar + Batteries + Controls + Electrical + **Navigation &
Helm**. Any global composition / reader-voice rule change must re-run all
five and report pass / what broke (`standard_frame.txt`). Note: `startup` is
now a global spine slot (nav-xii); Controls may still say "day-to-day" until
a separate global pass.
