"""Draft equipment guide fragments from legally cleared equipment manuals.

Policy: Know/Fix fragments are operator runbooks. Prefer ``operators`` manuals;
never draft from ``installation`` or ``parts``. If no operators manual exists,
fall back to ``service`` with a stricter prompt note — Ask still covers depth.
"""

from __future__ import annotations

import json
import re
from typing import Any

from llama_index.llms.azure_openai import AzureOpenAI
from sqlalchemy import text
from sqlalchemy.engine import Connection

from config import settings
from content.loader import load_yaml_cached
from guide_system_assembly import draft_target_systems
from manual_retrieval import retrieve_manual_excerpts
from prompts.guide.registry import get_draft_prompt, get_schema_hint


class FragmentDraftingError(Exception):
    pass


# Postgres legal_status enum: manuals cleared in legal review (not "approved").
CLEARED_MANUAL_LEGAL_STATUS = "cleared"

# Preferred then fallback for fragment drafting (never installation/parts).
DRAFT_MANUAL_TYPE_PREFERRED = "operators"
DRAFT_MANUAL_TYPE_FALLBACK = "service"


SYSTEM_RETRIEVAL_QUERIES: dict[str, list[str]] = {
    "sails": [
        "sail handling reefing furling operating procedures warnings",
        "sail controls furler winch clutch operation guest checks",
    ],
    "engines": [
        "pre-start checks starting procedure shutdown",
        "engine warnings indicators operating rpm fuel",
        "raw water cooling seacock exhaust impeller guest checks",
    ],
    "electrical": [
        "electrical panel switches breakers operation",
        "shore power connection inverter charger controls warnings",
    ],
    "batteries": [
        "battery charging voltage absorption float monitoring",
        "inverter charger solar charge controller operation indicators",
    ],
    "water": [
        "fresh water tanks pumps operation",
        "watermaker start stop flush salinity warnings",
    ],
    "heads": [
        "toilet head operation flushing controls",
        "waste holding tank macerator pump-out operation warnings",
    ],
    "galley": [
        "refrigeration galley appliance operation",
        "cooktop stove operation controls warnings",
    ],
    "nav": [
        "chartplotter autopilot VHF radio operation",
        "navigation electronics startup power warnings",
    ],
    "anchoring": [
        "windlass anchor operation chain counter controls",
        "ground tackle operating warnings up down",
    ],
    "dinghy": [
        "tender dinghy outboard operation start stop",
        "davits swim platform lift operating controls warnings",
    ],
    "ac": [
        "air conditioning operation startup shutdown controls",
        "cabin HVAC thermostat seawater cooling strainer guest checks",
    ],
}

FIX_CARD_RETRIEVAL_QUERIES: dict[str, list[str]] = {
    "engine_wont_start": ["engine will not start troubleshooting crank neutral"],
    "engine_overheating": ["engine overheating raw water seacock impeller strainer"],
    "toilet_wont_flush": ["toilet head will not flush breaker switch troubleshooting"],
    "holding_tank_full": ["holding tank full pump out discharge procedure"],
    "no_fresh_water": ["no fresh water pump pressure breaker switch troubleshooting"],
    "watermaker": ["watermaker not producing salinity stop flush troubleshooting"],
    "something_stopped": ["circuit breaker tripped electrical fault reset"],
    "low_battery": ["low battery charging shore power generator recovery"],
    "fridge_not_cooling": ["refrigerator not cooling breaker temperature troubleshooting"],
    "autopilot": ["autopilot not holding course standby troubleshooting"],
    "vhf_not_transmitting": ["VHF radio not transmitting power antenna troubleshooting"],
    "windlass": ["windlass not working breaker isolator troubleshooting"],
    "ac_not_working": ["air conditioning not working breaker strainer troubleshooting"],
}


def system_ids_for_category(
    category: str,
    *,
    manufacturer: str = "",
    model: str = "",
) -> list[str]:
    """Target Know chapters for a draft — primary home when classification wins."""
    return draft_target_systems(
        category, manufacturer=manufacturer, model=model
    )


def fix_card_keys_for_category(category: str) -> list[str]:
    cards = load_yaml_cached("fix_cards/cards.yaml").get("cards") or []
    keys: list[str] = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        when = card.get("when") or {}
        categories = when.get("has_category") or []
        if category in categories:
            key = card.get("key")
            if isinstance(key, str):
                keys.append(key)
    return keys


def list_ingested_manuals(conn: Connection, equipment_id: str) -> list[dict[str, Any]]:
    """All cleared, ingested manuals for equipment (any manual_type)."""
    rows = conn.execute(
        text(
            """
            SELECT mw.id, mw.title, mw.manual_type, mw.legal_status
            FROM manual_work mw
            JOIN manual_work_equipment mwe ON mwe.manual_work_id = mw.id
            JOIN manual_edition me
                ON me.manual_work_id = mw.id AND me.is_current = true
            WHERE mwe.equipment_id = :equipment_id
              AND mw.legal_status = CAST(:legal_status AS legal_status)
            ORDER BY mw.manual_type, mw.title
            """
        ),
        {
            "equipment_id": equipment_id,
            "legal_status": CLEARED_MANUAL_LEGAL_STATUS,
        },
    ).fetchall()
    return [
        {
            "id": str(row[0]),
            "title": row[1],
            "manual_type": row[2],
            "legal_status": row[3],
        }
        for row in rows
    ]


def select_manuals_for_drafting(
    manuals: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], str]:
    """Prefer operators manuals; fall back to service only.

    Returns (selected_manuals, selection_policy) where selection_policy is
    ``operators`` or ``service_fallback``. Never selects installation/parts.
    """
    operators = [
        m for m in manuals if m.get("manual_type") == DRAFT_MANUAL_TYPE_PREFERRED
    ]
    if operators:
        return operators, DRAFT_MANUAL_TYPE_PREFERRED

    service = [
        m for m in manuals if m.get("manual_type") == DRAFT_MANUAL_TYPE_FALLBACK
    ]
    if service:
        return service, "service_fallback"

    types_found = sorted({str(m.get("manual_type") or "") for m in manuals})
    raise FragmentDraftingError(
        "No operators (or service fallback) manuals cleared and ingested for "
        f"this equipment. Found manual_type(s): {types_found or 'none'}. "
        "Upload/clear an operators manual, or retag an existing PDF, before drafting."
    )


def select_manuals_for_interaction_profile(
    manuals: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], str]:
    """Stage 1 corpus selection — may use installation when no operators/service.

    Guest fragment drafting still never uses installation/parts. Interaction
    profiles may honestly extract installer / commissioning facts from an
    installation manual (often setup-only for MFD-hosted operation).
    """
    try:
        return select_manuals_for_drafting(manuals)
    except FragmentDraftingError:
        installation = [
            m for m in manuals if m.get("manual_type") == "installation"
        ]
        if installation:
            return installation, "installation_only"
        raise


def _parse_llm_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    payload = json.loads(text)
    if not isinstance(payload, dict):
        raise FragmentDraftingError("Draft output must be a JSON object.")
    return payload


def _build_llm() -> AzureOpenAI:
    return AzureOpenAI(
        model="gpt-4o",
        deployment_name=settings.azure_openai_chat_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
        temperature=0.1,
    )


def _collect_retrieval_queries(
    system_ids: list[str],
    fix_card_keys: list[str],
) -> list[str]:
    queries: list[str] = []
    for system_id in system_ids:
        for query in SYSTEM_RETRIEVAL_QUERIES.get(system_id, []):
            if query not in queries:
                queries.append(query)
    for card_key in fix_card_keys:
        for query in FIX_CARD_RETRIEVAL_QUERIES.get(card_key, []):
            if query not in queries:
                queries.append(query)
    return queries


def _compose_draft_prompt(
    *,
    equipment: dict[str, Any],
    system_ids: list[str],
    fix_card_keys: list[str],
    manuals: list[dict[str, Any]],
    excerpts: list[dict[str, Any]],
    manual_selection_policy: str,
) -> str:
    instruction = get_draft_prompt("equipment_fragment")
    if not instruction:
        raise FragmentDraftingError("Missing draft_equipment_fragment prompt file.")

    schema_parts = [
        'Fragment shape: {"system_sections": {...}, "fix_card_overrides": {...}}',
    ]
    for system_id in system_ids:
        schema_parts.append(
            f"system/{system_id} schema hint: {get_schema_hint('system', system_id)}"
        )

    parts = [
        instruction,
        "",
        "EQUIPMENT:",
        json.dumps(
            {
                "manufacturer": equipment["manufacturer"],
                "model": equipment["model"],
                "system_category": equipment["system_category"],
            },
            indent=2,
        ),
        "",
        "TARGET SYSTEM IDS:",
        json.dumps(system_ids),
        "",
        "TARGET FIX CARD KEYS:",
        json.dumps(fix_card_keys),
        "",
        "MANUAL SELECTION POLICY:",
        manual_selection_policy,
    ]
    if manual_selection_policy == "service_fallback":
        parts.extend(
            [
                "",
                "NOTE: No operators manual was available. Excerpts come from service "
                "manuals only. Be extra strict: include only guest-safe operating "
                "steps and fixes; omit all install, maintenance, and repair content.",
            ]
        )
    parts.extend(
        [
            "",
            "SOURCE MANUALS (drafting corpus):",
            json.dumps(manuals, indent=2),
            "",
            "MANUAL EXCERPTS (only permitted facts):",
            json.dumps(excerpts, indent=2),
            "",
            "OUTPUT SCHEMA HINTS:",
            "\n".join(schema_parts),
            "",
            "Respond with valid JSON only.",
        ]
    )
    return "\n".join(parts)


def draft_equipment_fragment(
    conn: Connection,
    equipment_id: str,
    *,
    system_ids: list[str] | None = None,
    include_fix_cards: bool = True,
    llm: AzureOpenAI | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Return (fragment_payload, source_citations) for admin review."""
    row = conn.execute(
        text(
            """
            SELECT manufacturer, model, system_category
            FROM equipment
            WHERE id = :equipment_id
            """
        ),
        {"equipment_id": equipment_id},
    ).fetchone()
    if row is None:
        raise FragmentDraftingError(f"Equipment not found: {equipment_id}")

    equipment = {
        "manufacturer": row[0],
        "model": row[1],
        "system_category": row[2],
    }
    category = equipment["system_category"] or ""
    target_systems = system_ids or system_ids_for_category(
        category,
        manufacturer=str(equipment["manufacturer"] or ""),
        model=str(equipment["model"] or ""),
    )
    fix_card_keys = fix_card_keys_for_category(category) if include_fix_cards else []

    all_manuals = list_ingested_manuals(conn, equipment_id)
    if not all_manuals:
        raise FragmentDraftingError(
            "No legally cleared, ingested manuals for this equipment. "
            "Upload a PDF, clear it in legal review, and ingest before drafting."
        )

    manuals, manual_selection_policy = select_manuals_for_drafting(all_manuals)
    manual_ids = [manual["id"] for manual in manuals]
    queries = _collect_retrieval_queries(target_systems, fix_card_keys)
    if not queries:
        raise FragmentDraftingError(
            f"No retrieval queries configured for category {category!r}."
        )

    excerpts = retrieve_manual_excerpts(manual_ids, queries)
    if not excerpts:
        raise FragmentDraftingError(
            "Manual excerpts not found in the vector index. "
            "Re-ingest the cleared operators (or service fallback) manual PDF."
        )

    composed = _compose_draft_prompt(
        equipment=equipment,
        system_ids=target_systems,
        fix_card_keys=fix_card_keys,
        manuals=manuals,
        excerpts=excerpts,
        manual_selection_policy=manual_selection_policy,
    )
    llm = llm or _build_llm()
    response = llm.complete(composed)
    fragment = _parse_llm_json(str(response))

    allowed_keys = {"system_sections", "fix_card_overrides", "extra_fix_cards"}
    fragment = {key: value for key, value in fragment.items() if key in allowed_keys}

    citations = {
        "manuals": manuals,
        "manuals_available": all_manuals,
        "manual_selection_policy": manual_selection_policy,
        "excerpts": excerpts,
        "target_systems": target_systems,
        "target_fix_cards": fix_card_keys,
    }
    return fragment, citations
