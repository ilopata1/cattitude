# Pipeline fixtures (Stages 1–4)

Offline fixtures for interaction profiles, vessel graph, and Stage 4 composers.

**Process docs (read before changing fixtures):**

- [`../../../PLAYBOOKS.md`](../../../PLAYBOOKS.md) — extract (§1), compose/freeze (§2), inventory (§3), defect→fixture (§4)
- [`../../../PRINCIPLES.md`](../../../PRINCIPLES.md) — standing rules
- [`../../../standard_frame.txt`](../../../standard_frame.txt) — review-round disposition protocol
- [`../../tests/fixtures/POLICY.md`](../../tests/fixtures/POLICY.md) — `Fixture-Auth` for golden changes

## Layout

| Path | Role | Agents may overwrite? |
|------|------|------------------------|
| `outremer/` | Hand-authored vessel inventory + profiles + expected Stage 2 graph; **seeds** Stage 4 substrate for Supernova | **No** without `Fixture-Auth` |
| `oracles/` | Frozen Stage 4 `SystemModule` byte-match oracles | **No** without intentional oracle update |
| `scratch/` | Working Stage 1 extracts and Stage 4 section drafts (gitignored) | Yes — iteration surface |
| `../../tests/fixtures/` | Extraction / Stage 1.5 / Stage 2 regression goldens + defect fixtures | **No** without `Fixture-Auth` |

### Scratch vs golden vs oracle

1. **Extract / compose into `scratch/`** — playbook §1–§2. Safe to re-run.
2. **Human review** — for section drafts, use `standard_frame.txt` (rule change / fact query / one-off + disposition table). Global rule changes re-run all frozen sections.
3. **Promote** — copy reviewed profile expectations into goldens / update `outremer/` only with `Fixture-Auth`. Freeze composer rules in tip specs after review; update `oracles/` when the published module shape is intentionally changed.
4. **Seed live DB** — `scripts/seed_stage4_substrate.py` loads from `outremer/` (or equivalent), not from scratch. Admin Generate then reads the substrate.

Never “fix” a golden or oracle to silence a failing extract. Prefer honest red + a defect fixture (playbook §4).

## How this relates to live Generate

- **Fixture files** are not read by admin Generate at runtime.
- **Stage 4 composers** *are* on the live path: when a vessel has a DB Stage 4 substrate, `run_stage4_generation` composes published systems (`batteries`, `controls`, `electrical`, `engines`, `nav`, `water`) with `model_id=stage4_composer`.
- Seed substrate from these fixtures with `scripts/seed_stage4_substrate.py` (e.g. `--slug supernova --fixture outremer`).

```bash
# From backend/
python scripts/verify_system_graph.py
make pipeline-verify
make stage4-bytematch

# Seed DB substrate, then Generate via admin or:
python scripts/ingest_stage4_sections.py --slug supernova

# Optional live extraction (needs DB + Azure + cleared manuals):
python scripts/extract_interaction_profile.py \
  --manufacturer Victron --model "SmartSolar" \
  --out fixtures/pipeline/scratch/victron_mppt.json \
  --citations-out fixtures/pipeline/scratch/victron_mppt.citations.json
```

See [`../guide-pipeline-plan.md`](../guide-pipeline-plan.md) (authoring process + fixture table) and
[`../guide-stage4-integration-plan.md`](../guide-stage4-integration-plan.md).
