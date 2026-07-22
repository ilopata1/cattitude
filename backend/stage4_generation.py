"""Phase 3: Stage 4 orchestrator — DB substrate → compose → draft modules.

``run_stage4_generation`` rebuilds composer inputs from the Phase 2 substrate,
runs the frozen composers + Phase 1 transform once (solar folded into batteries),
and writes ``guide_content`` drafts under ``guide_generation_run`` records with
composer metadata and owner-question upserts.

Called from ``run_guide_generation`` when the vessel has a Stage 4 substrate and
the requested modules include any of ``PUBLISHED_SECTIONS``. See
``guide-stage4-integration-plan.md`` Phase 3.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from guide_generation import (
    GuideGenerationError,
    _complete_generation_run,
    _fail_generation_run,
    _insert_generation_run,
    _save_generated_draft,
    _validate_module_payload,
    create_input_snapshot,
)
from owner_questions import upsert_owner_questions
from stage4_sections import (
    PUBLISHED_SECTIONS,
    build_modules_from_context,
    load_vessel_context_from_db,
)

_MODEL_ID = "stage4_composer"


def vessel_has_stage4_substrate(conn: Connection, vessel_id: str) -> bool:
    """True when the vessel has at least one Stage 4 equipment row."""
    row = conn.execute(
        text(
            """
            SELECT 1 FROM vessel_stage4_equipment
            WHERE vessel_id = :v LIMIT 1
            """
        ),
        {"v": vessel_id},
    ).fetchone()
    return row is not None


def _attach_run_metadata(conn: Connection, run_id: str, metadata: dict) -> None:
    conn.execute(
        text(
            """
            UPDATE guide_generation_run
            SET metadata = CAST(:metadata AS jsonb)
            WHERE id = :run_id
            """
        ),
        {"metadata": json.dumps(metadata, ensure_ascii=False), "run_id": run_id},
    )


def run_stage4_generation(
    conn: Connection,
    vessel_id: str,
    *,
    created_by: str = "stage4_generation",
    trigger: str = "regenerate",
    sections: tuple[str, ...] | list[str] | None = None,
    snapshot_id: str | None = None,
) -> list[dict[str, Any]]:
    """Compose Stage 4 sections from the DB substrate and save as drafts.

    Returns a list of run result dicts compatible with ``GenerationResult.runs``
    entries from ``run_guide_generation``.

    Raises ``GuideGenerationError`` if the substrate is missing or composition /
    validation fails (before any draft write when possible).
    """
    if not vessel_has_stage4_substrate(conn, vessel_id):
        raise GuideGenerationError(
            "Stage 4 substrate not seeded for this vessel "
            "(run scripts/seed_stage4_substrate.py)."
        )

    wanted = tuple(sections) if sections is not None else PUBLISHED_SECTIONS
    wanted = tuple(sid for sid in wanted if sid in PUBLISHED_SECTIONS)
    if not wanted:
        return []

    # Compose all published sections once so solar folds correctly even when
    # the caller only requested a subset (e.g. batteries alone).
    ctx = load_vessel_context_from_db(conn, vessel_id)
    modules, metadata = build_modules_from_context(ctx)
    for sid in wanted:
        try:
            _validate_module_payload("system", sid, modules[sid])
        except GuideGenerationError:
            raise
        except Exception as exc:  # noqa: BLE001 — surface as generation failure
            raise GuideGenerationError(f"Stage 4 validate {sid}: {exc}") from exc

    if snapshot_id is None:
        snapshot_id = create_input_snapshot(conn, vessel_id)

    results: list[dict[str, Any]] = []
    for sid in wanted:
        run_id = _insert_generation_run(
            conn,
            vessel_id=vessel_id,
            snapshot_id=snapshot_id,
            content_type="system",
            content_key=sid,
            trigger=trigger,
            prompt_refs=[],
            model_id=_MODEL_ID,
        )
        try:
            _attach_run_metadata(conn, run_id, metadata[sid])
            module_id, reused = _save_generated_draft(
                conn,
                vessel_id=vessel_id,
                content_type="system",
                content_key=sid,
                payload=modules[sid],
                run_id=run_id,
                diff_against_id=None,
                created_by=created_by,
            )
            _complete_generation_run(conn, run_id)
            upsert_owner_questions(
                conn,
                vessel_id=vessel_id,
                section=sid,
                run_id=run_id,
                fact_queries=metadata[sid].get("fact_queries"),
            )
            results.append(
                {
                    "content_type": "system",
                    "content_key": sid,
                    "status": "completed",
                    "run_id": run_id,
                    "module_id": module_id,
                    "reused_draft": reused,
                    "model_id": _MODEL_ID,
                }
            )
        except Exception as exc:  # noqa: BLE001
            _fail_generation_run(conn, run_id, str(exc))
            results.append(
                {
                    "content_type": "system",
                    "content_key": sid,
                    "status": "failed",
                    "error": str(exc),
                    "run_id": run_id,
                }
            )
    return results
