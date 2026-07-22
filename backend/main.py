from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine

from admin.routes import router as admin_router
from config import settings
from db import postgres_connection_strings
from english_text import extract_english
from guide_api import router as guide_router
from manual_titles import list_manual_ids_for_vessel, lookup_manual_title
from query import ContentFilterError, run_query

logger = logging.getLogger(__name__)

app = FastAPI(title="Clever Sailor API")

app.include_router(guide_router)
app.include_router(admin_router)

_admin_static = Path(__file__).resolve().parent / "admin" / "static"
app.mount("/admin/static", StaticFiles(directory=str(_admin_static)), name="admin-static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

NO_VESSEL_MANUALS_DETAIL = (
    "No cleared manuals linked to this vessel's equipment."
)


class QueryRequest(BaseModel):
    question: str
    vessel_id: str = Field(..., min_length=1, description="Vessel UUID for inventory-scoped Ask")
    conversation_history: list[dict] = Field(
        default_factory=list,
        description="[{role, content}] reserved for future multi-turn",
    )

    @field_validator("vessel_id")
    @classmethod
    def _strip_vessel_id(cls, value: str) -> str:
        stripped = (value or "").strip()
        if not stripped:
            raise ValueError("vessel_id is required")
        return stripped


class SourceItem(BaseModel):
    node_id: str | None = None
    manual_id: str
    title: str | None = None
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


def _resolve_manual_ids(vessel_id: str) -> list[str]:
    sync_url, _ = postgres_connection_strings(settings.database_url)
    engine = create_engine(sync_url, pool_pre_ping=True)
    with engine.connect() as conn:
        return list_manual_ids_for_vessel(conn, vessel_id)


@app.post("/query", response_model=QueryResponse)
async def query_manuals(req: QueryRequest) -> QueryResponse:
    vessel_id = req.vessel_id

    try:
        manual_ids = await asyncio.get_event_loop().run_in_executor(
            None, _resolve_manual_ids, vessel_id
        )
    except Exception as exc:
        logger.exception("Ask vessel manual allow-list failed")
        raise HTTPException(
            status_code=500,
            detail="Manual query failed. Check Railway logs for details.",
        ) from exc

    if not manual_ids:
        raise HTTPException(status_code=422, detail=NO_VESSEL_MANUALS_DETAIL)

    loop = asyncio.get_event_loop()
    try:
        response = await loop.run_in_executor(
            None,
            lambda: run_query(req.question, manual_ids=manual_ids),
        )
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
        allowed = set(manual_ids)
        for node in response.source_nodes:
            item = _source_from_node(node)
            if item is None:
                continue
            # Defense in depth: never return a source outside the vessel allow-list.
            if item.manual_id not in allowed:
                logger.warning(
                    "Ask source manual_id %s not in vessel allow-list; dropping",
                    item.manual_id,
                )
                continue
            sources.append(item)

    if sources:
        try:
            sync_url, _ = postgres_connection_strings(settings.database_url)
            engine = create_engine(sync_url, pool_pre_ping=True)
            with engine.connect() as conn:
                enriched: list[SourceItem] = []
                for item in sources:
                    title = lookup_manual_title(conn, item.manual_id)
                    enriched.append(
                        item.model_copy(update={"title": title}) if title else item
                    )
                sources = enriched
        except Exception:
            # Title enrichment is best-effort; never fail a successful Ask answer.
            logger.exception("Manual title enrichment failed")

    return QueryResponse(answer=str(response), sources=sources)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
