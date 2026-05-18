from __future__ import annotations

import asyncio

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from query import ContentFilterError, run_query

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
    loop = asyncio.get_event_loop()
    try:
        response = await loop.run_in_executor(None, run_query, req.question)
    except ContentFilterError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

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
