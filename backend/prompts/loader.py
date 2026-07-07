"""Load externalized prompt and template text files."""

from __future__ import annotations

from pathlib import Path

PROMPTS_ROOT = Path(__file__).resolve().parent


def load_prompt_text(relative_path: str) -> str:
    """Load a prompt file, stripping the leading # documentation header block."""
    path = PROMPTS_ROOT / relative_path
    if not path.is_file():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return strip_doc_header(path.read_text(encoding="utf-8"))


def load_prompt_lines(relative_path: str) -> list[str]:
    """Load a prompt file as non-empty body lines (after header strip)."""
    return [
        line
        for line in load_prompt_text(relative_path).splitlines()
        if line.strip()
    ]


def strip_doc_header(text: str) -> str:
    """Remove consecutive # comment lines and following blank lines at file start."""
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        stripped = lines[index].strip()
        if stripped.startswith("#") or not stripped:
            index += 1
            continue
        break
    return "\n".join(lines[index:]).strip("\n")
