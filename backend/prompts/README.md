# Purpose: Index of externalized prompts and templates.
#
# backend/prompts/
#   loader.py              — load files; strip leading # documentation headers
#   guide/
#     registry.py          — maps module keys to file paths
#     llm/                 — LLM instructions for vessel guide generation
#     schemas/             — JSON shape hints appended to composed prompts
#     compose/             — wrappers/labels for guide_generation._compose_prompt
#     assembly/            — deterministic template-assembly text (no LLM)
#   ask/                   — RAG / Ask tab (/query) prompts and user messages
#
# Each file starts with # lines documenting purpose, where used, module key, and variables.
# Edit the text below the header block; Python loaders ignore comment lines.
#
# Wired from:
#   guide_generation.py    — guide/llm, guide/schemas, guide/compose
#   guide_template_assembly.py — guide/assembly
#   query.py               — ask/
#
# Database guide_prompt_template rows are seeded from guide/llm files on generation;
# active DB rows override file defaults when present (see _resolve_prompt_text).
