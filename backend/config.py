from pathlib import Path
from typing import Annotated

from pydantic import BeforeValidator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _parse_cors_origins(v: object) -> object:
    if isinstance(v, str):
        return [s.strip() for s in v.split(",") if s.strip()]
    return v

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent


def _discover_env_files() -> tuple[str, ...]:
    """Load repo-root .env first, then backend/.env overrides (if present)."""
    paths = (_REPO_ROOT / ".env", _BACKEND_DIR / ".env")
    return tuple(str(p) for p in paths if p.is_file())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_discover_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Azure OpenAI
    azure_openai_api_key: str
    azure_openai_endpoint: str
    azure_openai_api_version: str = "2024-02-01"
    azure_openai_embedding_deployment: str  # e.g. "text-embedding-3-small"
    azure_openai_chat_deployment: str  # e.g. "gpt-4o"

    # Database
    database_url: str  # postgresql://user:pass@host:5432/dbname

    # App (comma-separated in .env; NoDecode skips JSON parsing of the raw string)
    cors_origins: Annotated[
        list[str],
        NoDecode,
        BeforeValidator(_parse_cors_origins),
    ] = ["http://localhost:8080", "http://127.0.0.1:8080"]


settings = Settings()
