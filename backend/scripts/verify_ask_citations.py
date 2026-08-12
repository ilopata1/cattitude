"""Offline checks for Ask cited-chunk filtering helpers.

Usage (from backend/):
  python scripts/verify_ask_citations.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

from llama_index.core.schema import NodeWithScore, TextNode

from query import (
    AskSynthesis,
    filter_nodes_by_cited,
    format_labeled_context,
    normalize_cited_ids,
)


def _node(text: str, node_id: str) -> NodeWithScore:
    return NodeWithScore(
        node=TextNode(text=text, id_=node_id, metadata={"manual_id": "m"}),
        score=0.5,
    )


def main() -> int:
    failures: list[str] = []

    nodes = [_node(f"chunk-{i}", f"n{i}") for i in range(1, 4)]
    labeled = format_labeled_context(nodes)
    for expected in ("[1]", "[2]", "[3]", "chunk-1", "chunk-2", "chunk-3"):
        if expected not in labeled:
            failures.append(f"labeled context missing {expected!r}")

    if normalize_cited_ids([2, 2, 99, 1, 0, -1, "3"], 3) != [2, 1, 3]:
        failures.append("normalize_cited_ids did not dedupe/order/clamp")

    filtered = filter_nodes_by_cited(nodes, [3, 1])
    if [n.node.node_id for n in filtered] != ["n3", "n1"]:
        failures.append(f"filter_nodes_by_cited unexpected: {filtered!r}")

    soft = filter_nodes_by_cited(nodes, [], relevance="direct")
    if soft is not nodes and [n.node.node_id for n in soft] != ["n1", "n2", "n3"]:
        failures.append("empty cited + direct should fail soft to all nodes")

    soft_bad = filter_nodes_by_cited(nodes, [9, 8], relevance="direct")
    if [n.node.node_id for n in soft_bad] != ["n1", "n2", "n3"]:
        failures.append("out-of-range cited + direct should fail soft to all nodes")

    none_sources = filter_nodes_by_cited(nodes, [], relevance="none")
    if none_sources != []:
        failures.append("empty cited + none should drop all sources")

    partial_sources = filter_nodes_by_cited(nodes, [], relevance="partial")
    if partial_sources != []:
        failures.append("empty cited + partial should drop all sources")

    parsed = AskSynthesis.model_validate(
        {"answer": "Use the seacock.", "cited": ["1", 2], "relevance": "DIRECT"}
    )
    if (
        parsed.cited != [1, 2]
        or "seacock" not in parsed.answer
        or parsed.relevance != "direct"
    ):
        failures.append(f"AskSynthesis coerce failed: {parsed!r}")

    partial = AskSynthesis.model_validate(
        {"answer": "Partial.", "cited": [], "relevance": "partial"}
    )
    if partial.relevance != "partial":
        failures.append(f"AskSynthesis partial failed: {partial!r}")

    if failures:
        for item in failures:
            print(f"FAIL — {item}")
        return 1
    print("OK — Ask citation helpers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
