# Cattitude

Monorepo for the Cattitude charter companion app and manual-query RAG backend.

**Live app:** https://ilopata1.github.io/cattitude/

| Path | Purpose |
|------|---------|
| `mobile/` | Ionic Angular client (production web app + future Capacitor builds) |
| `backend/` | Python FastAPI + RAG service (`requirements.txt`, `main.py`) |
| `app/` | Archived legacy single-file PWA (reference only; no longer deployed) |
| `manuals/` | Raw PDF manuals (gitignored; use `.gitkeep` to keep folder) |
| `data/` | Local processed / cache data (optional; gitignored except `.gitkeep`) |

## Frontend

Production deploys from `mobile/` to GitHub Pages (`pages-live` branch) via `.github/workflows/sync-mobile-pages-live.yml`.

**Local development:**

```bash
cd mobile
npm install
npm start
```

Open http://localhost:8100

**Production build** (output in `mobile/www/`):

```bash
cd mobile
npm run build
```

## Backend

From `backend/`, copy `.env.example` to `.env`, fill in Azure OpenAI and Postgres (`DATABASE_URL`), enable the `vector` extension in Postgres, then:

```bash
cd backend
python -m venv .venv
# activate .venv, then:
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Production API: `https://cattitude-production.up.railway.app` (Ask tab). Set `CORS_ORIGINS` on Railway to include `https://ilopata1.github.io`.

Ingest a manual (from `backend/`):

```bash
python ingest.py --file ../manuals/your_manual.pdf --manual-id your_manual_id --tags engine brand
```

Clear existing vectors before a full re-ingest (from repo root):

```bash
python utilities/clear_vector_store.py
```

## Content updates

Edit **`mobile/src/data/bootstrap/cattitude.json`** directly (systems, checklists, fixes, locations, branding, emergency contacts, and the `ui` section for home rules / Do menu / Know layout).

Validate structure before pushing:

```bash
node utilities/validate_bootstrap_content.mjs
```

Push `mobile/` changes to trigger a Pages deploy. `utilities/extract_bootstrap_content.mjs` is legacy-only for one-time migration from `app/index.html`.

See `cattitude-rag-implementation-plan.md` for Railway deployment and later Clever Sailor stages.
