"""Admin service for Ask query_log list/detail."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from query_log import build_synthesis_paste_prompt


def _as_list(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return []
        return parsed if isinstance(parsed, list) else []
    return []


def list_query_logs(
    conn: Connection,
    *,
    vessel_id: str | None = None,
    no_excerpts_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    clauses = ["1=1"]
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if vessel_id:
        clauses.append("ql.vessel_id = CAST(:vessel_id AS uuid)")
        params["vessel_id"] = vessel_id
    if no_excerpts_only:
        clauses.append("ql.no_excerpts = true")

    where = " AND ".join(clauses)
    total = conn.execute(
        text(f"SELECT COUNT(*) FROM query_log ql WHERE {where}"),
        params,
    ).scalar()

    rows = conn.execute(
        text(
            f"""
            SELECT
                ql.id::text,
                ql.vessel_id::text,
                v.name AS vessel_name,
                v.slug AS vessel_slug,
                ql.question,
                ql.answer,
                ql.response_time_ms,
                ql.retrieved_count,
                ql.no_excerpts,
                ql.chat_deployment,
                ql.created_at,
                ql.source_manual_edition_ids
            FROM query_log ql
            LEFT JOIN vessels v ON v.id = ql.vessel_id
            WHERE {where}
            ORDER BY ql.created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).fetchall()

    items = [
        {
            "id": row[0],
            "vessel_id": row[1],
            "vessel_name": row[2],
            "vessel_slug": row[3],
            "question": row[4],
            "answer": row[5],
            "response_time_ms": row[6],
            "retrieved_count": row[7],
            "no_excerpts": bool(row[8]),
            "chat_deployment": row[9],
            "created_at": row[10],
            "source_manual_ids": _as_list(row[11]),
        }
        for row in rows
    ]
    return items, int(total or 0)


def get_query_log(conn: Connection, log_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        text(
            """
            SELECT
                ql.id::text,
                ql.vessel_id::text,
                v.name AS vessel_name,
                v.slug AS vessel_slug,
                ql.charter_id::text,
                ql.question,
                ql.answer,
                ql.source_manual_edition_ids,
                ql.response_time_ms,
                ql.retrieved_context,
                ql.conversation_history,
                ql.retrieve_query,
                ql.prepared_query,
                ql.cited,
                ql.chat_deployment,
                ql.retrieved_count,
                ql.no_excerpts,
                ql.created_at
            FROM query_log ql
            LEFT JOIN vessels v ON v.id = ql.vessel_id
            WHERE ql.id = CAST(:id AS uuid)
            """
        ),
        {"id": log_id},
    ).fetchone()
    if row is None:
        return None

    history = _as_list(row[10])
    prepared = row[12]
    retrieved_context = row[9] or ""
    item = {
        "id": row[0],
        "vessel_id": row[1],
        "vessel_name": row[2],
        "vessel_slug": row[3],
        "charter_id": row[4],
        "question": row[5],
        "answer": row[6],
        "source_manual_ids": _as_list(row[7]),
        "response_time_ms": row[8],
        "retrieved_context": retrieved_context,
        "conversation_history": history,
        "retrieve_query": row[11],
        "prepared_query": prepared,
        "cited": _as_list(row[13]),
        "chat_deployment": row[14],
        "retrieved_count": row[15],
        "no_excerpts": bool(row[16]),
        "created_at": row[17],
    }
    item["paste_prompt"] = build_synthesis_paste_prompt(
        retrieved_context=retrieved_context,
        conversation_history=history,
        prepared_query=prepared,
        question=row[5],
    )
    return item


def list_vessels_for_filter(conn: Connection) -> list[dict[str, str]]:
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT v.id::text, v.name, v.slug
            FROM query_log ql
            JOIN vessels v ON v.id = ql.vessel_id
            ORDER BY v.name
            """
        )
    ).fetchall()
    return [
        {"id": row[0], "name": row[1] or row[2] or row[0], "slug": row[2] or ""}
        for row in rows
    ]
