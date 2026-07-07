# Curated guide content library

Guest-facing copy for hybrid guide modules (home rules, checklists, fix cards) lives here as YAML data plus a small Python assembly engine. This is separate from [`prompts/`](../prompts/README.md), which holds LLM instructions.

## Layout

| Path | Purpose |
|------|---------|
| `loader.py` | Load YAML files; strip leading `#` doc headers |
| `slots.py` | Resolve `{vessel_name}`, `{both_engines}`, `{contact_step}`, etc. from a vessel snapshot |
| `conditions.py` | Evaluate `when:` blocks (`has_category`, `twin_engine`, `is_sailing`, …) |
| `assembler.py` | Build module payloads; exports `LIBRARY_MODULE_BUILDERS` |
| `home_rules/` | Section headings + static rules (runtime `localRules` still come from guide context) |
| `checklists/` | One YAML file per checklist (`safety-brief`, `pd`, `anch`, `lu`, `ec`) |
| `fix_cards/` | Default troubleshooting cards (equipment fragments can override after assembly) |

`guide_content_library.py` at the backend root is a thin re-export of `LIBRARY_MODULE_BUILDERS` so existing imports keep working.

## Editing content

1. Open the relevant YAML file. Each file starts with a `#` header describing purpose and module key.
2. Use `{slot}` placeholders for vessel-specific text (see `slots.py` for available names).
3. Gate items with `when:` when they depend on equipment or vessel type:

```yaml
- c: Raw water seacocks OPEN on {both_engines}
  when:
    has_category:
      - propulsion
```

For multiple required categories, use `all:`:

```yaml
when:
  all:
    - has_category: [electrical_dc]
    - has_category: [navigation_electronics]
```

4. After edits, run parity verification:

```bash
cd backend
python scripts/verify_content_library.py
```

## Regenerating from legacy

`scripts/materialize_guide_content.py` can rebuild YAML from `guide_content_library_legacy.py` (kept for verification). Prefer hand-editing with slots after the initial export; re-run materialize only when merging large legacy changes.

## Module keys

| Key | Source |
|-----|--------|
| `ui` / `homeRuleSections` | `home_rules/*.yaml` + runtime local rules |
| `checklist` / `safety-brief`, `pd`, `anch`, `lu`, `ec` | `checklists/*.yaml` |
| `fix_card_set` / `all` | `fix_cards/cards.yaml` |

Equipment-specific fix-card enrichment still happens in `guide_equipment_fragments.py` after library assembly.
