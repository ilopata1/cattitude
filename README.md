# Cattitude

Monorepo for the Cattitude charter PWA and manual-query RAG backend.

| Path | Purpose |
|------|---------|
| `app/` | Legacy static PWA (`index.html`) — keep until Ionic web reaches parity |
| `mobile/` | Ionic Angular client (web + future Capacitor builds) |
| `backend/` | Python FastAPI + RAG service (`requirements.txt`, `main.py`) |
| `manuals/` | Raw PDF manuals (gitignored; use `.gitkeep` to keep folder) |
| `data/` | Local processed / cache data (optional; gitignored except `.gitkeep`) |

**Run the frontend locally:**

- Legacy PWA: serve the `app/` directory (for example `npx serve app -p 8080`)
- Ionic app: `cd mobile && npm install && npm start` then open http://localhost:8100

**Run the backend locally:** from `backend/`, copy `.env.example` to `.env`, fill in Azure OpenAI and Postgres (`DATABASE_URL`), enable the `vector` extension in Postgres, then:

```bash
cd backend
python -m venv .venv
# activate .venv, then:
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Ingest a manual (still from `backend/`):

```bash
python ingest.py --file ../manuals/your_manual.pdf --manual-id your_manual_id --tags engine brand
```

Clear existing vectors before a full re-ingest (from repo root):

```bash
python utilities/clear_vector_store.py
```

Regenerate Ionic bootstrap content after editing `app/index.html`:

```bash
node utilities/extract_bootstrap_content.mjs
```

See `cattitude-rag-implementation-plan.md` for Railway deployment and later stages.
