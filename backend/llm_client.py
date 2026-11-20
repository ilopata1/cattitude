"""Shared Azure OpenAI chat client. The model name comes from settings."""

from __future__ import annotations

import re

from llama_index.llms.azure_openai import AzureOpenAI

from config import settings

# Strict JSON schema responses need this API version or a newer one.
STRUCTURED_OUTPUT_MIN = (2024, 10, 21)


def chat_model_name() -> str:
    return settings.azure_openai_chat_model or settings.azure_openai_chat_deployment


def build_chat_llm(temperature: float | None) -> AzureOpenAI:
    """LlamaIndex chat model. Pass None to leave temperature at the library default."""
    kwargs: dict[str, object] = {
        "model": chat_model_name(),
        "deployment_name": settings.azure_openai_chat_deployment,
        "api_key": settings.azure_openai_api_key,
        "azure_endpoint": settings.azure_openai_endpoint,
        "api_version": settings.azure_openai_api_version,
    }
    if temperature is not None:
        kwargs["temperature"] = temperature
    return AzureOpenAI(**kwargs)


def structured_outputs_supported(version: str) -> bool:
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", version.strip())
    if not match:
        return False
    found = tuple(int(part) for part in match.groups())
    return found >= STRUCTURED_OUTPUT_MIN


def require_structured_output_api_version() -> None:
    version = settings.azure_openai_api_version
    if structured_outputs_supported(version):
        return
    raise RuntimeError(
        f"AZURE_OPENAI_API_VERSION {version!r} is older than 2024-10-21. "
        "The coach rewrite needs structured outputs. Set 2024-10-21 or newer and restart."
    )
