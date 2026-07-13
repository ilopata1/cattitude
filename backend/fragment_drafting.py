"""Draft equipment guide fragments from approved equipment manuals."""

from __future__ import annotations

import json
import re
from typing import Any

from llama_index.llms.azure_openai import AzureOpenAI
from sqlalchemy import text
from sqlalchemy.engine import Connection

from config import settings
from content.loader import load_yaml_cached
from guide_module_catalog import SYSTEM_CATALOG
from manual_retrieval import retrieve_manual_excerpts
from prompts.guide.registry import get_llm_prompt, get_schema_hint


class FragmentDraftingError(Exception):
    pass


SYSTEM_RETRIEVAL_QUERIES: dict[str, list[str]] = {
    "sails": [
        "sail handling reefing furling procedures warnings",
        "rigging inspection maintenance",
    ],
    "engines": [
        "pre-start checks starting procedure shutdown",
        "engine warnings maintenance operating rpm fuel",
        "raw water cooling seacock exhaust impeller",
    ],
    "electrical": [
        "electrical panel operation shore power breakers",
        "AC DC system warnings installation",
    ],
    "batteries": [
        "battery charging voltage absorption float",
        "inverter charger solar monitoring",
    ],
    "water": [
        "fresh water system tanks pumps operation",
        "watermaker operation flushing salinity warnings",
    ],
    "heads": [
        "toilet head operation flushing maintenance",
        "waste holding tank macerator warnings",
    ],
    "galley": [
        "refrigeration galley appliance operation",
        "cooktop stove operation warnings",
    ],
    "nav": [
        "chartplotter autopilot VHF radio operation",
        "navigation electronics startup warnings",
    ],
    "anchoring": [
        "windlass anchor operation chain counter",
        "ground tackle warnings maintenance",
    ],
    "dinghy": [
        "tender dinghy outboard operation",
        "davits swim platform lift warnings",
    ],
    "ac": [
        "air conditioning operation startup shutdown",
        "seawater cooling HVAC warnings maintenance",
    ],
}

FIX_CARD_RETRIEVAL_QUERIES: dict[str, list[str]] = {
    "engine_wont_start": ["engine will not start troubleshooting crank"],
    "engine_overheating": ["engine overheating raw water impeller cooling"],
    "toilet_wont_flush": ["toilet head will not flush troubleshooting"],
    "holding_tank_full": ["holding tank pump out waste evacuation"],
    "no_fresh_water": ["no fresh water pump pressure troubleshooting"],
    "watermaker": ["watermaker not producing salinity flush troubleshooting"],
    "something_stopped": ["circuit breaker electrical fault reset"],
    "low_battery": ["low battery charging recovery"],
    "fridge_not_cooling": ["refrigerator not cooling troubleshooting"],
    "autopilot": ["autopilot not holding course troubleshooting"],
    "vhf_not_transmitting": ["VHF radio not transmitting troubleshooting"],
    "windlass": ["windlass not working troubleshooting"],
    "ac_not_working": ["air conditioning not working troubleshooting"],
}


def system_ids_for_category(category: str) -> list[str]:
    return [
        system_id
        for system_id, meta in SYSTEM_CATALOG.items()
        if category in (meta.get("equipment_categories") or [])
    ]


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
    rows = conn.execute(
        text(
            """
            SELECT mw.id, mw.title, mw.manual_type, mw.legal_status
            FROM manual_work mw
            JOIN manual_edition me
                ON me.manual_work_id = mw.id AND me.is_current = true
            WHERE mw.equipment_id = :equipment_id
              AND mw.legal_status = 'cleared'
            ORDER BY mw.manual_type, mw.title
            """
        ),
        {"equipment_id": equipment_id},
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
) -> str:
    instruction = get_llm_prompt("draft", "equipment_fragment")
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
        "APPROVED MANUALS:",
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
    target_systems = system_ids or system_ids_for_category(category)
    fix_card_keys = fix_card_keys_for_category(category) if include_fix_cards else []

    manuals = list_ingested_manuals(conn, equipment_id)
    if not manuals:
        raise FragmentDraftingError(
            "No legally cleared, ingested manuals for this equipment. "
            "Upload a PDF, clear it in legal review, and ingest before drafting."
        )

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
            "Re-ingest the cleared manual PDF for this equipment."
        )

    composed = _compose_draft_prompt(
        equipment=equipment,
        system_ids=target_systems,
        fix_card_keys=fix_card_keys,
        manuals=manuals,
        excerpts=excerpts,
    )
    llm = llm or _build_llm()
    response = llm.complete(composed)
    fragment = _parse_llm_json(str(response))

    allowed_keys = {"system_sections", "fix_card_overrides", "extra_fix_cards"}
    fragment = {key: value for key, value in fragment.items() if key in allowed_keys}

    citations = {
        "manuals": manuals,
        "excerpts": excerpts,
        "target_systems": target_systems,
        "target_fix_cards": fix_card_keys,
    }
    return fragment, citations
