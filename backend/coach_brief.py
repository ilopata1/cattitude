"""Check an optional coach rewrite and fall back to the deterministic briefing.

The model reply is parsed as JSON and rejected whole. Fences are not stripped
and broken JSON is not repaired.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from llm_client import chat_model_name

logger = logging.getLogger(__name__)

COACH_TEMPERATURE = 0.1
SHORT_WORD_LIMIT = 180
LONG_WORD_LIMIT = 450

SECTIONS = (
    "header",
    "bottom_line",
    "sail_plan",
    "balance",
    "performance",
    "sea_angle",
    "downwind",
    "next",
    "caveats",
)

SECTION_LABELS = {
    "header": None,
    "bottom_line": "BOTTOM LINE",
    "sail_plan": "SAIL PLAN",
    "balance": "BALANCE",
    "performance": "PERFORMANCE",
    "sea_angle": "SEA & ANGLE",
    "downwind": "DOWNWIND",
    "next": "NEXT 1\u20133 H",
    "caveats": "CAVEATS",
}

_LINE = {
    "type": "object",
    "additionalProperties": False,
    "required": ["finding_id", "sentence"],
    "properties": {
        "finding_id": {"type": "string"},
        "sentence": {"type": "string"},
    },
}

COACH_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "coach_brief",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": list(SECTIONS),
            "properties": {
                key: {"type": "array", "items": _LINE}
                for key in SECTIONS
            },
        },
    },
}

_MORE_SAIL = re.compile(
    r"shake\s+out|\bunreef\b|larger headsail|more sail|\bhoist\b",
    re.IGNORECASE,
)
_FULL_MAIN = re.compile(r"\bfull main\b", re.IGNORECASE)
_NUMBER = re.compile(r"-?\d+(?:\.\d+)?")

_PROMPT_PATH = Path(__file__).resolve().parent / "content" / "prompts" / "coach_system.txt"


def system_prompt() -> str:
    return _PROMPT_PATH.read_text(encoding="utf-8")


def rewrite_coach_brief(body: dict[str, Any], *, client: Any) -> dict[str, str]:
    """Return the rewrite, or the deterministic text when the reply is unusable."""
    deterministic = str(body.get("deterministic") or "")
    try:
        raw = _complete(client, _messages(body))
    except _Timeout:
        logger.warning("Coach rewrite timed out; using the deterministic briefing")
        return _fallback(deterministic, "timeout")
    except Exception as exc:
        logger.warning("Coach rewrite failed; using the deterministic briefing: %s", exc)
        return _fallback(deterministic, "error")

    parsed = parse_coach_reply(raw)
    if parsed is None:
        logger.warning("Coach rewrite rejected: schema")
        return _fallback(deterministic, "schema")

    reason = validate_coach_reply(parsed, body)
    if reason:
        logger.warning("Coach rewrite rejected: %s", reason)
        return _fallback(deterministic, reason)
    return {"text": assemble_coach_brief(parsed), "source": "llm"}


def parse_coach_reply(raw: str) -> dict[str, Any] | None:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict) or set(payload) != set(SECTIONS):
        return None
    for key in SECTIONS:
        rows = payload[key]
        if not isinstance(rows, list):
            return None
        for row in rows:
            if not isinstance(row, dict) or set(row) != {"finding_id", "sentence"}:
                return None
            if not isinstance(row["finding_id"], str) or not isinstance(row["sentence"], str):
                return None
            if not row["finding_id"].strip() or not row["sentence"].strip():
                return None
    return payload


def validate_coach_reply(parsed: dict[str, Any], body: dict[str, Any]) -> str | None:
    findings = [item for item in body.get("findings") or [] if isinstance(item, dict)]
    by_id = {str(item.get("id")): item for item in findings if item.get("id")}
    if _grounding_failed(parsed, by_id):
        return "grounding"
    if _numbers_failed(parsed, by_id):
        return "numbers"
    if _safety_failed(parsed, findings, by_id):
        return "safety"
    if _coverage_failed(parsed, findings):
        return "coverage"
    style = body.get("style") or "short"
    limit = LONG_WORD_LIMIT if style == "long" else SHORT_WORD_LIMIT
    if _word_count(assemble_coach_brief(parsed)) > limit:
        return "length"
    return None


def assemble_coach_brief(parsed: dict[str, Any]) -> str:
    blocks: list[str] = []
    for key in SECTIONS:
        sentences = [str(row["sentence"]).strip() for row in parsed[key]]
        if key == "header":
            blocks.append(" ".join(sentences))
            continue
        if key == "bottom_line":
            if sentences:
                numbered = "\n".join(f"{index}. {_period(sentence)}" for index, sentence in enumerate(sentences, 1))
                blocks.append(f"BOTTOM LINE\n{numbered}")
            else:
                blocks.append("BOTTOM LINE\nNo change.")
            continue
        if not sentences:
            continue
        label = SECTION_LABELS[key]
        blocks.append(f"{label}  {' '.join(_period(sentence) for sentence in sentences)}")
    return "\n\n".join(blocks)


def _complete(client: Any, messages: list[dict[str, str]]) -> str:
    try:
        return _call(client, messages, COACH_TEMPERATURE)
    except _Timeout:
        raise
    except Exception as exc:
        if "temperature" not in str(exc).lower():
            raise
        logger.warning("Coach model rejected a custom temperature; retrying once without it")
        return _call(client, messages, None)


def _call(client: Any, messages: list[dict[str, str]], temperature: float | None) -> str:
    kwargs: dict[str, Any] = {
        "model": chat_model_name(),
        "messages": messages,
        "response_format": COACH_RESPONSE_FORMAT,
    }
    if temperature is not None:
        kwargs["temperature"] = temperature
    try:
        response = client.chat.completions.create(**kwargs)
    except Exception as exc:
        if _is_timeout(exc):
            raise _Timeout from exc
        raise
    content = response.choices[0].message.content
    return content if isinstance(content, str) else ""


def _messages(body: dict[str, Any]) -> list[dict[str, str]]:
    style = body.get("style") or "short"
    limit = LONG_WORD_LIMIT if style == "long" else SHORT_WORD_LIMIT
    payload = {
        "style": style,
        "word_limit": limit,
        "snapshot": body.get("snapshot") or {},
        "findings": body.get("findings") or [],
        "reference": body.get("deterministic") or "",
    }
    return [
        {"role": "system", "content": system_prompt()},
        {
            "role": "user",
            "content": (
                "Rewrite the reference as the JSON schema. "
                "Use only finding ids and evidence numbers from FINDINGS.\n"
                + json.dumps(payload, default=str)
            ),
        },
    ]


def _grounding_failed(parsed: dict[str, Any], by_id: dict[str, dict[str, Any]]) -> bool:
    for _sentence, finding_id in _sentences(parsed):
        if finding_id not in by_id:
            return True
    return False


def _numbers_failed(parsed: dict[str, Any], by_id: dict[str, dict[str, Any]]) -> bool:
    for sentence, finding_id in _sentences(parsed):
        evidence = by_id[finding_id].get("evidence") or {}
        allowed = _allowed_numbers(evidence if isinstance(evidence, dict) else {})
        for raw in _NUMBER.findall(sentence):
            if not _matches_number(float(raw), allowed):
                return True
    return False


def _safety_failed(
    parsed: dict[str, Any],
    findings: list[dict[str, Any]],
    by_id: dict[str, dict[str, Any]],
) -> bool:
    used = {finding_id for _sentence, finding_id in _sentences(parsed)}
    for finding in findings:
        if finding.get("direction") == "less-sail" and str(finding.get("id")) not in used:
            return True
    for sentence, finding_id in _sentences(parsed):
        if not _recommends_more_sail(sentence):
            continue
        finding = by_id.get(finding_id) or {}
        if finding.get("direction") == "same" and _phrase_in_finding(sentence, finding):
            continue
        return True
    return False


def _coverage_failed(parsed: dict[str, Any], findings: list[dict[str, Any]]) -> bool:
    bottom = {str(row["finding_id"]) for row in parsed["bottom_line"]}
    for finding in findings:
        if finding.get("severity") == "action" and str(finding.get("id")) not in bottom:
            return True
    return False


def _recommends_more_sail(sentence: str) -> bool:
    if _MORE_SAIL.search(sentence):
        return True
    if _FULL_MAIN.search(sentence) and "avoid" not in sentence.lower():
        return True
    return False


def _phrase_in_finding(sentence: str, finding: dict[str, Any]) -> bool:
    source = str(finding.get("text") or "").lower()
    if _MORE_SAIL.search(sentence) and _MORE_SAIL.search(source):
        return True
    return bool(_FULL_MAIN.search(sentence) and _FULL_MAIN.search(source))


def _allowed_numbers(evidence: dict[str, Any]) -> set[float]:
    allowed: set[float] = set()
    for value in evidence.values():
        if isinstance(value, bool):
            continue
        number: float | None = None
        if isinstance(value, (int, float)):
            number = float(value)
        elif isinstance(value, str):
            try:
                number = float(value)
            except ValueError:
                number = None
        if number is None:
            continue
        allowed.add(number)
        allowed.add(float(round(number)))
        allowed.add(float(round(number / 5.0) * 5))
        allowed.add(round(number * 10) / 10)
    return allowed


def _matches_number(number: float, allowed: set[float]) -> bool:
    return any(abs(number - candidate) < 1e-6 for candidate in allowed)


def _sentences(parsed: dict[str, Any]) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for key in SECTIONS:
        for row in parsed[key]:
            rows.append((str(row["sentence"]), str(row["finding_id"])))
    return rows


def _period(sentence: str) -> str:
    return sentence if sentence.endswith((".", "!", "?")) else f"{sentence}."


def _word_count(text: str) -> int:
    return len([word for word in text.split() if word])


def _fallback(deterministic: str, reason: str) -> dict[str, str]:
    return {"text": deterministic, "source": "deterministic", "rejected_reason": reason}


def _is_timeout(exc: BaseException) -> bool:
    name = type(exc).__name__.lower()
    return "timeout" in name or "timed out" in str(exc).lower()


class _Timeout(Exception):
    pass
