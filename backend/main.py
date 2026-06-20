from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from english_text import extract_english
from query import ContentFilterError, run_query

logger = logging.getLogger(__name__)

app = FastAPI(title="Cattitude Manual API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str
    conversation_history: list[dict] = Field(
        default_factory=list,
        description="[{role, content}] reserved for future multi-turn",
    )


class SourceItem(BaseModel):
    node_id: str | None = None
    manual_id: str
    source_file: str | None = None
    page_start: int | None = None
    page_end: int | None = None
    snippet: str
    score: float | None = None


def _metadata_int(value: object) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _source_from_node(node: object) -> SourceItem | None:
    if hasattr(node, "get_content"):
        raw = node.get_content()
    else:
        raw = getattr(node, "text", None) or ""
    text = extract_english(str(raw)).strip()
    if not text:
        return None
    metadata = getattr(node, "metadata", None) or {}
    score_raw = getattr(node, "score", None)
    score = round(float(score_raw), 3) if score_raw is not None else None
    node_id = getattr(node, "node_id", None)

    return SourceItem(
        node_id=str(node_id) if node_id else None,
        manual_id=str(metadata.get("manual_id", "unknown")),
        source_file=metadata.get("source_file"),
        page_start=_metadata_int(metadata.get("page_start")),
        page_end=_metadata_int(metadata.get("page_end")),
        snippet=text[:2000] + "..." if len(text) > 2000 else text,
        score=score,
    )


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
    except Exception as exc:
        logger.exception("Query failed")
        raise HTTPException(
            status_code=500,
            detail="Manual query failed. Check Railway logs for details.",
        ) from exc

    sources: list[SourceItem] = []
    if hasattr(response, "source_nodes"):
        for node in response.source_nodes:
            item = _source_from_node(node)
            if item is not None:
                sources.append(item)

    return QueryResponse(answer=str(response), sources=sources)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
