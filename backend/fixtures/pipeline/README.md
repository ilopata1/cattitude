# Pipeline fixtures (Stage 1–2 spike)

Offline fixtures for the interaction-profile → vessel-graph spike.
**Not** consumed by `generate_module` / publish.

| Path | Purpose |
|------|---------|
| `outremer/` | Hand-authored profiles + expected Stage 2 graph (exact-match) |
| `scratch/` | Local LLM extraction outputs (gitignored) |

```bash
# From backend/
python scripts/verify_system_graph.py

# Optional live extraction (needs DB + Azure + cleared manuals):
python scripts/extract_interaction_profile.py \
  --manufacturer Victron --model "SmartSolar" \
  --out fixtures/pipeline/scratch/victron_mppt.json \
  --citations-out fixtures/pipeline/scratch/victron_mppt.citations.json
```

See [`../guide-pipeline-plan.md`](../guide-pipeline-plan.md).
