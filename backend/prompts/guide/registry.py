"""Registry mapping guide modules to externalized prompt and schema files."""

from __future__ import annotations

from prompts.loader import load_prompt_text

# (content_type, content_key) -> path under backend/prompts/
LLM_PROMPT_FILES: dict[tuple[str, str], str] = {
    ("ui", "homeRuleSections"): "guide/llm/ui__home_rule_sections.txt",
    ("system", "overview"): "guide/llm/system__overview.txt",
    ("system", "engines"): "guide/llm/system__engines.txt",
    ("fix_card_set", "all"): "guide/llm/fix_card_set__all.txt",
    ("draft", "equipment_fragment"): "guide/llm/draft_equipment_fragment.txt",
}

SCHEMA_HINT_FILES: dict[tuple[str, str], str] = {
    ("ui", "homeRuleSections"): "guide/schemas/ui__home_rule_sections.txt",
    ("system", "overview"): "guide/schemas/system__overview.txt",
    ("system", "engines"): "guide/schemas/system__engines.txt",
    ("system", "_generic"): "guide/schemas/system__generic.txt",
    ("checklist", "_generic"): "guide/schemas/checklist__generic.txt",
    ("fix_card_set", "all"): "guide/schemas/fix_card_set__all.txt",
}

COMPOSE_FILES = {
    "output_schema_header": "guide/compose/output_schema_header.txt",
    "input_snapshot_header": "guide/compose/input_snapshot_header.txt",
    "response_footer": "guide/compose/response_footer.txt",
    "reference_label_default": "guide/compose/reference_label_default.txt",
    "reference_label_home_rules": "guide/compose/reference_label_home_rules.txt",
}

GENERIC_LLM_TEMPLATES = {
    "system": "guide/llm/system__generic.txt",
    "checklist": "guide/llm/checklist__generic.txt",
}

DEFAULT_SCHEMA_HINT = "guide/schemas/_default.txt"


def get_llm_prompt(content_type: str, content_key: str) -> str | None:
    path = LLM_PROMPT_FILES.get((content_type, content_key))
    return load_prompt_text(path) if path else None


def get_schema_hint(content_type: str, content_key: str) -> str:
    path = SCHEMA_HINT_FILES.get((content_type, content_key))
    if path:
        return load_prompt_text(path)
    if content_type == "system":
        return load_prompt_text(SCHEMA_HINT_FILES[("system", "_generic")])
    if content_type == "checklist":
        return load_prompt_text(SCHEMA_HINT_FILES[("checklist", "_generic")])
    return load_prompt_text(DEFAULT_SCHEMA_HINT)


def get_compose_text(key: str) -> str:
    return load_prompt_text(COMPOSE_FILES[key])


def get_generic_llm_template(kind: str) -> str:
    return load_prompt_text(GENERIC_LLM_TEMPLATES[kind])


def all_default_llm_prompts() -> dict[tuple[str, str], str]:
    return {
        key: load_prompt_text(path) for key, path in LLM_PROMPT_FILES.items()
    }
