# Cattitude — Manual Query Chatbot: Implementation Plan

## Overview

This plan adds an AI-powered manual query chatbot to the existing Cattitude PWA using a RAG architecture. The work is divided into four stages. **Stage 1 is the MVP**: a working chatbot tab in the Cattitude app that can answer questions grounded in one or more vessel manuals. Stages 2–4 build toward the full multi-tenant SaaS platform.

The existing app is a single-file static HTML PWA. The MVP adds a Python backend alongside it while keeping the frontend largely unchanged except for a new Chat tab.

**Hosting strategy:** Railway for the MVP (backend + database, ~$10/month total, minimal configuration). Cloudflare Pages for the frontend (free, already familiar). Migration to Digital Ocean is noted at Stage 2 for when the platform has paying customers and operational consolidation on familiar infrastructure makes sense.

---

## Stage 1 — MVP: Chat Query of Cattitude Manuals

**Goal:** A user opens the Cattitude app, taps a "Ask" tab, types a question ("How do I bleed the engine fuel system?"), and receives an accurate answer grounded in the actual Yanmar manual. No auth, no multi-tenancy, no admin UI. Just a working end-to-end RAG pipeline for one boat.

### 1.1 Repository Structure

Set up the project as a monorepo from the start. This avoids painful restructuring later.

```
cattitude/
├── app/                        # The existing PWA frontend
│   └── index.html              # Existing Cattitude app (copy here)
├── backend/                    # New Python RAG backend
│   ├── main.py                 # FastAPI entry point
│   ├── ingest.py               # Document ingestion pipeline
│   ├── query.py                # RAG query logic
│   ├── config.py               # Settings / env vars
│   ├── requirements.txt
│   └── .env                    # Local secrets (git-ignored)
├── manuals/                    # Raw PDF manuals (git-ignored, large files)
│   └── .gitkeep
├── data/                       # Processed/persisted vector store
│   └── .gitkeep
├── .gitignore
└── README.md
```

### 1.2 Backend Dependencies

**`backend/requirements.txt`**
```
fastapi
uvicorn[standard]
python-dotenv
llama-index-core
llama-index-vector-stores-postgres
llama-index-embeddings-azure-openai
llama-index-llms-azure-openai
llama-index-readers-file
docling
pydantic
pydantic-settings
psycopg2-binary
sqlalchemy
```

> **Note on embeddings model:** Use `text-embedding-3-small` via Azure OpenAI. It is cheap, fast, and 1536-dimensional — well-matched to pgvector's default. Avoid `ada-002` for new projects.

### 1.3 Environment Configuration

**`backend/config.py`**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Azure OpenAI
    azure_openai_api_key: str
    azure_openai_endpoint: str
    azure_openai_api_version: str = "2024-02-01"
    azure_openai_embedding_deployment: str  # e.g. "text-embedding-3-small"
    azure_openai_chat_deployment: str       # e.g. "gpt-4o"

    # Database
    database_url: str  # postgresql://user:pass@host:5432/dbname

    # App
    cors_origins: list[str] = ["http://localhost:8080", "http://127.0.0.1:8080"]

    class Config:
        env_file = ".env"

settings = Settings()
```

**`backend/.env`** (template — do not commit actual values)
```
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o
DATABASE_URL=postgresql://postgres:password@localhost:5432/cattitude
```

### 1.4 Database Setup

For the MVP, use **Railway Postgres** — it includes pgvector and is provisioned in minutes alongside the backend service, keeping everything under one Railway project and one bill.

**Railway Postgres setup:**
1. Create a new project at railway.app
2. Add a Postgres database service to the project (Railway's Postgres image ships with pgvector pre-installed)
3. From the database service panel, copy the `DATABASE_URL` connection string into your `.env`
4. Connect to the database and run: `CREATE EXTENSION IF NOT EXISTS vector;`

**Local development:**
Run Postgres locally via Docker so development matches production exactly:
```bash
docker run -d \
  --name cattitude-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=cattitude \
  -p 5432:5432 \
  ankane/pgvector
```
Then set `DATABASE_URL=postgresql://postgres:password@localhost:5432/cattitude` in your local `.env`.

LlamaIndex's `PGVectorStore` will create the required table automatically on first ingest.

**Schema that LlamaIndex creates (for reference):**
```sql
-- Created automatically by LlamaIndex PGVectorStore
CREATE TABLE data_cattitude (
    id UUID PRIMARY KEY,
    text TEXT,
    metadata_ JSONB,      -- stores source, page, manual_id, equipment tags
    node_id TEXT,
    embedding VECTOR(1536)
);
```

The `metadata_` JSONB column is where equipment tagging will live in later stages.

### 1.5 Ingestion Pipeline

**`backend/ingest.py`**

This script is run manually (or via CLI) whenever a new manual is added. It is NOT part of the FastAPI server.

```python
"""
Manual ingestion pipeline.
Usage: python ingest.py --file ../manuals/yanmar_4jh45_operators.pdf --manual-id yanmar_4jh45_operators
"""
import argparse
from pathlib import Path

from docling.document_converter import DocumentConverter
from llama_index.core import Document, VectorStoreIndex, StorageContext
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.vector_stores.postgres import PGVectorStore

from config import settings


def ingest_manual(file_path: Path, manual_id: str, equipment_tags: list[str] = None):
    """
    Parse a PDF with Docling, chunk it, embed it, and store in pgvector.
    
    Args:
        file_path: Path to the PDF manual
        manual_id: Stable identifier e.g. "yanmar_4jh45_operators"
        equipment_tags: Optional list e.g. ["yanmar", "4jh45", "engine"]
    """
    print(f"Converting {file_path} with Docling...")
    converter = DocumentConverter()
    result = converter.convert(str(file_path))
    markdown_text = result.document.export_to_markdown()

    # Wrap in LlamaIndex Document with metadata
    metadata = {
        "manual_id": manual_id,
        "source_file": file_path.name,
        "equipment_tags": equipment_tags or [],
    }
    document = Document(text=markdown_text, metadata=metadata)

    # Chunk — 512 tokens with 64 overlap works well for technical manuals
    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)
    nodes = splitter.get_nodes_from_documents([document])

    # Propagate metadata to each node (important for filtered retrieval later)
    for node in nodes:
        node.metadata.update(metadata)

    print(f"Created {len(nodes)} chunks from {file_path.name}")

    # Set up embedding model
    embed_model = AzureOpenAIEmbedding(
        model="text-embedding-3-small",
        deployment_name=settings.azure_openai_embedding_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )

    # Set up vector store
    vector_store = PGVectorStore.from_params(
        connection_string=settings.database_url,
        table_name="cattitude",          # MVP: single table
        embed_dim=1536,
    )
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    # Index nodes — this embeds and stores them
    print("Embedding and storing chunks...")
    VectorStoreIndex(nodes, storage_context=storage_context, embed_model=embed_model)
    print(f"Done. {len(nodes)} chunks stored for manual '{manual_id}'")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--manual-id", required=True)
    parser.add_argument("--tags", nargs="*", default=[])
    args = parser.parse_args()
    ingest_manual(Path(args.file), args.manual_id, args.tags)
```

**Example usage:**
```bash
cd backend
python ingest.py --file ../manuals/yanmar_4jh45_operators.pdf \
                 --manual-id yanmar_4jh45_operators \
                 --tags yanmar 4jh45 engine
```

### 1.6 Query Engine

**`backend/query.py`**

```python
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.vector_stores.postgres import PGVectorStore

from config import settings


def build_query_engine():
    """Build and return a LlamaIndex query engine backed by pgvector."""

    embed_model = AzureOpenAIEmbedding(
        model="text-embedding-3-small",
        deployment_name=settings.azure_openai_embedding_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )

    llm = AzureOpenAI(
        model="gpt-4o",
        deployment_name=settings.azure_openai_chat_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )

    vector_store = PGVectorStore.from_params(
        connection_string=settings.database_url,
        table_name="cattitude",
        embed_dim=1536,
    )
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_vector_store(
        vector_store, storage_context=storage_context, embed_model=embed_model
    )

    retriever = VectorIndexRetriever(index=index, similarity_top_k=5)

    synthesizer = get_response_synthesizer(
        llm=llm,
        response_mode="compact",
    )

    return RetrieverQueryEngine(retriever=retriever, response_synthesizer=synthesizer)


# Build once at module load — reused across requests
_query_engine = None

def get_query_engine():
    global _query_engine
    if _query_engine is None:
        _query_engine = build_query_engine()
    return _query_engine
```

### 1.7 FastAPI Server

**`backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio

from config import settings
from query import get_query_engine

app = FastAPI(title="Cattitude Manual API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["POST"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str
    conversation_history: list[dict] = []  # [{role, content}] for future multi-turn


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]  # [{manual_id, text_snippet}]


@app.post("/query", response_model=QueryResponse)
async def query_manuals(req: QueryRequest):
    engine = get_query_engine()

    # Run in thread pool to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, engine.query, req.question)

    sources = []
    if hasattr(response, "source_nodes"):
        for node in response.source_nodes:
            sources.append({
                "manual_id": node.metadata.get("manual_id", "unknown"),
                "snippet": node.text[:200] + "..." if len(node.text) > 200 else node.text,
                "score": round(node.score, 3) if node.score else None,
            })

    return QueryResponse(answer=str(response), sources=sources)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Run the backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 1.8 Frontend — Adding the Chat Tab

The existing `index.html` needs three additions:

**1. Add "Ask" to the bottom nav** (after the Fix tab entry):
```html
<button class="nav-tab" id="tab-ask" onclick="switchTab('ask')">
  <span class="nav-icon">💬</span>Ask
</button>
```

**2. Add the Ask screen** (alongside the other `<div id="screen-*">` screens):
```html
<div id="screen-ask" class="screen">
  <!-- Chat history -->
  <div id="chat-messages" style="
    padding: 16px;
    padding-bottom: 90px;
    min-height: calc(100vh - var(--header-height) - var(--tab-height) - 70px);
    display: flex;
    flex-direction: column;
    gap: 12px;
  ">
    <!-- Welcome state -->
    <div id="chat-welcome" style="text-align:center;padding:40px 20px;">
      <div style="font-size:48px;margin-bottom:12px">📖</div>
      <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;
                  color:var(--navy);margin-bottom:8px">Ask About Cattitude</div>
      <div style="font-size:14px;color:var(--text-light);line-height:1.5">
        Ask any question about the boat's systems, equipment, or manuals.<br>
        <em>Try: "How do I bleed the fuel system?"</em>
      </div>
      <!-- Suggested questions -->
      <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px">
        <button class="suggestion-chip" onclick="askSuggestion(this)">How do I change the engine oil?</button>
        <button class="suggestion-chip" onclick="askSuggestion(this)">What is the watermaker maintenance schedule?</button>
        <button class="suggestion-chip" onclick="askSuggestion(this)">How do I reset the chart plotter?</button>
      </div>
    </div>
  </div>

  <!-- Input bar — fixed above bottom nav -->
  <div id="chat-input-bar" style="
    position: fixed;
    bottom: var(--tab-height);
    left: 0; right: 0;
    background: var(--white);
    border-top: 1px solid var(--sand-mid);
    padding: 10px 12px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    display: flex;
    gap: 8px;
    align-items: flex-end;
    z-index: 90;
  ">
    <textarea id="chat-input" rows="1" placeholder="Ask about any system or manual…"
      style="
        flex: 1;
        border: 1.5px solid var(--sand-mid);
        border-radius: 20px;
        padding: 10px 14px;
        font-family: 'DM Sans', sans-serif;
        font-size: 15px;
        color: var(--text-dark);
        background: var(--sand);
        resize: none;
        outline: none;
        max-height: 100px;
        overflow-y: auto;
      "
      oninput="autoResizeChat(this)"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMessage();}"
    ></textarea>
    <button id="chat-send-btn" onclick="sendChatMessage()" style="
      width: 40px; height: 40px;
      border-radius: 50%;
      background: var(--teal-dark);
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    ">↑</button>
  </div>
</div>
```

**3. Add the CSS and JavaScript** (inside the existing `<style>` and `<script>` blocks):

```css
/* --- CHAT TAB --- */
.suggestion-chip {
  background: var(--white);
  border: 1.5px solid var(--sand-mid);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--text-mid);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s;
}
.suggestion-chip:active { border-color: var(--teal); color: var(--teal-dark); }

.chat-bubble-wrap { display: flex; flex-direction: column; gap: 4px; }
.chat-bubble-wrap.user { align-items: flex-end; }
.chat-bubble-wrap.assistant { align-items: flex-start; }

.chat-bubble {
  max-width: 85%;
  padding: 11px 14px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
}
.chat-bubble.user {
  background: var(--navy);
  color: white;
  border-bottom-right-radius: 4px;
}
.chat-bubble.assistant {
  background: var(--white);
  color: var(--text-dark);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 6px rgba(13,33,55,0.08);
}
.chat-bubble.error {
  background: var(--coral-light);
  color: #8B1A16;
  border-bottom-left-radius: 4px;
}
.chat-sources {
  font-size: 11px;
  color: var(--text-light);
  margin-top: 4px;
  padding-left: 4px;
}
.chat-typing {
  display: flex;
  gap: 4px;
  padding: 12px 14px;
  background: var(--white);
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 6px rgba(13,33,55,0.08);
  width: fit-content;
}
.chat-typing span {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--text-light);
  animation: chatBounce 1.2s infinite;
}
.chat-typing span:nth-child(2) { animation-delay: 0.2s; }
.chat-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes chatBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-6px); opacity: 1; }
}
```

```javascript
// ── CHAT TAB ────────────────────────────────────────────

const BACKEND_URL = 'http://localhost:8000'; // Change to production URL when deployed

let chatHistory = [];
let chatBusy = false;

function autoResizeChat(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function askSuggestion(btn) {
  document.getElementById('chat-input').value = btn.textContent;
  sendChatMessage();
}

function appendChatBubble(role, text, sources) {
  const welcome = document.getElementById('chat-welcome');
  if (welcome) welcome.remove();

  const msgs = document.getElementById('chat-messages');
  const wrap = document.createElement('div');
  wrap.className = `chat-bubble-wrap ${role}`;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  wrap.appendChild(bubble);

  if (sources && sources.length > 0) {
    const src = document.createElement('div');
    src.className = 'chat-sources';
    const ids = [...new Set(sources.map(s => s.manual_id))].join(', ');
    src.textContent = `📄 Source: ${ids}`;
    wrap.appendChild(src);
  }

  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
  return bubble;
}

function showTypingIndicator() {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.id = 'chat-typing';
  div.className = 'chat-bubble-wrap assistant';
  div.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTypingIndicator() {
  const t = document.getElementById('chat-typing');
  if (t) t.remove();
}

async function sendChatMessage() {
  if (chatBusy) return;
  const input = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  input.style.height = 'auto';
  chatBusy = true;
  document.getElementById('chat-send-btn').style.opacity = '0.5';

  appendChatBubble('user', question);
  showTypingIndicator();

  try {
    const res = await fetch(`${BACKEND_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        conversation_history: chatHistory,
      }),
    });

    removeTypingIndicator();

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const data = await res.json();
    appendChatBubble('assistant', data.answer, data.sources);

    // Keep last 10 turns of history for future multi-turn support
    chatHistory.push({ role: 'user', content: question });
    chatHistory.push({ role: 'assistant', content: data.answer });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  } catch (err) {
    removeTypingIndicator();
    const bubble = appendChatBubble('assistant', '', null);
    bubble.className = 'chat-bubble error';
    bubble.textContent = navigator.onLine
      ? '⚠️ Couldn\'t reach the manual server. Try again in a moment.'
      : '📵 You\'re offline. Manual queries require a connection.';
  } finally {
    chatBusy = false;
    document.getElementById('chat-send-btn').style.opacity = '1';
  }
}
```

### 1.9 Running the MVP End-to-End

```bash
# 1. Set up the backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in .env with your Azure OpenAI credentials
# For local dev, DATABASE_URL points to your local Docker Postgres
# For Railway deployment, DATABASE_URL is copied from the Railway dashboard

# 2. Ingest at least one manual
python ingest.py \
  --file ../manuals/yanmar_4jh45_operators.pdf \
  --manual-id yanmar_4jh45_operators \
  --tags yanmar 4jh45 engine

# 3. Start the backend
uvicorn main:app --reload --port 8000

# 4. Open the frontend
# Open app/index.html in a browser, or serve it:
npx serve app/ -p 8080
# Then tap the "Ask" tab and try a question
```

### 1.10 MVP Acceptance Criteria

- [ ] At least one manual is ingested and stored in pgvector
- [ ] A question about that manual returns a grounded answer (not a hallucination)
- [ ] Source attribution is shown beneath the answer
- [ ] The chat UI matches the Cattitude design language (navy, teal, sand palette)
- [ ] Offline error state displays gracefully
- [ ] The existing five tabs are completely unaffected

---

## Stage 2 — Production Deployment

**Goal:** Move from localhost to a deployed, stable service. Still single-vessel, single-tenant.

### Railway Deployment

Railway deploys directly from a GitHub repo. The setup for the FastAPI backend:

1. Push the monorepo to GitHub
2. In Railway, create a new project and connect the GitHub repo
3. Add a service pointing to the `backend/` directory
4. Set the start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all environment variables from `.env` in the Railway dashboard (never commit the `.env` file)
6. Railway auto-deploys on every push to `main`

The Railway Postgres database provisioned in Stage 1 is already in the same project — Railway injects the `DATABASE_URL` automatically as a shared variable.

**Estimated Railway cost at this stage:** ~$5/month backend + ~$5/month Postgres = **~$10/month total.**

### Frontend Deployment

Deploy the `app/` directory to **Cloudflare Pages**:
1. Connect the GitHub repo to Cloudflare Pages
2. Set build output directory to `app/`
3. No build command needed for static HTML
4. Cloudflare assigns a `*.pages.dev` URL immediately; add a custom domain when ready

The frontend is now served over HTTPS, which is required for the browser to make API calls to the Railway backend. Update `BACKEND_URL` in `index.html` to the Railway service URL.

### Additional Stage 2 Work

- Replace the hardcoded `BACKEND_URL` with an environment-aware config (a `config.js` file generated at deploy time, or a `<meta>` tag injected by the build)
- Add basic **rate limiting** (`slowapi`) to prevent runaway API costs
- Add **request logging** so you can see what people are asking and identify missing manual coverage
- Add a `system_prompt` to the query engine: *"You are a helpful assistant for the sailing catamaran Cattitude. Answer only from the provided manual excerpts. If the answer is not in the manuals, say so clearly."*
- Implement **streaming responses** (`FastAPI StreamingResponse` + SSE) so the answer appears word-by-word — meaningful UX improvement on marina WiFi

### Migration Path to Digital Ocean (When Ready)

When the platform has paying customers and consolidating onto familiar infrastructure makes sense, the migration is straightforward:

| Component | From | To | Effort |
|---|---|---|---|
| FastAPI backend | Railway service | DO App Platform | Redeploy from same GitHub repo, ~1 hour |
| Postgres + pgvector | Railway Postgres | DO Managed Postgres | `pg_dump` / `pg_restore`, ~2 hours |
| Frontend | Cloudflare Pages | Cloudflare Pages | No change needed |

The DO Managed Postgres starts at $15/month (versus Railway's ~$5/month usage-based), so the cost trade-off is familiarity and consolidation against a ~$10/month increase. DO App Platform starts at $5/month. **Total DO cost: ~$20-27/month** versus Railway's ~$10/month. The right time to migrate is when operational simplicity on known infrastructure outweighs the cost difference — typically when you have multiple paying customers.

---

## Stage 3 — Multi-Vessel & Multi-Tenant Foundation

**Goal:** The architecture can support multiple boats, each scoped to their own manual set. Still no customer-facing admin UI — all onboarding done by your team.

### Data Model

Introduce a proper relational schema alongside the vector store:

```sql
-- Equipment library
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    category TEXT NOT NULL,       -- engine, watermaker, chartplotter, etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Manual library
CREATE TABLE manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id),
    manual_type TEXT,             -- operators, service, installation
    source_filename TEXT,
    ingested_at TIMESTAMPTZ DEFAULT now()
);

-- Vessel registry
CREATE TABLE vessels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,           -- "Cattitude"
    charter_company TEXT,         -- "Cruise Abaco"
    slug TEXT UNIQUE NOT NULL,    -- "cattitude" — used in URL/config
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Vessel configuration (what equipment is on each boat)
CREATE TABLE vessel_equipment (
    vessel_id UUID REFERENCES vessels(id),
    equipment_id UUID REFERENCES equipment(id),
    notes TEXT,                   -- e.g. "2019 model, serial #XYZ"
    PRIMARY KEY (vessel_id, equipment_id)
);
```

### Metadata-Filtered RAG

Update the vector store table to include `vessel_id` or `equipment_id` tags in chunk metadata. At query time, look up the vessel's equipment list and pass a metadata filter to the retriever:

```python
from llama_index.core.vector_stores import MetadataFilters, ExactMatchFilter

def get_vessel_filters(vessel_id: str, db) -> MetadataFilters:
    equipment_ids = db.query_vessel_equipment_ids(vessel_id)
    manual_ids = db.query_manual_ids_for_equipment(equipment_ids)
    return MetadataFilters(filters=[
        ExactMatchFilter(key="manual_id", value=mid)
        for mid in manual_ids
    ])
```

This means one shared vector table serves all vessels — no per-vessel data isolation needed at the DB level.

### API Changes

The `/query` endpoint gains a `vessel_id` parameter. In Stage 3 this is passed by the frontend config (each deployed app knows its vessel). In Stage 4 it will come from auth.

---

## Stage 4 — Intake Pipeline & App Generation

**Goal:** A new vessel can be onboarded semi-automatically, and a customised app is generated for it.

### Intake Pipeline

Build a separate **intake service** (can be a new FastAPI router or a separate app):

1. **Signal-K scan endpoint** — accepts a Signal-K snapshot JSON, extracts device identifiers (NMEA device descriptions, product codes), and fuzzy-matches them against the equipment library
2. **Photo OCR endpoint** — accepts an image, uses Azure Vision or Claude to extract manufacturer/model text from equipment nameplates
3. **Confidence routing** — high-confidence matches auto-associate; medium-confidence go to a human review queue; no-match flags a manual research task
4. **Manual research queue** — simple internal web UI (FastAPI + Jinja2 is sufficient) showing unmatched equipment with suggested search terms, allowing a team member to find, upload, and ingest the correct manual

### App Generation

Given a `vessel_id` (with its configuration fully populated), generate a customised version of the Cattitude app:

- A **generation script** reads the vessel configuration from the database and a **Jinja2 template** of `index.html`
- It substitutes vessel name, charter company, equipment-specific checklists, system descriptions, and troubleshooting guides
- Output is a self-contained `index.html` deployed to a vessel-specific URL (e.g. `cattitude.yourplatform.com`)
- As the fleet grows and static HTML becomes limiting, this generation step is replaced by an **Ionic build pipeline** that compiles a vessel-configured app bundle

### Authentication

At this stage, add auth to protect the query API:

- **JWT-based auth** via FastAPI for the admin/intake interface — straightforward to implement with `python-jose` and `passlib`, keeps auth in your own stack
- **Short-lived signed tokens** for guest app access — generated when a charter is created, embedded in the app URL or QR code given to guests, expire at charter end
- No account creation required for guests
- If auth complexity grows, Supabase Auth can be added as a dedicated auth layer without touching the database or vector store (it integrates via JWTs)

---

## Key Decisions to Revisit After Stage 1

| Decision | MVP choice | Revisit when |
|---|---|---|
| Embedding model | Azure `text-embedding-3-small` | Stage 3, if retrieval quality is poor |
| Vector store | Railway pgvector | Scale issues (unlikely before 50+ vessels) |
| LLM | Azure OpenAI GPT-4o | Could swap to Claude for longer docs |
| Chunking strategy | 512 tokens / 64 overlap | After reviewing source quality from real manuals |
| Frontend framework | Static HTML | Stage 4 / when generation complexity warrants Ionic |
| Streaming | Not in MVP | Stage 2 — meaningful UX improvement |
| Hosting | Railway (~$10/month) | Migrate to DO when paying customers warrant consolidation |

---

## Immediate Next Steps for Cursor

1. Create the repository structure as shown in 1.1
2. Drop the existing `index.html` into `app/`
3. Build `config.py`, `requirements.txt`, and `.env` template
4. Start local Postgres via Docker (see 1.4) so development matches Railway exactly
5. Build `ingest.py` and test it with one PDF
6. Build `query.py` and test it from a Python REPL before wiring up the API
7. Build `main.py` and test the `/query` endpoint with curl or Postman
8. Add the Chat tab to `index.html` using the code in 1.8
9. Verify end-to-end locally with a real question about the ingested manual
10. Create a Railway project, provision Postgres, deploy the backend, deploy the frontend to Cloudflare Pages
