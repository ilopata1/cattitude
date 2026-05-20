"""Keep English-only text from multilingual equipment manual extractions."""

from __future__ import annotations

import re

from langdetect import LangDetectException, detect_langs

# Blocks above this length need a confident English classification.
_MIN_DETECT_LEN = 24
_ENGLISH_PROB = 0.85


def _english_probability(text: str) -> float | None:
    stripped = text.strip()
    if len(stripped) < 12:
        return None
    try:
        for lang in detect_langs(stripped):
            if lang.lang == "en":
                return lang.prob
        return 0.0
    except LangDetectException:
        return None


def _keep_short_segment(text: str) -> bool:
    """Labels, part numbers, and headings often fail language detection."""
    stripped = text.strip()
    if not stripped:
        return False
    if len(stripped) > 80:
        return False
    if not re.search(r"[A-Za-z]{2}", stripped):
        return False
    non_ascii = sum(1 for c in stripped if ord(c) > 127)
    return non_ascii / len(stripped) < 0.12


def _is_english_segment(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    prob = _english_probability(stripped)
    if prob is not None:
        if len(stripped) >= _MIN_DETECT_LEN:
            return prob >= _ENGLISH_PROB
        return prob >= 0.5 or _keep_short_segment(stripped)
    return _keep_short_segment(stripped)


def _english_lines(block: str) -> str:
    lines = [line.strip() for line in block.split("\n") if line.strip()]
    if len(lines) <= 1:
        return ""
    kept = [line for line in lines if _is_english_segment(line)]
    return "\n".join(kept)


def extract_english(text: str) -> str:
    """
    Return only English paragraphs/lines from manual page text.
    Falls back to the original text if nothing classifies as English.
    """
    if not text or not text.strip():
        return text

    blocks = re.split(r"\n\s*\n", text)
    kept: list[str] = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        if _is_english_segment(block):
            kept.append(block)
            continue
        line_text = _english_lines(block)
        if line_text:
            kept.append(line_text)

    if kept:
        return "\n\n".join(kept)

    # Whole page as one block (no paragraph breaks in PDF extract).
    if _is_english_segment(text):
        return text
    line_text = _english_lines(text)
    return line_text if line_text else text
