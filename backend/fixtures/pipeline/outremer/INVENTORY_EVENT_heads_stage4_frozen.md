# Inventory event — Heads & waste Stage 4 frozen (Outremer / Supernova)

**When:** 2026-07-26  
**Class:** Stage 4 freeze (Playbook 2 §D)  
**Source:** Owner request to freeze valves-only Heads chapter with honest gaps  
**Fixture-Auth:** chat Heads Stage 4 freeze tip v4.45

## Claims

| Claim | Class |
|-------|--------|
| Blackwater discharge valves (qty 3) are the Heads Stage 4 plant | attested (fixture + live substrate) |
| Electric heads model on Supernova is not inventory-corroborated | attested (owner; Tecma catalog-only) |
| Valves-only Know chapter with `heads_model_unknown` is shippable | accepted (ship-with-honest-gaps; freeze tip v4.45) |

## Records

- Tip: `equipment-classification-spec-v4.45.md`
- Composer: `guide_section_heads.py` `version=v4.1`, `freeze_status=frozen`
- Published: `heads` added to `PUBLISHED_SECTIONS`
- Catalog focus updated away from Tecma assumption

## Left unchanged

- Tecma Compass Eco remains catalog / `last_green` only until owner adds heads
  via admin + Playbook 3 plant promotion.
- Standing discharge valve guest rules (pump-out ≠ open; nearshore closed;
  local empty / ≥12 nm tip).
