# Inventory / Stage 4 event — Air Conditioning freeze

**When:** 2026-07-28  
**Class:** Stage 4 freeze (Playbook 2 §D)  
**Source:** Owner approval to freeze AC Know chapter after review-1  
**Fixture-Auth:** chat AC Stage 4 freeze tip v4.46

## Claims

| Claim | Disposition |
|-------|-------------|
| Frigomar Air Conditioning System is the AC Stage 4 plant member | attested (fixture + live substrate) |
| Wall touch-screen is the primary guest UI | attested (operators manual extract) |
| CZone Climate / supported HVAC for this unit is unconfirmed | unconfirmed — queued `ac_czone_climate_supported` |
| Primary-path-sourced AC chapter without Configuration-pending is shippable | accepted (AC xxii narrow; freeze tip v4.46) |

## Locked assets

- Tip: `equipment-classification-spec-v4.46.md`
- Composer: `guide_section_ac.py` `version=v4.1`, `freeze_status=frozen`
- Gate: `scripts/verify_ac_section_v4.py`
- Expectations: `tests/fixtures/ac_section_v4_expectations.json`
