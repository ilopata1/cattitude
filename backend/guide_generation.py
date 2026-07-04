"""Build guide generation snapshots and run LLM module generation."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from llama_index.llms.azure_openai import AzureOpenAI
from sqlalchemy import text
from sqlalchemy.engine import Connection

from config import settings
from guide_bootstrap import canonical_json_hash

# First vertical slice: charter shell modules (not full systems tree yet).
STARTER_MODULES: list[tuple[str, str]] = [
    ("branding", "branding"),
    ("emergency", "emergency"),
    ("ui", "homeRuleSections"),
]

SCHEMA_HINTS: dict[tuple[str, str], str] = {
    ("branding", "branding"): (
        '{"vesselName","vesselSlug","vesselType","model","charterCompany",'
        '"location","marina","tagline","headerLogo","heroLogo"}'
    ),
    ("emergency", "emergency"): (
        '{"mayday":{"channel","vesselCallsign","steps[]"},'
        '"contacts":[{"label","detail?","value","tel?","action"}],'
        '"modalSubtitle"}'
    ),
    ("ui", "homeRuleSections"): (
        '[{"title","tone":"danger|caution|good","rules":[{"icon","tone","text","link?"}]}]'
    ),
}

DEFAULT_PROMPTS: dict[tuple[str, str], str] = {
    ("branding", "branding"): """Generate the branding module for a charter vessel guide.

Use ONLY facts from INPUT SNAPSHOT (vessel, charter company, operating base).
Audience: charter guests. Tone: clear and welcoming.

If REFERENCE MODULE is provided, match its structure and preserve headerLogo/heroLogo paths exactly if present.

Return JSON only — the branding object, no wrapper.""",
    ("emergency", "emergency"): """Generate the emergency module for a charter vessel guide.

Use INPUT SNAPSHOT operating_base.guide_context for contacts and local VHF channels.
Use vessel.name for mayday callsign and modalSubtitle.
Include standard MAYDAY steps on VHF Ch 16.

contacts[].action must be "call" or "vhf". Include tel for phone contacts.

Return JSON only — the emergency object, no wrapper.""",
    ("ui", "homeRuleSections"): """Generate homeRuleSections for the Home tab.

Use operating_base.guide_context.localRules and emergencyContacts where relevant.
Include toilet/waste rule for Tecma electric heads if equipment mentions Tecma.
Include coral anchoring rule for Bahamas charter bases when localRules mention coral.

Produce 2–3 sections: Never Do This (danger), Always Do This (caution), optional Good Habits (good).
Each rule needs icon (emoji), tone, and text. Add link only when referencing a checklist route.

Return JSON only — a JSON array (homeRuleSections), no wrapper object.""",
}


class GuideGenerationError(Exception):
    pass


@dataclass
class GenerationResult:
    snapshot_id: str
    runs: list[dict[str, Any]]


def _coerce_jsonb(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value


def _parse_llm_json(raw: str) -> Any:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _build_llm() -> AzureOpenAI:
    return AzureOpenAI(
        model="gpt-4o",
        deployment_name=settings.azure_openai_chat_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
        temperature=0.2,
    )


def load_vessel_generation_context(conn: Connection, vessel_id: str) -> dict[str, Any]:
    row = conn.execute(
        text(
            """
            SELECT
                v.id, v.name, v.slug, v.vessel_type,
                cc.id AS charter_company_id,
                cc.name AS charter_company_name,
                cob.id AS operating_base_id,
                cob.name AS operating_base_name,
                cob.guide_context,
                hm.manufacturer AS hull_manufacturer,
                hm.model_code AS hull_model_code,
                hm.display_name AS hull_display_name
            FROM vessels v
            LEFT JOIN charter_companies cc ON cc.id = v.charter_company_id
            LEFT JOIN charter_operating_bases cob
                ON cob.id = v.charter_operating_base_id
            LEFT JOIN hull_model hm ON hm.id = v.hull_model_id
            WHERE v.id = :vessel_id
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchone()
    if row is None:
        raise GuideGenerationError(f"Vessel not found: {vessel_id}")

    equipment_rows = conn.execute(
        text(
            """
            SELECT
                e.manufacturer,
                e.model,
                e.system_category,
                e.zone,
                e.equipment_class,
                ve.zone_instance,
                ve.confirmed_by
            FROM vessel_equipment ve
            JOIN equipment e ON e.id = ve.equipment_id
            WHERE ve.vessel_id = :vessel_id
            ORDER BY e.system_category, e.manufacturer, e.model, ve.zone_instance
            """
        ),
        {"vessel_id": vessel_id},
    ).fetchall()

    return {
        "vessel": {
            "id": str(row[0]),
            "name": row[1],
            "slug": row[2],
            "vessel_type": row[3],
        },
        "charter_company": {
            "id": str(row[4]) if row[4] else None,
            "name": row[5],
        },
        "operating_base": {
            "id": str(row[6]) if row[6] else None,
            "name": row[7],
            "guide_context": _coerce_jsonb(row[8]) if row[8] else {},
        },
        "hull_model": {
            "manufacturer": row[9],
            "model_code": row[10],
            "display_name": row[11],
        }
        if row[9]
        else None,
        "equipment": [
            {
                "manufacturer": eq[0],
                "model": eq[1],
                "system_category": eq[2],
                "zone": eq[3],
                "equipment_class": eq[4],
                "zone_instance": eq[5],
                "confirmed_by": eq[6],
            }
            for eq in equipment_rows
        ],
    }


def create_input_snapshot(
    conn: Connection, vessel_id: str, payload: dict[str, Any] | None = None
) -> str:
    if payload is None:
        payload = load_vessel_generation_context(conn, vessel_id)
    if not payload.get("equipment"):
        raise GuideGenerationError(
            "No vessel_equipment rows — populate equipment before generating."
        )
    content_hash = canonical_json_hash(payload)
    row = conn.execute(
        text(
            """
            INSERT INTO guide_generation_input_snapshot (
                vessel_id, payload, content_hash
            )
            VALUES (:vessel_id, CAST(:payload AS jsonb), :content_hash)
            RETURNING id
            """
        ),
        {
            "vessel_id": vessel_id,
            "payload": json.dumps(payload),
            "content_hash": content_hash,
        },
    ).fetchone()
    return str(row[0])


def ensure_default_prompt_templates(conn: Connection) -> None:
    for (content_type, content_key), prompt_text in DEFAULT_PROMPTS.items():
        existing = conn.execute(
            text(
                """
                SELECT id FROM guide_prompt_template
                WHERE scope = 'platform'
                  AND scope_id IS NULL
                  AND content_type = CAST(:content_type AS guide_content_type)
                  AND content_key = :content_key
                  AND is_active = true
                """
            ),
            {"content_type": content_type, "content_key": content_key},
        ).fetchone()
        if existing:
            continue
        conn.execute(
            text(
                """
                INSERT INTO guide_prompt_template (
                    scope, scope_id, content_type, content_key, version,
                    prompt_text, is_active, created_by
                )
                VALUES (
                    'platform', NULL,
                    CAST(:content_type AS guide_content_type),
                    :content_key, 1, :prompt_text, true, 'guide_generation'
                )
                """
            ),
            {
                "content_type": content_type,
                "content_key": content_key,
                "prompt_text": prompt_text,
            },
        )


def _resolve_prompt_text(
    conn: Connection, content_type: str, content_key: str
) -> tuple[str, dict[str, Any] | None]:
    row = conn.execute(
        text(
            """
            SELECT id, version, prompt_text
            FROM guide_prompt_template
            WHERE scope = 'platform'
              AND scope_id IS NULL
              AND content_type = CAST(:content_type AS guide_content_type)
              AND content_key = :content_key
              AND is_active = true
            ORDER BY version DESC
            LIMIT 1
            """
        ),
        {"content_type": content_type, "content_key": content_key},
    ).fetchone()
    if row:
        return row[2], {"id": str(row[0]), "version": row[1], "scope": "platform"}
    default = DEFAULT_PROMPTS.get((content_type, content_key))
    if not default:
        raise GuideGenerationError(
            f"No prompt template for {content_type}/{content_key}"
        )
    return default, None


def _load_reference_module(
    conn: Connection, vessel_id: str, content_type: str, content_key: str
) -> Any | None:
    for status in ("approved", "published", "draft"):
        row = conn.execute(
            text(
                """
                SELECT payload FROM guide_content
                WHERE vessel_id = :vessel_id
                  AND content_type = CAST(:content_type AS guide_content_type)
                  AND content_key = :content_key
                  AND status = CAST(:status AS guide_module_status)
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {
                "vessel_id": vessel_id,
                "content_type": content_type,
                "content_key": content_key,
                "status": status,
            },
        ).fetchone()
        if row:
            return _coerce_jsonb(row[0])
    return None


def _load_diff_against_id(
    conn: Connection, vessel_id: str, content_type: str, content_key: str
) -> str | None:
    row = conn.execute(
        text(
            """
            SELECT id FROM guide_content
            WHERE vessel_id = :vessel_id
              AND content_type = CAST(:content_type AS guide_content_type)
              AND content_key = :content_key
              AND status IN ('approved', 'published')
            ORDER BY approved_at DESC NULLS LAST, created_at DESC
            LIMIT 1
            """
        ),
        {
            "vessel_id": vessel_id,
            "content_type": content_type,
            "content_key": content_key,
        },
    ).fetchone()
    return str(row[0]) if row else None


def _validate_module_payload(
    content_type: str, content_key: str, payload: Any
) -> None:
    if content_type == "branding":
        if not isinstance(payload, dict):
            raise GuideGenerationError("branding payload must be an object")
        for key in ("vesselName", "vesselSlug", "vesselType", "model"):
            if not payload.get(key):
                raise GuideGenerationError(f"branding missing {key}")
    elif content_type == "emergency":
        if not isinstance(payload, dict):
            raise GuideGenerationError("emergency payload must be an object")
        if not payload.get("mayday") or not payload.get("contacts"):
            raise GuideGenerationError("emergency missing mayday or contacts")
    elif content_type == "ui" and content_key == "homeRuleSections":
        if not isinstance(payload, list) or not payload:
            raise GuideGenerationError("homeRuleSections must be a non-empty array")


def _compose_prompt(
    *,
    instruction: str,
    snapshot: dict[str, Any],
    schema_hint: str,
    reference: Any | None,
) -> str:
    parts = [
        instruction,
        "",
        "OUTPUT JSON SCHEMA (shape only):",
        schema_hint,
        "",
        "INPUT SNAPSHOT:",
        json.dumps(snapshot, indent=2, sort_keys=True),
    ]
    if reference is not None:
        parts.extend(
            [
                "",
                "REFERENCE MODULE (structure/tone; do not copy stale facts over snapshot):",
                json.dumps(reference, indent=2, sort_keys=True),
            ]
        )
    parts.append("")
    parts.append("Respond with valid JSON only.")
    return "\n".join(parts)


def generate_module(
    conn: Connection,
    *,
    vessel_id: str,
    snapshot_id: str,
    snapshot_payload: dict[str, Any],
    content_type: str,
    content_key: str,
    trigger: str = "onboarding",
    created_by: str = "guide_generation",
    llm: AzureOpenAI | None = None,
) -> dict[str, Any]:
    prompt_text, prompt_ref = _resolve_prompt_text(conn, content_type, content_key)
    schema_hint = SCHEMA_HINTS.get(
        (content_type, content_key), "valid JSON for this module type"
    )
    reference = _load_reference_module(conn, vessel_id, content_type, content_key)
    diff_against_id = _load_diff_against_id(conn, vessel_id, content_type, content_key)

    prompt_refs = [prompt_ref] if prompt_ref else []
    run_row = conn.execute(
        text(
            """
            INSERT INTO guide_generation_run (
                vessel_id, input_snapshot_id, trigger, status,
                prompt_refs, content_type, content_key,
                output_module_keys, model_id, started_at
            )
            VALUES (
                :vessel_id, :snapshot_id, CAST(:trigger AS guide_generation_trigger),
                'running', CAST(:prompt_refs AS jsonb),
                CAST(:content_type AS guide_content_type), :content_key,
                CAST(:output_keys AS text[]), :model_id, now()
            )
            RETURNING id
            """
        ),
        {
            "vessel_id": vessel_id,
            "snapshot_id": snapshot_id,
            "trigger": trigger,
            "prompt_refs": json.dumps(prompt_refs),
            "content_type": content_type,
            "content_key": content_key,
            "output_keys": [content_key],
            "model_id": settings.azure_openai_chat_deployment,
        },
    ).fetchone()
    run_id = str(run_row[0])

    try:
        llm = llm or _build_llm()
        composed = _compose_prompt(
            instruction=prompt_text,
            snapshot=snapshot_payload,
            schema_hint=schema_hint,
            reference=reference,
        )
        response = llm.complete(composed)
        payload = _parse_llm_json(str(response))
        _validate_module_payload(content_type, content_key, payload)

        module_row = conn.execute(
            text(
                """
                INSERT INTO guide_content (
                    vessel_id, content_type, content_key, payload,
                    source, status, generation_run_id, diff_against_id, created_by
                )
                VALUES (
                    :vessel_id,
                    CAST(:content_type AS guide_content_type),
                    :content_key,
                    CAST(:payload AS jsonb),
                    'generated', 'draft',
                    :run_id, :diff_against_id, :created_by
                )
                RETURNING id
                """
            ),
            {
                "vessel_id": vessel_id,
                "content_type": content_type,
                "content_key": content_key,
                "payload": json.dumps(payload),
                "run_id": run_id,
                "diff_against_id": diff_against_id,
                "created_by": created_by,
            },
        ).fetchone()

        conn.execute(
            text(
                """
                UPDATE guide_generation_run
                SET status = 'completed', completed_at = now()
                WHERE id = :run_id
                """
            ),
            {"run_id": run_id},
        )
        return {
            "run_id": run_id,
            "module_id": str(module_row[0]),
            "content_type": content_type,
            "content_key": content_key,
            "status": "completed",
        }
    except Exception as exc:
        conn.execute(
            text(
                """
                UPDATE guide_generation_run
                SET status = 'failed', error_message = :error, completed_at = now()
                WHERE id = :run_id
                """
            ),
            {"run_id": run_id, "error": str(exc)[:2000]},
        )
        raise GuideGenerationError(
            f"Generation failed for {content_type}/{content_key}: {exc}"
        ) from exc


def run_guide_generation(
    conn: Connection,
    vessel_id: str,
    modules: list[tuple[str, str]] | None = None,
    *,
    trigger: str = "onboarding",
    created_by: str = "guide_generation",
) -> GenerationResult:
    ensure_default_prompt_templates(conn)
    snapshot_payload = load_vessel_generation_context(conn, vessel_id)
    snapshot_id = create_input_snapshot(conn, vessel_id, snapshot_payload)
    llm = _build_llm()
    results: list[dict[str, Any]] = []
    for content_type, content_key in modules or STARTER_MODULES:
        results.append(
            generate_module(
                conn,
                vessel_id=vessel_id,
                snapshot_id=snapshot_id,
                snapshot_payload=snapshot_payload,
                content_type=content_type,
                content_key=content_key,
                trigger=trigger,
                created_by=created_by,
                llm=llm,
            )
        )
    return GenerationResult(snapshot_id=snapshot_id, runs=results)
