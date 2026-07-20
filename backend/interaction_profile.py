"""Stage 1 interaction profiles — schema helpers and offline extraction.

Profiles are vessel-agnostic structured facts about how humans interact with a
device. They are **not** guest prose and are **not** consumed by
``generate_module`` yet (see ``guide-pipeline-plan.md``).

Persistence for the spike: JSON files under ``fixtures/pipeline/`` (and optional
script output). DB storage comes later when wiring Stage 2 into assembly.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from llama_index.llms.azure_openai import AzureOpenAI
from sqlalchemy import text
from sqlalchemy.engine import Connection

from config import settings
from fragment_drafting import (
    CLEARED_MANUAL_LEGAL_STATUS,
    FragmentDraftingError,
    list_ingested_manuals,
    select_manuals_for_interaction_profile,
)
from interaction_profile_derive import apply_derived_actions
from interaction_profile_merge import (
    measure_group_contribution,
    merge_group_profiles,
)
from interaction_profile_partition import (
    AC_LIMIT_RETRY_LINE,
    BMS_PROTECT_RETRY_LINE,
    DIP_COMMISSION_RETRY_LINE,
    MAP_PARTIAL_MANUAL_LINE,
    REMOTE_PANEL_RETRY_LINE,
    UNUTILIZED_RETRY_LINE,
    group_text_has_ac_limit_adjust,
    group_text_has_bms_protect,
    group_text_has_bms_recovery,
    group_text_has_dip_commission,
    group_text_has_remote_panel,
    partition_excerpts,
    profile_has_ac_limit_action,
    profile_has_bms_protect,
    profile_has_bms_recovery,
    profile_has_dip_commission,
    profile_has_remote_panel,
)
from interaction_profile_vote import (
    STABILITY_N,
    profiles_identical_post_merge,
    vote_merged_profiles,
)
from interaction_profile_instability import apply_instability_triage
from interaction_profile_procedures import (
    PROCEDURE_REPAIR_ENABLED,
    run_procedure_inventory_pass,
)
from interaction_profile_repair import (
    repair_absence_flags,
    repair_incomplete_evidence,
    should_attempt_absence_repair,
    should_attempt_evidence_repair,
)
from interaction_profile_schema import INTERACTION_PROFILE_JSON_SCHEMA
from interaction_profile_validate import (
    NEEDS_REXTRACTION_FLAGS,
    category_freeform_is_taxonomic,
    validate_interaction_profile,
    validation_flag_names,
)
from manual_retrieval import retrieve_manual_excerpts_with_diagnostics
from prompts.guide.registry import get_draft_prompt
from prompts.loader import load_prompt_text

MAX_REXTRACTION_RETRIES = 1

PROFILE_SCHEMA_KEYS = frozenset(INTERACTION_PROFILE_JSON_SCHEMA["properties"].keys())

PROFILE_RETRIEVAL_QUERIES: list[str] = [
    "operation daily use display menu controls operator",
    "installation wiring commissioning configuration DIP switches",
    "troubleshooting alarms faults error codes emergency protection",
    "network communication MasterBus NMEA CZone VE.Direct Bluetooth remote panel app",
    "maintenance service storage winterizing",
    "optional accessory gateway interface required for",
    # Extra queries for large multi-function manuals (Combi / inverter-chargers).
    # Remote/accessory UI — keep queries short; one widened + one synonym pass.
    "MasterView remote panel remote control display panel monitoring panel MasterAdjust",
    "optional remote control MasterView Easy remote panel installed",
    "shore power AC input current limit generator mains",
    "main switch inverter on off charger operation",
    "DC fuse battery protection wiring supply requirement",
    # Lithium / BMS manuals (MLI Ultra and similar)
    "BMS battery safety relay protective disconnect undervoltage overvoltage temperature",
    "Class T fuse T-Fuse fuse holder positive battery cable",
    "Close relay reset battery safety event recovery after disconnect",
    "State of charge SOC monitoring MasterBus display",
    # Platform / CZone 2.0 Climate (HVAC) pages — keep Climate Controls routed
    "Climate page HVAC air conditioner aircon temperature control fan setpoint",
    "CLIMATE CONTROLS Power Mode Temp Fan air conditioning",
    "supported air conditioner HVAC climate operating modes fan speed",
]


class InteractionProfileError(Exception):
    pass


def empty_profile(
    *,
    manufacturer: str = "",
    model: str = "",
    category_freeform: str = "",
) -> dict[str, Any]:
    return {
        "device": {
            "manufacturer": manufacturer,
            "model": model,
            "category_freeform": category_freeform,
        },
        "control_surfaces": [],
        "operator_actions": [],
        "networks": {"speaks": [], "bridges": []},
        "data_roles": {
            "exposes_data_to_network": False,
            "displays_data_from_other_devices": False,
            "controllable_from_network": False,
        },
        "requires_devices": [],
        "safety_role": {
            "is_protective_device": False,
            "has_manual_override": False,
            "has_emergency_procedure": False,
        },
        "protected_by": [],
        "protects": [],
        "supply_requirements": [],
        "evidence": [],
        "confidence": {"overall": 0.0, "notes": ""},
    }


def validate_profile(profile: dict[str, Any]) -> list[str]:
    """Return a list of soft validation issues (empty = ok enough for Stage 2)."""
    issues: list[str] = []
    if not isinstance(profile, dict):
        return ["profile must be a JSON object"]

    device = profile.get("device")
    if not isinstance(device, dict):
        issues.append("device object missing")
    else:
        for key in ("manufacturer", "model"):
            if not str(device.get(key) or "").strip():
                issues.append(f"device.{key} empty")

    for key in ("control_surfaces", "operator_actions", "requires_devices", "evidence"):
        if key in profile and not isinstance(profile.get(key), list):
            issues.append(f"{key} must be a list")

    networks = profile.get("networks")
    if networks is None:
        issues.append("networks missing")
    elif not isinstance(networks, dict):
        issues.append("networks must be an object")
    else:
        for key in ("speaks", "bridges"):
            if not isinstance(networks.get(key, []), list):
                issues.append(f"networks.{key} must be a list")

    data_roles = profile.get("data_roles")
    if data_roles is not None and not isinstance(data_roles, dict):
        issues.append("data_roles must be an object")

    confidence = profile.get("confidence")
    if confidence is not None:
        if not isinstance(confidence, dict):
            issues.append("confidence must be an object")
        else:
            overall = confidence.get("overall")
            if overall is not None and not isinstance(overall, (int, float)):
                issues.append("confidence.overall must be a number")

    return issues


def normalize_profile(raw: dict[str, Any]) -> dict[str, Any]:
    """Coerce LLM / hand JSON into the Stage 1 shape Stage 2 expects."""
    base = empty_profile()
    if not isinstance(raw, dict):
        return base

    def _keep_margin(dst: dict[str, Any], src: dict[str, Any]) -> None:
        margin = str(src.get("vote_margin") or "").strip()
        if margin:
            dst["vote_margin"] = margin

    device = raw.get("device") if isinstance(raw.get("device"), dict) else {}
    base["device"] = {
        "manufacturer": str(device.get("manufacturer") or "").strip(),
        "model": str(device.get("model") or "").strip(),
        "category_freeform": str(device.get("category_freeform") or "").strip(),
    }

    surfaces: list[dict[str, Any]] = []
    for idx, item in enumerate(raw.get("control_surfaces") or []):
        if not isinstance(item, dict):
            continue
        path = str(item.get("path") or f"control_surfaces[{idx}]").strip()
        surface_entry = {
            "surface": str(item.get("surface") or "other").strip(),
            "location_class": str(item.get("location_class") or "unknown").strip(),
            "optional_accessory": bool(item.get("optional_accessory")),
            "label_verbatim": str(item.get("label_verbatim") or "").strip(),
            "path": path,
        }
        _keep_margin(surface_entry, item)
        surfaces.append(surface_entry)
    base["control_surfaces"] = surfaces

    actions: list[dict[str, Any]] = []
    for item in raw.get("operator_actions") or []:
        if not isinstance(item, dict):
            continue
        action = str(item.get("action") or "").strip()
        if not action:
            continue
        entry: dict[str, Any] = {
            "action": action,
            "audience": str(item.get("audience") or "operator").strip(),
            "context": str(item.get("context") or "daily").strip(),
        }
        if "firmware" in action.lower():
            entry["context"] = "maintenance"
        source = str(item.get("source") or "").strip()
        if source in {"extracted", "derived"}:
            entry["source"] = source
        derived_from = str(item.get("derived_from") or "").strip()
        if derived_from:
            entry["derived_from"] = derived_from
        options = item.get("options")
        if isinstance(options, list):
            cleaned = [str(o).strip() for o in options if str(o).strip()]
            if cleaned:
                entry["options"] = cleaned
        occasion = str(item.get("occasion") or "").strip()
        if occasion:
            entry["occasion"] = occasion
        if item.get("deterministic_fill") is True:
            entry["deterministic_fill"] = True
        _keep_margin(entry, item)
        actions.append(entry)
    from interaction_profile_options import collapse_option_value_actions

    base["operator_actions"] = collapse_option_value_actions(actions)

    networks_in = raw.get("networks") if isinstance(raw.get("networks"), dict) else {}
    speaks: list[dict[str, Any]] = []
    for item in networks_in.get("speaks") or []:
        if isinstance(item, str):
            name = item.strip()
            if name:
                speaks.append(
                    {"name_verbatim": name, "physical_or_wireless": "unknown"}
                )
            continue
        if not isinstance(item, dict):
            continue
        name = str(item.get("name_verbatim") or item.get("name") or "").strip()
        if not name:
            continue
        speak_entry = {
            "name_verbatim": name,
            "physical_or_wireless": str(
                item.get("physical_or_wireless") or "unknown"
            ).strip(),
        }
        _keep_margin(speak_entry, item)
        ep = str(item.get("edge_provenance") or "").strip()
        if ep:
            speak_entry["edge_provenance"] = ep
        for meta_key in ("derived_from", "source", "counterpart_note", "note"):
            if item.get(meta_key) is not None:
                speak_entry[meta_key] = item.get(meta_key)
        speaks.append(speak_entry)
    bridges: list[dict[str, Any]] = []
    for item in networks_in.get("bridges") or []:
        if not isinstance(item, dict):
            continue
        frm = str(item.get("from") or item.get("from_") or "").strip()
        to = str(item.get("to") or "").strip()
        if frm and to:
            br: dict[str, Any] = {"from": frm, "to": to}
            ep = str(item.get("edge_provenance") or "").strip()
            if ep:
                br["edge_provenance"] = ep
            for meta_key in (
                "note",
                "counterpart_sources",
                "edge_provenance_secondary",
            ):
                if item.get(meta_key) is not None:
                    br[meta_key] = item.get(meta_key)
            bridges.append(br)
    base["networks"] = {"speaks": speaks, "bridges": bridges}

    roles_in = raw.get("data_roles") if isinstance(raw.get("data_roles"), dict) else {}
    base["data_roles"] = {
        "exposes_data_to_network": bool(roles_in.get("exposes_data_to_network")),
        "displays_data_from_other_devices": bool(
            roles_in.get("displays_data_from_other_devices")
        ),
        "controllable_from_network": bool(roles_in.get("controllable_from_network")),
    }

    from interaction_profile_kinds import (
        REQUIREMENT_KINDS,
        classify_requirement_kind,
        finalize_profile_requires,
    )

    requires: list[dict[str, Any]] = []
    for item in raw.get("requires_devices") or []:
        if not isinstance(item, dict):
            continue
        desc = str(item.get("description_verbatim") or "").strip()
        if not desc:
            continue
        entry: dict[str, Any] = {
            "description_verbatim": desc,
            "needed_for": str(item.get("needed_for") or "").strip(),
        }
        kind = str(item.get("requirement_kind") or "").strip()
        entry["requirement_kind"] = (
            kind if kind in REQUIREMENT_KINDS else classify_requirement_kind(desc)
        )
        source = str(item.get("source") or "").strip()
        if source in {"extracted", "derived"}:
            entry["source"] = source
        derived_from = str(item.get("derived_from") or "").strip()
        if derived_from:
            entry["derived_from"] = derived_from
        nf_from = str(item.get("needed_for_normalized_from") or "").strip()
        if nf_from:
            entry["needed_for_normalized_from"] = nf_from
        _keep_margin(entry, item)
        requires.append(entry)
    base["requires_devices"] = requires

    safety_in = raw.get("safety_role") if isinstance(raw.get("safety_role"), dict) else {}
    base["safety_role"] = {
        "is_protective_device": bool(safety_in.get("is_protective_device")),
        "has_manual_override": bool(
            safety_in.get("has_manual_override", safety_in.get("is_emergency_control"))
        ),
        "has_emergency_procedure": bool(
            safety_in.get(
                "has_emergency_procedure", safety_in.get("can_isolate_power")
            )
        ),
    }

    def _desc_list(key: str) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for item in raw.get(key) or []:
            if isinstance(item, str) and item.strip():
                out.append({"description_verbatim": item.strip()})
            elif isinstance(item, dict):
                desc = str(item.get("description_verbatim") or "").strip()
                if not desc:
                    continue
                entry: dict[str, Any] = {"description_verbatim": desc}
                source = str(item.get("source") or "").strip()
                if source in {"extracted", "derived"}:
                    entry["source"] = source
                derived_from = str(item.get("derived_from") or "").strip()
                if derived_from:
                    entry["derived_from"] = derived_from
                _keep_margin(entry, item)
                out.append(entry)
        return out

    base["protected_by"] = _desc_list("protected_by")
    base["protects"] = _desc_list("protects")
    base["supply_requirements"] = _desc_list("supply_requirements")

    evidence_out: list[dict[str, str]] = []
    for item in raw.get("evidence") or []:
        if isinstance(item, dict):
            evidence_out.append(
                {
                    "supports_field": str(item.get("supports_field") or "").strip(),
                    "manual_section": str(item.get("manual_section") or "").strip(),
                    "note": str(item.get("note") or "").strip(),
                }
            )
        elif isinstance(item, str) and item.strip():
            # Preserve defective string evidence for Stage 1.5 to flag; do not
            # invent supports_field. Leave as a placeholder object with note only
            # so validators seeing normalized form still catch shape issues —
            # prefer validating raw; keep raw shape when possible.
            evidence_out.append(
                {
                    "supports_field": "",
                    "manual_section": "",
                    "note": item.strip(),
                }
            )
    base["evidence"] = evidence_out[:8]

    # OR-split + exact-key dedupe after evidence is loaded (rewrites supports_field).
    finalize_profile_requires(base)

    conf_in = raw.get("confidence") if isinstance(raw.get("confidence"), dict) else {}
    overall = conf_in.get("overall", 0.0)
    try:
        overall_f = float(overall)
    except (TypeError, ValueError):
        overall_f = 0.0
    base["confidence"] = {
        "overall": max(0.0, min(1.0, overall_f)),
        "notes": str(conf_in.get("notes") or "").strip(),
    }

    repairs_out: list[dict[str, Any]] = []
    for item in raw.get("repairs") or []:
        if isinstance(item, dict):
            repairs_out.append(dict(item))
    if repairs_out:
        base["repairs"] = repairs_out
    if isinstance(raw.get("coverage"), dict):
        base["coverage"] = dict(raw["coverage"])
    if isinstance(raw.get("group_utilization"), list):
        base["group_utilization"] = list(raw["group_utilization"])
    if isinstance(raw.get("merge_conflicts"), list):
        base["merge_conflicts"] = list(raw["merge_conflicts"])
    from interaction_profile_genre import normalize_genres

    genres = normalize_genres(raw.get("genres"))
    if genres:
        base["genres"] = genres
    # Catalog entity kind (v4.6) — default device when omitted.
    from interaction_profile_schema import ENTITY_KINDS, RUNS_PLATFORM_KEYS

    ek = str(raw.get("entity_kind") or "device").strip().lower()
    base["entity_kind"] = ek if ek in ENTITY_KINDS else "device"
    doc_ver = str(raw.get("documented_version") or "").strip()
    if doc_ver:
        base["documented_version"] = doc_ver

    # Platform ui_pages + alarm_severity (v4.7)
    ui_pages: list[dict[str, Any]] = []
    for page in raw.get("ui_pages") or []:
        if not isinstance(page, dict):
            continue
        name = str(page.get("name") or "").strip()
        if not name:
            continue
        entry: dict[str, Any] = {
            "name": name,
            "purpose": str(page.get("purpose") or "").strip(),
        }
        gate_in = page.get("appears_if_gate")
        if isinstance(gate_in, dict):
            gate = {
                "verbatim": str(gate_in.get("verbatim") or "").strip(),
                "description_verbatim": str(
                    gate_in.get("description_verbatim") or ""
                ).strip(),
                "functional_class": str(gate_in.get("functional_class") or "").strip(),
            }
            if gate["verbatim"] or gate["description_verbatim"]:
                entry["appears_if_gate"] = gate
        page_actions: list[dict[str, Any]] = []
        for act in page.get("actions") or []:
            if not isinstance(act, dict):
                continue
            at = str(act.get("action") or "").strip()
            if not at:
                continue
            page_actions.append(
                {
                    "action": at,
                    "audience": str(act.get("audience") or "operator").strip()
                    or "operator",
                    "context": str(act.get("context") or "daily").strip() or "daily",
                }
            )
        entry["actions"] = page_actions
        ui_pages.append(entry)
    if ui_pages:
        base["ui_pages"] = ui_pages

    severities: list[dict[str, Any]] = []
    for row in raw.get("alarm_severity") or []:
        if not isinstance(row, dict):
            continue
        level = str(row.get("level_verbatim") or "").strip()
        color = str(row.get("color_verbatim") or "").strip()
        if level or color:
            severities.append(
                {"level_verbatim": level, "color_verbatim": color}
            )
    if severities:
        base["alarm_severity"] = severities

    if ui_pages:
        from interaction_profile_ui_pages import expand_ui_pages

        expand_ui_pages(base)
    else:
        from interaction_profile_ui_pages import consolidate_device_control_surfaces

        consolidate_device_control_surfaces(base)

    from interaction_profile_merge import rewrite_operator_action_evidence_paths

    rewrite_operator_action_evidence_paths(base)

    runs: list[dict[str, Any]] = []
    for item in raw.get("runs_platform") or []:
        if not isinstance(item, dict):
            continue
        pk = str(item.get("platform_key") or "").strip()
        if not pk:
            continue
        entry = {
            "platform_key": pk,
            "host_kind": str(item.get("host_kind") or "display").strip() or "display",
            "optional": bool(item.get("optional")),
        }
        note = str(item.get("note") or "").strip()
        if note:
            entry["note"] = note
        _ = RUNS_PLATFORM_KEYS
        runs.append(entry)
    if runs:
        base["runs_platform"] = runs
    if isinstance(raw.get("cross_model_diff"), dict):
        base["cross_model_diff"] = dict(raw["cross_model_diff"])
    if raw.get("source"):
        base["source"] = str(raw.get("source") or "").strip()
    # Preserve Stage 1.5 annotations through Stage 2 normalize.
    if isinstance(raw.get("validation_flags"), list):
        base["validation_flags"] = [
            dict(f) for f in raw["validation_flags"] if isinstance(f, dict)
        ]
    if raw.get("needs_rextraction") is not None:
        base["needs_rextraction"] = bool(raw.get("needs_rextraction"))
    if isinstance(raw.get("vessel_artifact_facts"), list):
        base["vessel_artifact_facts"] = [
            dict(f) for f in raw["vessel_artifact_facts"] if isinstance(f, dict)
        ]
    if isinstance(raw.get("repairs"), list) and raw.get("repairs"):
        base["repairs"] = [dict(f) for f in raw["repairs"] if isinstance(f, dict)]
    if isinstance(raw.get("demoted_ui_pages"), list) and raw.get("demoted_ui_pages"):
        base["demoted_ui_pages"] = [
            str(x) for x in raw["demoted_ui_pages"] if str(x).strip()
        ]
    # Adjudication metadata — must survive normalize / repair / promote.
    if isinstance(raw.get("extraction_votes"), list):
        base["extraction_votes"] = list(raw["extraction_votes"])
    if isinstance(raw.get("instability_triage"), dict):
        base["instability_triage"] = dict(raw["instability_triage"])
    return base


def _parse_llm_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    payload = json.loads(text)
    if not isinstance(payload, dict):
        raise InteractionProfileError("Profile output must be a JSON object.")
    return payload


def _build_llm() -> AzureOpenAI:
    return AzureOpenAI(
        model="gpt-4o",
        deployment_name=settings.azure_openai_chat_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
        temperature=0.0,
    )


def _complete_json(
    prompt: str,
    *,
    llm: AzureOpenAI | None = None,
    system: str = "Return only valid JSON.",
    response_schema: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Chat completion returning a JSON object; optional strict schema."""
    try:
        from openai import AzureOpenAI as AzureOpenAIClient

        client = AzureOpenAIClient(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
        )
        kwargs: dict[str, Any] = {
            "model": settings.azure_openai_chat_deployment,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        }
        if response_schema is not None:
            kwargs["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "interaction_profile",
                    "strict": True,
                    "schema": response_schema,
                },
            }
        else:
            kwargs["response_format"] = {"type": "json_object"}
        response = client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content or ""
        return _parse_llm_json(content)
    except Exception:
        llm = llm or _build_llm()
        response = llm.complete(prompt)
        return _parse_llm_json(str(response))


def _complete_structured(prompt: str, llm: AzureOpenAI | None = None) -> dict[str, Any]:
    """Prefer strict JSON-schema response_format; fall back to prompt-only JSON."""
    return _complete_json(
        prompt,
        llm=llm,
        system=(
            "Return only JSON matching the interaction_profile schema. "
            "additionalProperties are forbidden."
        ),
        response_schema=INTERACTION_PROFILE_JSON_SCHEMA,
    )


def _rextraction_instruction(profile: dict[str, Any]) -> str:
    """Targeted correction so the retry call is not identical to the first."""
    lines = [
        "RE-EXTRACTION CORRECTION (prior output failed validation):",
        "Fix ONLY the issues below. Do not copy calibration example action strings.",
        "Do not attach requires_devices to built-in (optional_accessory:false) surfaces.",
    ]
    for flag in profile.get("validation_flags") or []:
        if not isinstance(flag, dict):
            continue
        if flag.get("flag") not in NEEDS_REXTRACTION_FLAGS:
            continue
        lines.append(
            f"- [{flag.get('flag')}] @ {flag.get('field_path')}: {flag.get('detail')}"
        )
    return "\n".join(lines)


def _apply_registry_identity(
    profile: dict[str, Any],
    *,
    manufacturer: Any,
    model: Any,
) -> dict[str, Any]:
    """Stamp manufacturer/model from the registry. Never copy system_category."""
    if not isinstance(profile.get("device"), dict):
        profile["device"] = {}
    profile["device"]["manufacturer"] = str(manufacturer or "")
    profile["device"]["model"] = str(model or "")
    # Reject taxonomy leaks (e.g. electrical_dc copied from DEVICE TO PROFILE).
    cat = str(profile["device"].get("category_freeform") or "").strip()
    if category_freeform_is_taxonomic(cat):
        profile["device"]["category_freeform"] = ""
    return profile


def _compose_map_prompt(
    *,
    instruction: str,
    device_block: dict[str, Any],
    manual_selection_policy: str,
    manuals: list[dict[str, Any]],
    schema_hint: str,
    group_excerpts: list[dict[str, Any]],
    group_id: str,
) -> str:
    return "\n".join(
        [
            instruction,
            "",
            MAP_PARTIAL_MANUAL_LINE,
            f"(map group: {group_id})",
            "",
            "DEVICE TO PROFILE:",
            json.dumps(device_block, indent=2),
            "",
            "MANUAL SELECTION POLICY:",
            manual_selection_policy,
            "",
            "SOURCE MANUALS:",
            json.dumps(manuals, indent=2),
            "",
            "MANUAL EXCERPTS (only permitted facts):",
            json.dumps(group_excerpts, indent=2),
            "",
            "OUTPUT SCHEMA:",
            schema_hint,
            "",
            "Respond with valid JSON only.",
        ]
    )


def _postprocess_extracted_profile(
    raw_profile: dict[str, Any],
    excerpts: list[dict[str, Any]],
    *,
    llm: AzureOpenAI | None,
    coverage: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Validate → repairs → derive → final validate (on merged profile).

    Returns (profile, repair_meta) where repair_meta covers evidence + absence.
    """
    annotated = validate_interaction_profile(
        raw_profile, excerpts=excerpts, coverage=coverage
    )
    repair_meta: dict[str, Any] = {
        "evidence": {"attempted": False},
        "absence": {"attempted": False},
    }
    if should_attempt_absence_repair(annotated):
        annotated, absence_meta = repair_absence_flags(
            annotated,
            excerpts,
            complete=lambda prompt: _complete_json(prompt, llm=llm),
        )
        repair_meta["absence"] = absence_meta
        annotated = validate_interaction_profile(
            annotated, excerpts=excerpts, coverage=coverage
        )
    if should_attempt_evidence_repair(annotated):
        annotated, evidence_meta = repair_incomplete_evidence(
            annotated,
            excerpts,
            complete=lambda prompt: _complete_json(prompt, llm=llm),
        )
        repair_meta["evidence"] = evidence_meta
        annotated = validate_interaction_profile(
            annotated, excerpts=excerpts, coverage=coverage
        )

    profile = normalize_profile(annotated)
    for key in (
        "repairs",
        "coverage",
        "group_utilization",
        "merge_conflicts",
    ):
        if annotated.get(key) is not None:
            profile[key] = annotated.get(key)
    profile = apply_derived_actions(profile, excerpts=excerpts)
    # Preserve merge annotations through derive.
    if annotated.get("group_utilization") is not None:
        profile["group_utilization"] = annotated.get("group_utilization")
    if annotated.get("merge_conflicts") is not None:
        profile["merge_conflicts"] = annotated.get("merge_conflicts")
    final = validate_interaction_profile(
        profile, excerpts=excerpts, coverage=coverage or profile.get("coverage")
    )
    profile["validation_flags"] = list(final.get("validation_flags") or [])
    profile["needs_rextraction"] = bool(final.get("needs_rextraction"))
    if final.get("repairs"):
        profile["repairs"] = list(final.get("repairs") or [])
    if final.get("coverage"):
        profile["coverage"] = dict(final.get("coverage") or {})
    if final.get("group_utilization") is not None:
        profile["group_utilization"] = final.get("group_utilization")
    if final.get("merge_conflicts") is not None:
        profile["merge_conflicts"] = final.get("merge_conflicts")
    return profile, repair_meta


def _map_reduce_once(
    *,
    groups: list[dict[str, Any]],
    instruction: str,
    device_block: dict[str, Any],
    manual_selection_policy: str,
    manuals: list[dict[str, Any]],
    schema_hint: str,
    manufacturer: str,
    model: str,
    llm: AzureOpenAI | None,
    prompt_trailer: str = "",
) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any]]:
    """One map-reduce pass. Returns (merged_profile, map_groups, reduced_meta)."""
    map_groups: list[dict[str, Any]] = []
    group_results: list[dict[str, Any]] = []

    for group in groups:
        group_id = str(group.get("group_id") or "group")
        group_excerpts = list(group.get("excerpts") or [])
        prompt = _compose_map_prompt(
            instruction=instruction,
            device_block=device_block,
            manual_selection_policy=manual_selection_policy,
            manuals=manuals,
            schema_hint=schema_hint,
            group_excerpts=group_excerpts,
            group_id=group_id,
        )
        if prompt_trailer:
            prompt = prompt + "\n\n" + prompt_trailer + "\n"
        raw_group = _complete_structured(prompt, llm=llm)
        raw_group = _apply_registry_identity(
            raw_group, manufacturer=manufacturer, model=model
        )
        map_groups.append(
            {
                "group_id": group_id,
                "is_introduction": bool(group.get("is_introduction")),
                "partition": group.get("partition"),
                "chapter": group.get("chapter"),
                "predicted_fields": list(group.get("predicted_fields") or []),
                "excerpt_count": len(group_excerpts),
                "excerpts": group_excerpts,
                "assembled_user_prompt": prompt,
                "raw_profile": raw_group,
            }
        )
        group_results.append(
            {
                "group_id": group_id,
                "is_introduction": bool(group.get("is_introduction")),
                "predicted_fields": list(group.get("predicted_fields") or []),
                "excerpts": group_excerpts,
                "profile": raw_group,
            }
        )

    for i, result in enumerate(group_results):
        counts = measure_group_contribution(result.get("profile") or {})
        if sum(counts.values()) > 0 or not result.get("excerpts"):
            continue
        mapped = map_groups[i]
        retry_prompt = (
            str(mapped.get("assembled_user_prompt") or "")
            + "\n\n"
            + UNUTILIZED_RETRY_LINE
            + "\n"
        )
        retry_raw = _complete_structured(retry_prompt, llm=llm)
        retry_raw = _apply_registry_identity(
            retry_raw, manufacturer=manufacturer, model=model
        )
        map_groups[i] = {
            **mapped,
            "raw_profile": retry_raw,
            "unutilized_retry": True,
            "assembled_user_prompt": retry_prompt,
        }
        group_results[i] = {**result, "profile": retry_raw}

    # Targeted retries when known high-value manual facts are present in the
    # group text but omitted from the map output (no extract-prompt edit).
    for i, result in enumerate(group_results):
        excerpts_i = list(result.get("excerpts") or [])
        profile_i = dict(result.get("profile") or {})
        applied: list[str] = []
        for _attempt in range(4):
            need_ac = group_text_has_ac_limit_adjust(
                excerpts_i
            ) and not profile_has_ac_limit_action(profile_i)
            need_remote = group_text_has_remote_panel(
                excerpts_i
            ) and not profile_has_remote_panel(profile_i)
            need_bms = (
                group_text_has_bms_protect(excerpts_i)
                and not profile_has_bms_protect(profile_i)
            ) or (
                group_text_has_bms_recovery(excerpts_i)
                and not profile_has_bms_recovery(profile_i)
            )
            need_dip = group_text_has_dip_commission(
                excerpts_i
            ) and not profile_has_dip_commission(profile_i)
            if need_ac and "ac_limit_retry" not in applied:
                trailer, tag = AC_LIMIT_RETRY_LINE, "ac_limit_retry"
            elif need_remote and "remote_panel_retry" not in applied:
                trailer, tag = REMOTE_PANEL_RETRY_LINE, "remote_panel_retry"
            elif need_bms and "bms_protect_retry" not in applied:
                trailer, tag = BMS_PROTECT_RETRY_LINE, "bms_protect_retry"
            elif need_dip and "dip_commission_retry" not in applied:
                trailer, tag = DIP_COMMISSION_RETRY_LINE, "dip_commission_retry"
            else:
                break
            mapped = map_groups[i]
            retry_prompt = (
                str(mapped.get("assembled_user_prompt") or "")
                + "\n\n"
                + trailer
                + "\n"
            )
            retry_raw = _complete_structured(retry_prompt, llm=llm)
            retry_raw = _apply_registry_identity(
                retry_raw, manufacturer=manufacturer, model=model
            )
            applied.append(tag)
            map_groups[i] = {
                **mapped,
                "raw_profile": retry_raw,
                tag: True,
                "targeted_retries": list(applied),
                "assembled_user_prompt": retry_prompt,
            }
            profile_i = retry_raw
            group_results[i] = {**result, "profile": retry_raw}

    reduced = merge_group_profiles(group_results)
    raw_profile = reduced["profile"]
    raw_profile = _apply_registry_identity(
        raw_profile, manufacturer=manufacturer, model=model
    )
    raw_profile["merge_conflicts"] = list(reduced.get("conflicts") or [])
    raw_profile["group_utilization"] = list(reduced.get("utilization") or [])
    return raw_profile, map_groups, reduced


def extract_interaction_profile(
    conn: Connection,
    equipment_id: str,
    *,
    llm: AzureOpenAI | None = None,
    stability_n: int = STABILITY_N,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    """Return (annotated_profile, source_citations, extraction_input).

    ``extraction_input`` is the full observability payload (prompt + routed
    excerpts + retrieval diagnostics). Persist it beside the output JSON.

    Pipeline order: Stage 0 retrieve once → Stage 1 map-reduce up to N=3
    (short-circuit when first two post-merge profiles match) → field-level
    vote → 1.5 validate/repair → Stage 1.6 derive → final validate.
    Callers must not feed ``needs_rextraction: true`` profiles into Stage 2.
    """
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
        raise InteractionProfileError(f"Equipment not found: {equipment_id}")

    manufacturer, model, category = row[0], row[1], row[2]
    all_manuals = list_ingested_manuals(conn, equipment_id)
    if not all_manuals:
        raise InteractionProfileError(
            "No legally cleared, ingested manuals for this equipment."
        )

    try:
        manuals, manual_selection_policy = select_manuals_for_interaction_profile(
            all_manuals
        )
    except FragmentDraftingError as exc:
        raise InteractionProfileError(str(exc)) from exc

    manual_ids = [manual["id"] for manual in manuals]
    excerpts, query_diagnostics, coverage = retrieve_manual_excerpts_with_diagnostics(
        manual_ids, PROFILE_RETRIEVAL_QUERIES
    )
    if not excerpts:
        raise InteractionProfileError(
            "Manual excerpts not found in the vector index. Re-ingest first."
        )

    instruction = get_draft_prompt("interaction_profile")
    if not instruction:
        raise InteractionProfileError("Missing extract_interaction_profile prompt.")

    schema_hint = load_prompt_text("guide/schemas/interaction_profile.txt")
    device_block = {
        "manufacturer": manufacturer,
        "model": model,
        "category_freeform_hint": (
            "Use the manual's own product category words only "
            "(never registry enums like electrical_dc)."
        ),
    }

    groups = partition_excerpts(
        excerpts, inventory_headings=list(coverage.get("headings_all") or [])
    )
    n_runs = max(1, min(int(stability_n), STABILITY_N))
    run_profiles: list[dict[str, Any]] = []
    run_map_groups: list[list[dict[str, Any]]] = []
    run_reduced: list[dict[str, Any]] = []
    short_circuit = False

    for run_i in range(n_runs):
        raw_run, map_groups_run, reduced_run = _map_reduce_once(
            groups=groups,
            instruction=instruction,
            device_block=device_block,
            manual_selection_policy=manual_selection_policy,
            manuals=manuals,
            schema_hint=schema_hint,
            manufacturer=manufacturer,
            model=model,
            llm=llm,
        )
        run_profiles.append(raw_run)
        run_map_groups.append(map_groups_run)
        run_reduced.append(reduced_run)
        if (
            run_i == 1
            and profiles_identical_post_merge(run_profiles[0], run_profiles[1])
        ):
            short_circuit = True
            break

    raw_profile, extraction_votes, unstable_flags = vote_merged_profiles(
        run_profiles, excerpts=excerpts
    )
    # Post-vote: speaks→data_roles needed_for + OR-split + exact-key dedupe.
    from interaction_profile_kinds import finalize_profile_requires

    needed_for_flags = finalize_profile_requires(raw_profile)
    map_groups = run_map_groups[-1]
    reduced = run_reduced[-1]

    extraction_input: dict[str, Any] = {
        "routing_mechanism": "rag_retrieval_queries",
        "stage0_heading_routing": False,
        "extraction_mode": "map_reduce",
        "stability_voting": {
            "n_requested": n_runs,
            "n_completed": len(run_profiles),
            "short_circuit_identical": short_circuit,
            "unstable_flag_count": len(unstable_flags),
            "votes": extraction_votes,
        },
        "note": (
            "Stage 1 map-reduce with stability voting: excerpts partitioned by "
            "chapter (fallback batches); up to N=3 map-reduce passes on the same "
            "Stage 0 payload; field-level vote; then validate/derive."
        ),
        "retrieval_queries": list(PROFILE_RETRIEVAL_QUERIES),
        "query_diagnostics": query_diagnostics,
        "coverage": {
            k: coverage.get(k)
            for k in (
                "chunk_count",
                "heading_count",
                "headings_covered_count",
                "heading_coverage_fraction",
                "coverage_low_threshold",
                "coverage_low",
                "top_k_used",
                "top_k_scaling",
                "heading_fill_queries",
                "heading_fill_hits",
                "headings_all",
                "headings_covered",
                "headings_missing",
            )
        },
        "device": device_block,
        "registry_system_category": str(category or ""),
        "manual_selection_policy": manual_selection_policy,
        "source_manuals": manuals,
        "excerpts": excerpts,
        "map_groups": map_groups,
        "merge": {
            "conflicts": reduced.get("conflicts"),
            "group_contributions": reduced.get("group_contributions"),
            "utilization": reduced.get("utilization"),
        },
        "prompt_instruction_path": "guide/llm/extract_interaction_profile.txt",
        "prompt_schema_path": "guide/schemas/interaction_profile.txt",
        "prompt_instruction_text": instruction,
        "prompt_schema_text": schema_hint,
        "assembled_user_prompt": (
            map_groups[0]["assembled_user_prompt"] if map_groups else ""
        ),
        "prompt_contains_evidence_priority_v33": (
            "1-8 objects" in instruction
            and "(a) data_roles" in instruction
            and "(b) safety_role" in instruction
        ),
        "prompt_contains_example_isolation": (
            "examples concern OTHER devices" in instruction
            or "OTHER devices / situations" in instruction
        ),
        "prompt_contains_map_partial_line": MAP_PARTIAL_MANUAL_LINE in (
            map_groups[0]["assembled_user_prompt"] if map_groups else ""
        ),
        "prompt_contains_example_m": (
            "built-in thresholds are met" in instruction
            and "has_manual_override: true" in instruction
        ),
    }

    profile, repair_meta = _postprocess_extracted_profile(
        raw_profile, excerpts, llm=llm, coverage=coverage
    )
    # Attach stability annotations after postprocess (preserve through validate).
    if unstable_flags or needed_for_flags:
        flags = list(profile.get("validation_flags") or [])
        existing = {
            (f.get("flag"), f.get("field_path"), f.get("detail"))
            for f in flags
            if isinstance(f, dict)
        }
        for flag in list(unstable_flags) + list(needed_for_flags):
            key = (flag.get("flag"), flag.get("field_path"), flag.get("detail"))
            if key not in existing:
                flags.append(flag)
        profile["validation_flags"] = flags
    if extraction_votes:
        profile["extraction_votes"] = extraction_votes
        profile = apply_instability_triage(profile)
    extraction_input["repair"] = repair_meta
    extraction_input["instability_triage"] = profile.get("instability_triage")

    # Re-extraction retries the whole map-reduce once with a correction trailer
    # on each group prompt (must differ from the first temp-0 calls).
    rextraction_meta: dict[str, Any] = {
        "attempted": False,
        "max_retries": MAX_REXTRACTION_RETRIES,
        "still_needs_rextraction": bool(profile.get("needs_rextraction")),
    }
    if profile.get("needs_rextraction") and MAX_REXTRACTION_RETRIES >= 1:
        correction = _rextraction_instruction(profile)
        rextraction_meta["attempted"] = True
        rextraction_meta["correction_instruction"] = correction
        raw_profile, map_groups, reduced = _map_reduce_once(
            groups=groups,
            instruction=instruction,
            device_block=device_block,
            manual_selection_policy=manual_selection_policy,
            manuals=manuals,
            schema_hint=schema_hint,
            manufacturer=manufacturer,
            model=model,
            llm=llm,
            prompt_trailer=correction,
        )
        profile, repair_meta = _postprocess_extracted_profile(
            raw_profile, excerpts, llm=llm, coverage=coverage
        )
        extraction_input["repair"] = repair_meta
        extraction_input["map_groups"] = map_groups
        extraction_input["merge"] = {
            "conflicts": reduced.get("conflicts"),
            "group_contributions": reduced.get("group_contributions"),
            "utilization": reduced.get("utilization"),
        }
        rextraction_meta["still_needs_rextraction"] = bool(
            profile.get("needs_rextraction")
        )
        if profile.get("needs_rextraction"):
            rextraction_meta["human_review"] = True

    extraction_input["rextraction"] = rextraction_meta

    # v4.3: procedure inventory + scoped adjudicated repair (one map-retry/group).
    def _procedure_repair_map(
        scoped_excerpts: list[dict[str, Any]], trailer: str
    ) -> dict[str, Any]:
        prompt = _compose_map_prompt(
            instruction=instruction,
            device_block=device_block,
            manual_selection_policy=manual_selection_policy,
            manuals=manuals,
            schema_hint=schema_hint,
            group_excerpts=scoped_excerpts,
            group_id="procedure_repair",
        )
        if trailer:
            prompt = prompt + "\n\n" + trailer + "\n"
        raw = _complete_structured(prompt, llm=llm)
        return _apply_registry_identity(
            raw, manufacturer=manufacturer, model=model
        )

    profile, procedure_payload = run_procedure_inventory_pass(
        profile,
        excerpts=excerpts,
        map_groups=map_groups,
        repair_enabled=PROCEDURE_REPAIR_ENABLED,
        repair_map_fn=_procedure_repair_map,
    )
    extraction_input["procedure_inventory"] = procedure_payload

    extraction_input["post_validation_flag_names"] = sorted(
        validation_flag_names(profile)
    )
    extraction_input["needs_rextraction"] = bool(profile.get("needs_rextraction"))
    extraction_input["merged_profile_pre_validate"] = raw_profile

    citations = {
        "manuals": manuals,
        "manuals_available": all_manuals,
        "manual_selection_policy": manual_selection_policy,
        "excerpts": excerpts,
        "query_diagnostics": query_diagnostics,
        "coverage": coverage,
        "map_group_count": len(map_groups),
        "legal_status_required": CLEARED_MANUAL_LEGAL_STATUS,
        "validation_issues": validate_profile(profile),
        "validation_flags": profile["validation_flags"],
        "needs_rextraction": profile["needs_rextraction"],
        "repairs": list(profile.get("repairs") or []),
        "repair": repair_meta,
        "rextraction": rextraction_meta,
        "stability_voting": extraction_input.get("stability_voting"),
        "procedure_inventory": procedure_payload,
        "structured_outputs": True,
    }
    return profile, citations, extraction_input


def load_profiles_file(path: Path) -> dict[str, dict[str, Any]]:
    """Load ``{device_key: profile}`` or a list of ``{device_key, profile}``."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "profiles" in raw:
        raw = raw["profiles"]
    if isinstance(raw, list):
        out: dict[str, dict[str, Any]] = {}
        for item in raw:
            key = str(item.get("device_key") or "").strip()
            if not key:
                continue
            out[key] = normalize_profile(item.get("profile") or item)
        return out
    if isinstance(raw, dict):
        return {
            str(key): normalize_profile(value if isinstance(value, dict) else {})
            for key, value in raw.items()
        }
    raise InteractionProfileError(f"Unsupported profiles file shape: {path}")
