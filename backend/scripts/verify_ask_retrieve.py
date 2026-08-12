"""Offline checks for Ask troubleshooting retrieval helpers.

Usage (from backend/):
  python scripts/verify_ask_retrieve.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from llama_index.core.schema import NodeWithScore, TextNode

from query import (
    build_retrieve_queries,
    is_troubleshooting_query,
    merge_retrieved_nodes,
)
from prompts.ask.registry import get_ask_text


def _node(node_id: str, text: str = "x") -> NodeWithScore:
    return NodeWithScore(
        node=TextNode(text=text, id_=node_id, metadata={"manual_id": "m"}),
        score=0.5,
    )


def main() -> int:
    failures: list[str] = []

    if not is_troubleshooting_query("The fridge is not working"):
        failures.append("should detect 'not working'")
    if not is_troubleshooting_query("Why is the alarm sounding?"):
        failures.append("should detect alarm/why is")
    if is_troubleshooting_query("Where is the raw water strainer?"):
        failures.append("location question should not be troubleshooting")

    plain = build_retrieve_queries(
        question="Where is the strainer?",
        retrieve_query="Where is the strainer?",
        troubleshooting=False,
    )
    if plain != ["Where is the strainer?"]:
        failures.append(f"plain retrieve queries unexpected: {plain!r}")

    follow = build_retrieve_queries(
        question="How do I fix it?",
        retrieve_query="How do I fix the watermaker?",
        troubleshooting=True,
    )
    if follow[0] != "How do I fix the watermaker?":
        failures.append(f"primary should be condensed: {follow!r}")
    if "How do I fix it?" not in follow:
        failures.append(f"raw question missing from troubleshooting queries: {follow!r}")
    if not any("troubleshooting FAQ" in q for q in follow):
        failures.append(f"booster query missing: {follow!r}")

    merged = merge_retrieved_nodes(
        [
            [_node("a"), _node("b")],
            [_node("b"), _node("c"), _node("d")],
        ],
        limit=3,
    )
    if [n.node.node_id for n in merged] != ["a", "b", "c"]:
        failures.append(f"merge/dedupe/limit unexpected: {merged!r}")

    text_qa = get_ask_text("text_qa")
    for needle in (
        "Relevance tiers",
        "Not in this vessel's manuals — general guidance:",
        "Do not invent chunk IDs",
        "Do not invent vessel-specific facts",
    ):
        if needle not in text_qa:
            failures.append(f"text_qa missing policy line: {needle!r}")

    if failures:
        for item in failures:
            print(f"FAIL — {item}")
        return 1
    print("OK — Ask retrieve helpers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
