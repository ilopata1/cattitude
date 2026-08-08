"""Offline checks for Ask multi-turn history helpers.

Usage (from backend/):
  python scripts/verify_ask_multiturn.py
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from query import (
    condense_question,
    format_conversation_str,
    normalize_conversation_history,
)


def main() -> int:
    failures: list[str] = []

    question = "How do I restart it?"
    history = [
        {"role": "user", "content": "Where is the watermaker?"},
        {"role": "assistant", "content": "In the port engine room."},
        {"role": "user", "content": question},
    ]

    prior = normalize_conversation_history(history, question)
    if prior != [
        {"role": "user", "content": "Where is the watermaker?"},
        {"role": "assistant", "content": "In the port engine room."},
    ]:
        failures.append(f"normalize should strip trailing duplicate user: {prior!r}")

    junk = normalize_conversation_history(
        [
            {"role": "system", "content": "ignore"},
            {"role": "user", "content": ""},
            "not-a-dict",
            {"role": "USER", "content": "  Start the genset  "},
            {"role": "assistant", "content": "Press the green button."},
        ],
        "Follow-up",
    )
    if junk != [
        {"role": "user", "content": "Start the genset"},
        {"role": "assistant", "content": "Press the green button."},
    ]:
        failures.append(f"normalize should drop invalid turns: {junk!r}")

    long_history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"}
        for i in range(12)
    ]
    capped = normalize_conversation_history(long_history, "new q", max_messages=8)
    if len(capped) != 8 or capped[0]["content"] != "m4":
        failures.append(f"normalize should cap to last 8: {capped!r}")

    if normalize_conversation_history(None, question) != []:
        failures.append("None history should yield []")

    if normalize_conversation_history([], question) != []:
        failures.append("empty history should yield []")

    formatted = format_conversation_str(prior)
    if "Guest: Where is the watermaker?" not in formatted:
        failures.append(f"format missing guest line: {formatted!r}")
    if "Assistant: In the port engine room." not in formatted:
        failures.append(f"format missing assistant line: {formatted!r}")
    if format_conversation_str([]) != "(none)":
        failures.append("empty format should be (none)")

    # Empty history ⇒ no LLM call
    llm = MagicMock()
    out = condense_question(question, [], llm=llm)
    if out != question:
        failures.append(f"empty history should return raw question: {out!r}")
    llm.complete.assert_not_called()

    # History present ⇒ condensed from LLM
    llm2 = MagicMock()
    llm2.complete.return_value = MagicMock(
        text="How do I restart the watermaker?"
    )
    condensed = condense_question(question, prior, llm=llm2)
    if condensed != "How do I restart the watermaker?":
        failures.append(f"condense unexpected: {condensed!r}")
    llm2.complete.assert_called_once()
    prompt_arg = llm2.complete.call_args[0][0]
    if "watermaker" not in prompt_arg or question not in prompt_arg:
        failures.append(f"condense prompt missing context: {prompt_arg!r}")

    # Empty model output ⇒ fall back
    llm3 = MagicMock()
    llm3.complete.return_value = MagicMock(text="  ")
    if condense_question(question, prior, llm=llm3) != question:
        failures.append("empty condense output should fall back to raw question")

    if failures:
        for item in failures:
            print(f"FAIL — {item}")
        return 1
    print("OK — Ask multi-turn helpers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
