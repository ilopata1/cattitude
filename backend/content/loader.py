"""Load curated content YAML files."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

CONTENT_ROOT = Path(__file__).resolve().parent


def _strip_doc_header(text: str) -> str:
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        stripped = lines[index].strip()
        if stripped.startswith("#") or not stripped:
            index += 1
            continue
        break
    return "\n".join(lines[index:])


def load_yaml(relative_path: str) -> Any:
    path = CONTENT_ROOT / relative_path
    if not path.is_file():
        raise FileNotFoundError(f"Content file not found: {path}")
    raw = path.read_text(encoding="utf-8")
    body = _strip_doc_header(raw)
    return yaml.safe_load(body)


@lru_cache(maxsize=32)
def load_yaml_cached(relative_path: str) -> Any:
    return load_yaml(relative_path)
