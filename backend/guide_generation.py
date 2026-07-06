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
from guide_context_utils import emergency_contacts_count, merge_guide_context
from guide_module_catalog import (
    CHECKLIST_CATALOG,
    CHECKLIST_MODULES,
    COPY_MODULES,
    FULL_GUIDE_MODULES,
    STARTER_MODULES,
    SYSTEM_CATALOG,
    SYSTEM_MODULES,
)

COPY_MODULE_KEYS = frozenset(COPY_MODULES)

SYSTEM_DEFAULTS: dict[str, dict[str, Any]] = {
    system_id: {"icon": meta["icon"], "locs": meta["locs"]}
    for system_id, meta in SYSTEM_CATALOG.items()
}

DEFAULT_GENERATION_MODULES: list[tuple[str, str]] = list(FULL_GUIDE_MODULES)

SYSTEM_SECTION_TYPES = frozenset(
    {"prose", "photo", "list", "steps", "warnings", "notes"}
)

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
    ("system", "overview"): (
        '{"id":"overview","icon","title","subtitle","locs[]","summary",'
        '"learnChecks[]","sections":[{"t","type":"prose|list|steps","c?","items?"}]}'
    ),
    ("system", "engines"): (
        '{"id":"engines","icon","title","subtitle","locs[]","summary",'
        '"learnChecks[]","sections":[{"t","type":"prose|steps|warnings|notes","c?","items?"}]}'
    ),
    ("system", "_generic"): (
        '{"id","icon","title","subtitle","locs[]","summary","learnChecks[]",'
        '"sections":[{"t","type":"prose|list|steps|warnings|notes","c?","items?"}]}'
    ),
    ("checklist", "_generic"): (
        '{"groups":[{"t","items":[{"c","s?"}]}]}'
    ),
    ("fix_card_set", "all"): (
        '[{"icon","cat","catL","title","steps[]"}]'
    ),
}

DEFAULT_PROMPTS: dict[tuple[str, str], str] = {
    ("branding", "branding"): """Generate the branding module for a charter vessel guide.

Use ONLY facts from INPUT SNAPSHOT (vessel, charter company, operating base).
Audience: charter guests. Tone: clear and welcoming.

If REFERENCE MODULE is provided, match its structure and preserve headerLogo/heroLogo paths exactly if present.

Return JSON only — the branding object, no wrapper.""",
    ("emergency", "emergency"): """Generate the emergency module for a vessel guide.

Use INPUT SNAPSHOT guide_context for contacts and local VHF channels (merged operating base + vessel-specific context).
Use guide_context.vesselCallsign or vessel.name for mayday callsign and modalSubtitle.
Include standard MAYDAY steps on VHF Ch 16.

contacts[].action must be "call" or "vhf". Include tel for phone contacts.

Return JSON only — the emergency object, no wrapper.""",
    ("ui", "homeRuleSections"): """Generate homeRuleSections for the Home tab.

Use ONLY facts from INPUT SNAPSHOT (vessel, guide_context, equipment).
Turn guide_context.localRules into guest-facing rules when present.
Add equipment-specific rules only when manufacturer/model in the snapshot supports them.

STRICT RULES:
- Do NOT include location-specific rules (anchoring, VHF channels, marina/charter contacts)
  unless explicitly stated in guide_context.localRules or guide_context VHF/contact fields.
- Do NOT mention equipment brands or models absent from INPUT SNAPSHOT equipment.
- Do NOT assume charter base, cruising region, or head type — use snapshot facts only.
- If REFERENCE MODULE is provided, match its section structure and tone only; write fresh rule
  text from INPUT SNAPSHOT. Never copy reference rule wording the snapshot does not support.

Produce 2–3 sections: Never Do This (danger), Always Do This (caution), optional Good Habits (good).
Each rule needs icon (emoji), tone, and text. Add link only when referencing a checklist route.

Return JSON only — a JSON array (homeRuleSections), no wrapper object.""",
    ("system", "overview"): """Generate the boat overview system module (Learn the Boat + Know tab).

Use INPUT SNAPSHOT: vessel.name, hull_model.display_name, vessel.vessel_type, equipment list.
Audience: charter guests on day one. Tone: orientation — where things are, layout, safety gear locations.

Produce id "overview", icon "🗺️", locs for cockpit/helm/saloon.
Include summary (1-2 sentences), learnChecks (6-10 walkthrough items), and sections:
- About [vessel name] (prose) — hull model facts from snapshot only
- Layout (list) — cabin/hull layout using hull model; do not invent cabin counts not supported by snapshot
- Find These on Day 1 (steps) — safety gear and key locations (life jackets, EPIRB, fire ext, panel, fuel/water fills)

Do NOT include sections with type "photo" — deck plan photos are preserved from REFERENCE MODULE separately.
If REFERENCE MODULE is provided, match its section structure and tone; update facts from snapshot.

Return JSON only — one system object, no wrapper.""",
    ("system", "engines"): """Generate the engines system module (Learn the Boat + Know tab).

Use INPUT SNAPSHOT equipment rows for propulsion (system_category propulsion, or manufacturer Yanmar/volvo/etc.).
Use twin-engine catamaran assumptions when two propulsion units with port/starboard zone_instance appear.

Produce id "engines", icon "⚙️", locs including port-hull, stbd-hull, cockpit.
Subtitle and summary must name actual engine make/model from equipment when available.

Include learnChecks (6-8 compartment checks) and sections:
- Engine Compartment Access (prose)
- Pre-Start Checks (Both Engines) (steps)
- Starting Procedure (steps) — include EVC/glow plug/neutral/water from exhaust checks if applicable
- Shutting Down (steps)
- Warnings (warnings) — seacock, starter, exhaust water, warm-up
- Notes (notes) — cruise RPM / fuel if known from reference tone

Do NOT include photo sections. Do not invent engine specs not in snapshot or reference.

Return JSON only — one system object, no wrapper.""",
}

FIXES_PROMPT = """Generate the Fix It troubleshooting card set for this charter vessel.

Use INPUT SNAPSHOT equipment and operating_base.guide_context for realistic guest-fixable problems.
Cover engines, electrical, plumbing/heads, water, batteries, anchoring, AC, dinghy as equipment supports.

Each card: icon (emoji), cat (short key), catL (display category), title, steps (5-8 actionable strings).
Include charter company contact in steps where guests should call for help (VHF channel from context).

Match REFERENCE MODULE count and categories when provided; update facts from snapshot.
Return JSON only — a JSON array of fix cards, no wrapper."""


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
                v.guide_context AS vessel_guide_context,
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

    base_guide_context = _coerce_jsonb(row[8]) if row[8] else {}
    vessel_guide_context = _coerce_jsonb(row[9]) if row[9] else {}
    merged_guide_context = merge_guide_context(base_guide_context, vessel_guide_context)

    return {
        "vessel": {
            "id": str(row[0]),
            "name": row[1],
            "slug": row[2],
            "vessel_type": row[3],
            "guide_context": vessel_guide_context,
        },
        "charter_company": {
            "id": str(row[4]) if row[4] else None,
            "name": row[5],
        },
        "operating_base": {
            "id": str(row[6]) if row[6] else None,
            "name": row[7],
            "guide_context": base_guide_context,
        },
        "guide_context": merged_guide_context,
        "hull_model": {
            "manufacturer": row[10],
            "model_code": row[11],
            "display_name": row[12],
        }
        if row[10]
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


def _schema_hint_for(content_type: str, content_key: str) -> str:
    key = (content_type, content_key)
    if key in SCHEMA_HINTS:
        return SCHEMA_HINTS[key]
    if content_type == "system":
        return SCHEMA_HINTS[("system", "_generic")]
    if content_type == "checklist":
        return SCHEMA_HINTS[("checklist", "_generic")]
    return "valid JSON for this module type"


def _equipment_for_system(
    snapshot: dict[str, Any], system_id: str
) -> list[dict[str, Any]]:
    meta = SYSTEM_CATALOG.get(system_id, {})
    categories = set(meta.get("equipment_categories") or [])
    equipment = snapshot.get("equipment") or []
    if not categories:
        return equipment
    return [row for row in equipment if row.get("system_category") in categories]


def _build_generic_system_prompt(system_id: str) -> str:
    meta = SYSTEM_CATALOG.get(system_id, {})
    icon = meta.get("icon", "⚙️")
    locs = meta.get("locs", [])
    focus = meta.get("focus", "This onboard system")
    categories = meta.get("equipment_categories") or []
    category_note = (
        f"Prioritize equipment with system_category in: {', '.join(categories)}."
        if categories
        else "Use relevant equipment from the snapshot where applicable."
    )
    return f"""Generate the "{system_id}" system module for a charter vessel guide (Learn + Know tabs).

TARGET: {focus}
{category_note}

Produce id "{system_id}", icon "{icon}", locs {json.dumps(locs)}.
Include title, subtitle, summary (1-2 sentences), learnChecks (6-8 items), and sections.
Section types allowed: prose, list, steps, warnings, notes. Do NOT include photo sections — photos are merged from REFERENCE separately.

Use ONLY facts from INPUT SNAPSHOT and RELEVANT EQUIPMENT below. Match REFERENCE structure and tone when provided.

Return JSON only — one system object, no wrapper."""


def _build_generic_checklist_prompt(checklist_id: str) -> str:
    meta = CHECKLIST_CATALOG.get(checklist_id, {})
    focus = meta.get("focus", checklist_id)
    title = meta.get("title", checklist_id)
    return f"""Generate the "{checklist_id}" checklist ({title}) for charter crew/guests.

PURPOSE: {focus}

Structure: groups[] with t (group title) and items[] with c (check text) and optional s (detail subtext).
Use INPUT SNAPSHOT for vessel-specific locations and equipment. Match REFERENCE group structure when provided.

Return JSON only — checklist object with groups array, no wrapper."""


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
    if default:
        return default, None
    if content_type == "system":
        return _build_generic_system_prompt(content_key), None
    if content_type == "checklist":
        return _build_generic_checklist_prompt(content_key), None
    if content_type == "fix_card_set" and content_key == "all":
        return FIXES_PROMPT, None
    raise GuideGenerationError(
        f"No prompt template for {content_type}/{content_key}"
    )


def _reference_statuses_for(content_type: str, content_key: str) -> tuple[str, ...]:
    """Draft modules are not used as LLM reference for home rules (avoids bad-output loops)."""
    if content_type == "ui" and content_key == "homeRuleSections":
        return ("approved", "published")
    return ("approved", "published", "draft")


def _reference_label_for(content_type: str, content_key: str) -> str:
    if content_type == "ui" and content_key == "homeRuleSections":
        return (
            "REFERENCE MODULE (section layout and tone only; every rule text must come "
            "from INPUT SNAPSHOT — do not copy reference wording):"
        )
    return "REFERENCE MODULE (structure/tone; do not copy stale facts over snapshot):"


def _load_reference_module(
    conn: Connection,
    vessel_id: str,
    content_type: str,
    content_key: str,
    *,
    statuses: tuple[str, ...] | None = None,
) -> Any | None:
    for status in statuses or _reference_statuses_for(content_type, content_key):
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


def _load_approved_reference_module(
    conn: Connection, vessel_id: str, content_type: str, content_key: str
) -> Any | None:
    for status in ("approved", "published"):
        row = conn.execute(
            text(
                """
                SELECT payload FROM guide_content
                WHERE vessel_id = :vessel_id
                  AND content_type = CAST(:content_type AS guide_content_type)
                  AND content_key = :content_key
                  AND status = CAST(:status AS guide_module_status)
                ORDER BY approved_at DESC NULLS LAST, created_at DESC
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


def _load_existing_draft_id(
    conn: Connection, vessel_id: str, content_type: str, content_key: str
) -> str | None:
    row = conn.execute(
        text(
            """
            SELECT id FROM guide_content
            WHERE vessel_id = :vessel_id
              AND content_type = CAST(:content_type AS guide_content_type)
              AND content_key = :content_key
              AND status = 'draft'
            ORDER BY created_at DESC
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


def _supersede_extra_drafts(
    conn: Connection,
    vessel_id: str,
    content_type: str,
    content_key: str,
    keep_id: str,
) -> None:
    conn.execute(
        text(
            """
            UPDATE guide_content
            SET status = 'superseded'
            WHERE vessel_id = :vessel_id
              AND content_type = CAST(:content_type AS guide_content_type)
              AND content_key = :content_key
              AND status = 'draft'
              AND id <> :keep_id
            """
        ),
        {
            "vessel_id": vessel_id,
            "content_type": content_type,
            "content_key": content_key,
            "keep_id": keep_id,
        },
    )


def _save_generated_draft(
    conn: Connection,
    *,
    vessel_id: str,
    content_type: str,
    content_key: str,
    payload: Any,
    run_id: str,
    diff_against_id: str | None,
    created_by: str,
) -> tuple[str, bool]:
    """Insert or overwrite the single draft row for this module. Returns (module_id, reused)."""
    existing_draft_id = _load_existing_draft_id(
        conn, vessel_id, content_type, content_key
    )
    params = {
        "vessel_id": vessel_id,
        "content_type": content_type,
        "content_key": content_key,
        "payload": json.dumps(payload),
        "run_id": run_id,
        "diff_against_id": diff_against_id,
        "created_by": created_by,
    }

    if existing_draft_id:
        conn.execute(
            text(
                """
                UPDATE guide_content
                SET payload = CAST(:payload AS jsonb),
                    source = 'generated',
                    status = 'draft',
                    generation_run_id = :run_id,
                    diff_against_id = :diff_against_id,
                    created_by = :created_by,
                    created_at = now()
                WHERE id = :module_id
                  AND vessel_id = :vessel_id
                """
            ),
            {**params, "module_id": existing_draft_id},
        )
        _supersede_extra_drafts(
            conn, vessel_id, content_type, content_key, existing_draft_id
        )
        return existing_draft_id, True

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
        params,
    ).fetchone()
    return str(module_row[0]), False


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
    elif content_type == "system":
        _validate_system_module(content_key, payload)
    elif content_type == "checklist":
        _validate_checklist_module(content_key, payload)
    elif content_type == "fix_card_set" and content_key == "all":
        _validate_fixes_module(payload)
    elif content_type == "locations" and content_key == "locations":
        _validate_locations_module(payload)
    elif content_type == "ui" and content_key in {
        "doMenu",
        "checklistMeta",
        "systemOrder",
        "locationLayout",
    }:
        _validate_ui_config_module(content_key, payload)


def _validate_checklist_module(content_key: str, payload: Any) -> None:
    if not isinstance(payload, dict):
        raise GuideGenerationError("checklist payload must be an object")
    groups = payload.get("groups")
    if not isinstance(groups, list) or not groups:
        raise GuideGenerationError(f"checklist {content_key} missing groups")
    for index, group in enumerate(groups):
        if not isinstance(group, dict) or not group.get("t"):
            raise GuideGenerationError(f"checklist group {index} missing title")
        items = group.get("items")
        if not isinstance(items, list) or not items:
            raise GuideGenerationError(f"checklist group {index} missing items")
        for item_index, item in enumerate(items):
            if not isinstance(item, dict) or not item.get("c"):
                raise GuideGenerationError(
                    f"checklist {content_key} group {index} item {item_index} missing c"
                )


def _validate_fixes_module(payload: Any) -> None:
    if not isinstance(payload, list) or not payload:
        raise GuideGenerationError("fixes must be a non-empty array")
    for index, card in enumerate(payload):
        if not isinstance(card, dict):
            raise GuideGenerationError(f"fix card {index} must be an object")
        for key in ("icon", "cat", "catL", "title", "steps"):
            if not card.get(key):
                raise GuideGenerationError(f"fix card {index} missing {key}")
        if not isinstance(card.get("steps"), list) or not card["steps"]:
            raise GuideGenerationError(f"fix card {index} missing steps")


def _validate_locations_module(payload: Any) -> None:
    if not isinstance(payload, dict) or not payload:
        raise GuideGenerationError("locations must be a non-empty object")
    for zone_id, zone in payload.items():
        if not isinstance(zone, dict):
            raise GuideGenerationError(f"location {zone_id} must be an object")
        if not zone.get("label") or not isinstance(zone.get("sys"), list):
            raise GuideGenerationError(f"location {zone_id} missing label or sys")


def _validate_ui_config_module(content_key: str, payload: Any) -> None:
    if content_key == "doMenu":
        if not isinstance(payload, list) or not payload:
            raise GuideGenerationError("doMenu must be a non-empty array")
    elif content_key == "checklistMeta":
        if not isinstance(payload, dict) or not payload:
            raise GuideGenerationError("checklistMeta must be a non-empty object")
    elif content_key == "systemOrder":
        if not isinstance(payload, list) or not payload:
            raise GuideGenerationError("systemOrder must be a non-empty array")
    elif content_key == "locationLayout":
        if not isinstance(payload, list) or not payload:
            raise GuideGenerationError("locationLayout must be a non-empty array")


def _validate_system_module(content_key: str, payload: Any) -> None:
    if not isinstance(payload, dict):
        raise GuideGenerationError("system payload must be an object")
    if payload.get("id") != content_key:
        raise GuideGenerationError(f'system id must be "{content_key}"')
    for key in ("icon", "title", "subtitle", "summary", "sections"):
        if not payload.get(key):
            raise GuideGenerationError(f"system missing {key}")
    sections = payload.get("sections")
    if not isinstance(sections, list) or not sections:
        raise GuideGenerationError("system sections must be a non-empty array")
    for index, section in enumerate(sections):
        if not isinstance(section, dict):
            raise GuideGenerationError(f"section {index} must be an object")
        if not section.get("t") or not section.get("type"):
            raise GuideGenerationError(f"section {index} missing t or type")
        section_type = section["type"]
        if section_type not in SYSTEM_SECTION_TYPES:
            raise GuideGenerationError(f"section {index} has invalid type {section_type!r}")
        if section_type == "prose" and not section.get("c"):
            raise GuideGenerationError(f"prose section {index} missing c")
        if section_type in {"list", "steps", "warnings", "notes"} and not section.get("items"):
            raise GuideGenerationError(f"{section_type} section {index} missing items")
    learn_checks = payload.get("learnChecks")
    if learn_checks is not None and (
        not isinstance(learn_checks, list) or not learn_checks
    ):
        raise GuideGenerationError("learnChecks must be a non-empty array when present")


def _merge_system_photo_sections(
    reference: dict[str, Any] | None, payload: dict[str, Any]
) -> dict[str, Any]:
    """Interleave photo sections from the reference module at their original positions."""
    if not reference:
        return payload

    ref_sections = reference.get("sections", [])
    generated = {
        section["t"]: section
        for section in payload.get("sections", [])
        if section.get("t") and section.get("type") != "photo"
    }

    merged: list[dict[str, Any]] = []
    used_titles: set[str] = set()
    for ref_section in ref_sections:
        if ref_section.get("type") == "photo":
            merged.append(ref_section)
            continue
        title = ref_section.get("t")
        if title and title in generated:
            merged.append(generated[title])
            used_titles.add(title)

    for section in payload.get("sections", []):
        title = section.get("t")
        if section.get("type") == "photo" or not title or title in used_titles:
            continue
        merged.append(section)

    payload["sections"] = merged
    return payload


def _finalize_system_payload(
    content_key: str,
    payload: dict[str, Any],
    reference: dict[str, Any] | None,
) -> dict[str, Any]:
    payload["id"] = content_key
    defaults = SYSTEM_DEFAULTS.get(content_key, {})
    for key, value in defaults.items():
        if not payload.get(key):
            payload[key] = value
    if reference:
        for key in ("icon", "locs"):
            if not payload.get(key) and reference.get(key):
                payload[key] = reference[key]
    return _merge_system_photo_sections(reference, payload)


def _insert_generation_run(
    conn: Connection,
    *,
    vessel_id: str,
    snapshot_id: str,
    content_type: str,
    content_key: str,
    trigger: str,
    prompt_refs: list[dict[str, Any]],
    model_id: str,
) -> str:
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
            "model_id": model_id,
        },
    ).fetchone()
    return str(run_row[0])


def _complete_generation_run(conn: Connection, run_id: str) -> None:
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


def _fail_generation_run(conn: Connection, run_id: str, error: str) -> None:
    conn.execute(
        text(
            """
            UPDATE guide_generation_run
            SET status = 'failed', error_message = :error, completed_at = now()
            WHERE id = :run_id
            """
        ),
        {"run_id": run_id, "error": error[:2000]},
    )


def copy_module_from_reference(
    conn: Connection,
    *,
    vessel_id: str,
    snapshot_id: str,
    content_type: str,
    content_key: str,
    trigger: str = "onboarding",
    created_by: str = "guide_generation",
) -> dict[str, Any]:
    reference = _load_approved_reference_module(
        conn, vessel_id, content_type, content_key
    )
    if reference is None:
        raise GuideGenerationError(
            f"No approved reference to copy for {content_type}/{content_key}"
        )
    payload = json.loads(json.dumps(reference))
    diff_against_id = _load_diff_against_id(conn, vessel_id, content_type, content_key)
    _validate_module_payload(content_type, content_key, payload)

    run_id = _insert_generation_run(
        conn,
        vessel_id=vessel_id,
        snapshot_id=snapshot_id,
        content_type=content_type,
        content_key=content_key,
        trigger=trigger,
        prompt_refs=[],
        model_id="reference_copy",
    )
    module_id, reused_draft = _save_generated_draft(
        conn,
        vessel_id=vessel_id,
        content_type=content_type,
        content_key=content_key,
        payload=payload,
        run_id=run_id,
        diff_against_id=diff_against_id,
        created_by=created_by,
    )
    _complete_generation_run(conn, run_id)
    return {
        "run_id": run_id,
        "module_id": module_id,
        "content_type": content_type,
        "content_key": content_key,
        "status": "completed",
        "reused_draft": reused_draft,
        "copied_from_reference": True,
    }


def _compose_prompt(
    *,
    instruction: str,
    snapshot: dict[str, Any],
    schema_hint: str,
    reference: Any | None,
    reference_label: str | None = None,
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
        label = reference_label or (
            "REFERENCE MODULE (structure/tone; do not copy stale facts over snapshot):"
        )
        parts.extend(
            [
                "",
                label,
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
    if (content_type, content_key) in COPY_MODULE_KEYS:
        return copy_module_from_reference(
            conn,
            vessel_id=vessel_id,
            snapshot_id=snapshot_id,
            content_type=content_type,
            content_key=content_key,
            trigger=trigger,
            created_by=created_by,
        )
    if content_type == "emergency":
        if emergency_contacts_count(snapshot_payload.get("guide_context")) < 1:
            raise GuideGenerationError(
                "No emergency contacts in guide context. Open Admin → Vessels → "
                "Guide context and add at least one emergency contact (or set an "
                "operating base with contacts for charter vessels)."
            )

    prompt_text, prompt_ref = _resolve_prompt_text(conn, content_type, content_key)
    schema_hint = _schema_hint_for(content_type, content_key)
    reference = _load_reference_module(conn, vessel_id, content_type, content_key)
    diff_against_id = _load_diff_against_id(conn, vessel_id, content_type, content_key)

    prompt_refs = [prompt_ref] if prompt_ref else []
    run_id = _insert_generation_run(
        conn,
        vessel_id=vessel_id,
        snapshot_id=snapshot_id,
        content_type=content_type,
        content_key=content_key,
        trigger=trigger,
        prompt_refs=prompt_refs,
        model_id=settings.azure_openai_chat_deployment,
    )

    prompt_snapshot = snapshot_payload
    if content_type == "system":
        prompt_snapshot = {
            **snapshot_payload,
            "relevant_equipment": _equipment_for_system(snapshot_payload, content_key),
        }

    try:
        llm = llm or _build_llm()
        composed = _compose_prompt(
            instruction=prompt_text,
            snapshot=prompt_snapshot,
            schema_hint=schema_hint,
            reference=reference,
            reference_label=_reference_label_for(content_type, content_key),
        )
        response = llm.complete(composed)
        payload = _parse_llm_json(str(response))
        if content_type == "system":
            if not isinstance(payload, dict):
                raise GuideGenerationError("system payload must be an object")
            payload = _finalize_system_payload(content_key, payload, reference)
        _validate_module_payload(content_type, content_key, payload)

        module_id, reused_draft = _save_generated_draft(
            conn,
            vessel_id=vessel_id,
            content_type=content_type,
            content_key=content_key,
            payload=payload,
            run_id=run_id,
            diff_against_id=diff_against_id,
            created_by=created_by,
        )

        _complete_generation_run(conn, run_id)
        return {
            "run_id": run_id,
            "module_id": module_id,
            "content_type": content_type,
            "content_key": content_key,
            "status": "completed",
            "reused_draft": reused_draft,
        }
    except Exception as exc:
        _fail_generation_run(conn, run_id, str(exc))
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
    llm: AzureOpenAI | None = None
    results: list[dict[str, Any]] = []
    module_list = modules or list(STARTER_MODULES)
    for content_type, content_key in module_list:
        needs_llm = (content_type, content_key) not in COPY_MODULE_KEYS
        if needs_llm and llm is None:
            llm = _build_llm()
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
