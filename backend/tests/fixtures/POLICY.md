# Fixture change policy — Clever Sailor pipeline

## Rule

**Extraction / Stage 1.5 / Stage 2 regression fixtures under
`backend/tests/fixtures/` are modified only by explicit human instruction
in chat or a PR description.** Agents and automated PRs must not “fix” or
reshape fixtures to match the latest live LLM extract.

## Authorization

Every fixture change commit or PR must include **one** of:

1. A PR description / commit body line:
   `Fixture-Auth: <ticket-or-chat-ref> — <one-line reason>`
2. Or a review comment quoting the human instruction that authorized the edit.

CODEOWNERS requires review from `@ilopa` (repo owner) on fixture paths.

## What belongs in fixtures vs scratch

| Path | Role | May agents rewrite? |
|------|------|---------------------|
| `tests/fixtures/*.json` | Golden / defect regression | **No** without `Fixture-Auth` |
| `fixtures/pipeline/scratch/` | Live extract output (gitignored) | Yes — re-extract anytime |
| `fixtures/pipeline/outremer/` | Hand Stage 2 vessel fixture | Same as golden (human auth) |

## Local gates

```bash
cd backend
make pipeline-verify              # offline fixture suite (no Azure)
make pipeline-compare-scratch     # fail if scratch ≠ SmartSolar golden asserts
make pipeline-regression          # both
```

There is **no** GitHub Actions job for live Azure extraction yet — live
comparison is a local make target after you re-extract.
