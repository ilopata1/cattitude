"""Ask (RAG) prompt file paths."""

from __future__ import annotations

from prompts.loader import load_prompt_text

ASK_FILES = {
    "marine_context": "ask/marine_context.txt",
    "text_qa": "ask/text_qa.txt",
    "refine": "ask/refine.txt",
    "query_prefix": "ask/query_prefix.txt",
    "retry_prefix": "ask/retry_prefix.txt",
    "content_filter_message": "ask/content_filter_message.txt",
}


def get_ask_text(key: str) -> str:
    return load_prompt_text(ASK_FILES[key])
