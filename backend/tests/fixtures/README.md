# Pipeline test fixtures

Fixtures here exercise **general** Stage 1 / 1.5 / 2 rules for any equipment.
File names describe the *rule under test*, not a product special-case.

| File | Role |
|------|------|
| `stage15_defective_extraction.json` | Defective extract: dangling `needed_for`, builtin↔requires contradiction, unknown `safety_role` keys, string/verbatim evidence. Asserts flags **fire**. |
| `smartsolar_corrected_extraction.json` | Golden extract shape: zero `evidence_verbatim`, shutdown/restart **situational**, error-code action **emergency**, `has_emergency_procedure: true`. **Do not reshape to match live scratch** — see [`POLICY.md`](POLICY.md). |
| `conditional_capability_device.json` | Capability + `requires_devices[].needed_for` → `data_roles.*`. |
| `conditional_capability_hub_*.json` | Companion hub for reachability when the dependency is on the vessel. |

```bash
make pipeline-verify              # offline fixtures
make pipeline-compare-scratch     # live scratch vs SmartSolar golden (fails on drift)
make pipeline-regression          # both
```
