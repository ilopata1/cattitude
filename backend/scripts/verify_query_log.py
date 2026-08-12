"""Offline checks for Ask query_log paste-prompt helpers.

Usage (from backend/):
  python scripts/verify_query_log.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from query_log import build_synthesis_paste_prompt, insert_query_log


def main() -> int:
    failures: list[str] = []

    paste = build_synthesis_paste_prompt(
        retrieved_context="[1]\nOpen the seacock before starting.",
        conversation_history=[{"role": "user", "content": "Where is the seacock?"}],
        prepared_query=(
            "[Vessel equipment manual — engine cooling water / exhaust / "
            "plumbing troubleshooting, not a medical question]"
            "How do I start the engine?"
        ),
    )
    for expected in (
        "vessel equipment manual assistant",
        "[1]",
        "Open the seacock before starting.",
        "Where is the seacock?",
        "How do I start the engine?",
        "Prior conversation",
        "Relevance tiers",
        "well-organized answer",
    ):
        if expected.lower() not in paste.lower() and expected not in paste:
            failures.append(f"paste prompt missing {expected!r}")
    if "Not in this vessel's manuals" in paste:
        failures.append("paste prompt should not require vessel-manuals lead-in")

    # insert_query_log rejects non-UUID vessel without hitting the DB.
    class _Boom:
        def execute(self, *args, **kwargs):  # pragma: no cover
            raise AssertionError("should not execute SQL for invalid vessel_id")

    if insert_query_log(_Boom(), vessel_id="not-a-uuid", question="q", answer="a") is not None:
        failures.append("invalid vessel_id should return None")

    if failures:
        for item in failures:
            print(f"FAIL — {item}")
        return 1
    print("OK — Ask query_log helpers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
