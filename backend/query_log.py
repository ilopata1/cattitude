"""Persist Ask (/query) turns for coverage review and synthesis-prompt replay."""

from __future__ import annotations

import json
import logging
from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from prompts.ask.registry import get_ask_text
from query import format_conversation_str

logger = logging.getLogger(__name__)

_PASTE_TEMPLATE = get_ask_text("marine_context") + get_ask_text("text_qa")


def _is_uuid(value: str | None) -> bool:
    if not value:
        return False
    try:
        UUID(str(value))
        return True
    except (TypeError, ValueError):
        return False


def build_synthesis_paste_prompt(
    *,
    retrieved_context: str | None,
    conversation_history: Sequence[dict] | None,
    prepared_query: str | None,
    question: str | None = None,
) -> str:
    """Assemble the Ask synthesis prompt for hand-paste into another model."""
    history = list(conversation_history or [])
    cleaned: list[dict[str, str]] = []
    for item in history:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or "").strip().lower()
        content = str(item.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            cleaned.append({"role": role, "content": content})

    query_str = (prepared_query or "").strip()
    if not query_str and question:
        query_str = question.strip()

    return _PASTE_TEMPLATE.format(
        context_str=(retrieved_context or "").strip() or "(none)",
        conversation_str=format_conversation_str(cleaned),
        query_str=query_str or "(none)",
    )


def insert_query_log(
    conn: Connection,
    *,
    vessel_id: str,
    question: str,
    answer: str | None,
    charter_id: str | None = None,
    source_manual_ids: Sequence[str] | None = None,
    response_time_ms: int | None = None,
    retrieved_context: str | None = None,
    conversation_history: Sequence[dict] | None = None,
    retrieve_query: str | None = None,
    prepared_query: str | None = None,
    cited: Sequence[int] | None = None,
    chat_deployment: str | None = None,
    retrieved_count: int | None = None,
    no_excerpts: bool = False,
    relevance: str | None = None,
    retrieve_queries: Sequence[str] | None = None,
    troubleshooting_retrieve: bool = False,
) -> str | None:
    """Insert one Ask log row. Returns new id, or None if vessel_id is invalid."""
    if not _is_uuid(vessel_id):
        logger.warning("Ask query_log skipped: invalid vessel_id %r", vessel_id)
        return None

    charter = charter_id if _is_uuid(charter_id) else None
    history = [
        {"role": str(item.get("role")), "content": str(item.get("content"))}
        for item in (conversation_history or [])
        if isinstance(item, dict)
        and str(item.get("role") or "").strip()
        and str(item.get("content") or "").strip()
    ]
    manual_ids = [str(mid) for mid in (source_manual_ids or []) if mid]
    cited_ids = [int(c) for c in (cited or [])]
    queries = [str(q) for q in (retrieve_queries or []) if str(q).strip()]
    rel = (relevance or "").strip().lower() or None
    if rel not in {"direct", "partial", "none"}:
        rel = None

    row = conn.execute(
        text(
            """
            INSERT INTO query_log (
                vessel_id,
                charter_id,
                question,
                answer,
                source_manual_edition_ids,
                response_time_ms,
                retrieved_context,
                conversation_history,
                retrieve_query,
                prepared_query,
                cited,
                chat_deployment,
                retrieved_count,
                no_excerpts,
                relevance,
                retrieve_queries,
                troubleshooting_retrieve
            )
            VALUES (
                CAST(:vessel_id AS uuid),
                CAST(:charter_id AS uuid),
                :question,
                :answer,
                CAST(:source_manual_edition_ids AS jsonb),
                :response_time_ms,
                :retrieved_context,
                CAST(:conversation_history AS jsonb),
                :retrieve_query,
                :prepared_query,
                CAST(:cited AS jsonb),
                :chat_deployment,
                :retrieved_count,
                :no_excerpts,
                :relevance,
                CAST(:retrieve_queries AS jsonb),
                :troubleshooting_retrieve
            )
            RETURNING id::text
            """
        ),
        {
            "vessel_id": vessel_id,
            "charter_id": charter,
            "question": question,
            "answer": answer,
            "source_manual_edition_ids": json.dumps(manual_ids),
            "response_time_ms": response_time_ms,
            "retrieved_context": retrieved_context,
            "conversation_history": json.dumps(history, ensure_ascii=False),
            "retrieve_query": retrieve_query,
            "prepared_query": prepared_query,
            "cited": json.dumps(cited_ids),
            "chat_deployment": chat_deployment,
            "retrieved_count": retrieved_count,
            "no_excerpts": no_excerpts,
            "relevance": rel,
            "retrieve_queries": json.dumps(queries, ensure_ascii=False),
            "troubleshooting_retrieve": troubleshooting_retrieve,
        },
    ).scalar()
    return str(row) if row else None


def log_ask_query(engine: Engine, **kwargs: Any) -> str | None:
    """Best-effort Ask log write; never raises to the Ask caller."""
    try:
        with engine.begin() as conn:
            return insert_query_log(conn, **kwargs)
    except Exception:
        logger.exception("Ask query_log insert failed")
        return None
