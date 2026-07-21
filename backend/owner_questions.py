"""Durable owner-questions store (decision 2).

Stage 4 composers surface ``fact_queries`` — questions only the owner can
answer (e.g. "does the Zeus SR show the CZone switching controller?"). Before
this store they lived only as ephemeral scratch JSON. Here they persist per
vessel, keyed by ``question_key`` so re-generation carries an open question
forward without clobbering one that has already been answered.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection


def _prompt_text(fact_query: dict[str, Any]) -> str:
    for key in ("missing", "question", "prompt", "ask"):
        value = fact_query.get(key)
        if value:
            return str(value)
    return json.dumps(fact_query, ensure_ascii=False)


def upsert_owner_questions(
    conn: Connection,
    *,
    vessel_id: str,
    section: str,
    run_id: str | None,
    fact_queries: list[dict[str, Any]] | None,
) -> int:
    """Insert/refresh open owner questions for a section. Returns count written.

    An existing ``open`` question is refreshed (prompt/detail/run); a question
    that has been ``answered``/``dismissed`` is left untouched.
    """
    written = 0
    for fact_query in fact_queries or []:
        if not isinstance(fact_query, dict):
            continue
        question_key = fact_query.get("id")
        if not question_key:
            continue
        conn.execute(
            text(
                """
                INSERT INTO owner_question (
                    vessel_id, question_key, section, prompt, detail,
                    generation_run_id
                )
                VALUES (
                    :vessel_id, :question_key, :section, :prompt,
                    CAST(:detail AS jsonb), :run_id
                )
                ON CONFLICT (vessel_id, question_key) DO UPDATE SET
                    section = EXCLUDED.section,
                    prompt = EXCLUDED.prompt,
                    detail = EXCLUDED.detail,
                    generation_run_id = EXCLUDED.generation_run_id,
                    updated_at = now()
                WHERE owner_question.status = 'open'
                """
            ),
            {
                "vessel_id": vessel_id,
                "question_key": str(question_key),
                "section": section,
                "prompt": _prompt_text(fact_query),
                "detail": json.dumps(fact_query, ensure_ascii=False),
                "run_id": run_id,
            },
        )
        written += 1
    return written
