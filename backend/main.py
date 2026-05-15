from __future__ import annotations

import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from query import get_query_engine

app = FastAPI(title="Cattitude Manual API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str
    conversation_history: list[dict] = Field(
        default_factory=list,
        description="[{role, content}] reserved for future multi-turn",
    )


class SourceItem(BaseModel):
    manual_id: str
    snippet: str
    score: float | None = None


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceItem]


@app.post("/query", response_model=QueryResponse)
async def query_manuals(req: QueryRequest) -> QueryResponse:
    engine = get_query_engine()

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, engine.query, req.question)

    sources: list[SourceItem] = []
    if hasattr(response, "source_nodes"):
        for node in response.source_nodes:
            text = node.text or ""
            snippet = text[:200] + "..." if len(text) > 200 else text
            score = round(float(node.score), 3) if node.score is not None else None
            sources.append(
                SourceItem(
                    manual_id=str(node.metadata.get("manual_id", "unknown")),
                    snippet=snippet,
                    score=score,
                )
            )

    return QueryResponse(answer=str(response), sources=sources)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
