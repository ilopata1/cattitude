"""Retrieve manual excerpts from pgvector for equipment fragment drafting."""

from __future__ import annotations

import math
import re
from typing import Any

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.schema import QueryBundle
from llama_index.core.vector_stores import FilterOperator, MetadataFilter, MetadataFilters
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.vector_stores.postgres import PGVectorStore
from sqlalchemy import create_engine, text

from config import settings
from db import postgres_connection_strings
from english_text import extract_english

BASE_TOP_K = 4
MAX_TOP_K = 16
# Aim to give larger manuals enough per-query depth that ~60% of chunks
# can be candidates before dedupe.
CHUNK_COVERAGE_TARGET = 0.60
COVERAGE_LOW_THRESHOLD = 0.25

_NUMBERED_HEADING = re.compile(r"^\d+(?:\.\d+)*\.?\s+\S")
_TOC_DOTS = re.compile(r"\.{3,}")
_PAGE_HEADER = re.compile(
    r"User and Installation Manual\s+\d+\s*$",
    re.I,
)

# Excerpt body cap — prefer cutting at a line boundary so headings are not
# truncated mid-word (e.g. "6.2 HOW TO SE" from a 1200-char hard clip).
EXCERPT_CHAR_LIMIT = 1200


def clip_excerpt_text(text: str, limit: int = EXCERPT_CHAR_LIMIT) -> str:
    """Truncate excerpt text without splitting mid-line when possible."""
    raw = text or ""
    if len(raw) <= limit:
        return raw
    cut = raw[:limit]
    nl = cut.rfind("\n")
    if nl >= limit // 2:
        return cut[:nl].rstrip()
    sp = cut.rfind(" ")
    if sp >= limit // 2:
        return cut[:sp].rstrip()
    return cut



def _build_embed_model() -> AzureOpenAIEmbedding:
    return AzureOpenAIEmbedding(
        model="text-embedding-3-small",
        deployment_name=settings.azure_openai_embedding_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )


def _build_index(embed_model: AzureOpenAIEmbedding) -> VectorStoreIndex:
    sync_url, async_url = postgres_connection_strings(settings.database_url)
    vector_store = PGVectorStore.from_params(
        connection_string=sync_url,
        async_connection_string=async_url,
        table_name="cattitude",
        embed_dim=1536,
    )
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return VectorStoreIndex.from_vector_store(
        vector_store,
        storage_context=storage_context,
        embed_model=embed_model,
    )


def scaled_top_k(chunk_count: int, n_queries: int) -> int:
    """Scale per-query top-k with manual size (chunk inventory).

    Query count must not dilute depth: extra retrieval queries for large manuals
    would otherwise leave top-k stuck at BASE_TOP_K.
    """
    if chunk_count <= 0:
        return BASE_TOP_K
    if chunk_count <= 40:
        return BASE_TOP_K
    # Grow with chunks; keep a floor so added queries don't shrink per-query k.
    by_chunks = int(math.ceil(chunk_count / 9))
    target = max(1, int(math.ceil(chunk_count * CHUNK_COVERAGE_TARGET)))
    by_target = int(math.ceil(target / max(min(n_queries, 6), 1)))
    per_query = max(6, by_chunks, by_target)
    return max(BASE_TOP_K, min(MAX_TOP_K, per_query))


def load_manual_chunk_inventory(manual_ids: list[str]) -> list[dict[str, Any]]:
    """Load all indexed chunks for the given manual work IDs (inventory)."""
    if not manual_ids:
        return []
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT text,
                       metadata_->>'manual_id' AS manual_id,
                       metadata_->>'source_file' AS source_file,
                       metadata_->>'page_start' AS page_start,
                       metadata_->>'page_end' AS page_end
                FROM data_cattitude
                WHERE metadata_->>'manual_id' = ANY(:ids)
                ORDER BY metadata_->>'manual_id',
                         (metadata_->>'page_start')::int NULLS LAST,
                         id
                """
            ),
            {"ids": list(manual_ids)},
        ).fetchall()
    inventory: list[dict[str, Any]] = []
    for raw, mid, source_file, page_start, page_end in rows:
        english = extract_english(str(raw or "")).strip()
        if not english:
            continue
        inventory.append(
            {
                "manual_id": str(mid or ""),
                "source_file": source_file,
                "page_start": int(page_start) if page_start not in (None, "") else None,
                "page_end": int(page_end) if page_end not in (None, "") else None,
                "text": english,
                "headings": extract_headings_from_text(english),
            }
        )
    return inventory


def _is_junk_heading_line(line: str) -> bool:
    cleaned = line.strip()
    if not cleaned or len(cleaned) > 120:
        return True
    if cleaned.startswith("....") or _TOC_DOTS.search(cleaned):
        return True
    if re.fullmatch(r"[.\s\d]+", cleaned):
        return True
    if _PAGE_HEADER.search(cleaned):
        return True
    if re.match(r"^\d+\s+Mass Combi", cleaned, re.I):
        return True
    return False


def extract_headings_from_text(text: str) -> list[str]:
    """Collect section-like headings from a chunk (prefer numbered)."""
    found: list[str] = []
    seen: set[str] = set()
    for line in text.splitlines():
        cleaned = line.strip().lstrip("#").strip()
        if _is_junk_heading_line(cleaned):
            continue
        if not (
            _NUMBERED_HEADING.match(cleaned)
            or re.match(r"^(Chapter|Section|Appendix)\b", cleaned, re.I)
            or cleaned
            in {
                "TABLE OF CONTENTS",
                "OVERVIEW MASS COMBI PRO",
                "TECHNICAL DATA",
            }
            or (
                cleaned.isupper()
                and 2 <= len(cleaned.split()) <= 8
                and not cleaned.startswith("AC ")
            )
        ):
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        found.append(cleaned[:200])
    return found


def guess_source_heading(text: str) -> str | None:
    """Heading guess that skips TOC crumbs and joins truncated first lines."""
    lines = [
        ln.strip().lstrip("#").strip()
        for ln in text.splitlines()
        if ln.strip()
    ]
    if not lines:
        return None
    # Prefer a real numbered heading in the chunk.
    for line in lines:
        if _is_junk_heading_line(line):
            continue
        if _NUMBERED_HEADING.match(line):
            return line[:200]
    for i, line in enumerate(lines):
        if _is_junk_heading_line(line):
            continue
        # Truncated table/phrase openers like "Restart when" + next line.
        words = line.split()
        if (
            len(words) <= 3
            and not line.endswith((".", ":", ";", ")"))
            and i + 1 < len(lines)
        ):
            nxt = lines[i + 1]
            if not _is_junk_heading_line(nxt):
                joined = f"{line} {nxt}".strip()
                return joined[:200]
        return line[:200]
    return None


def inventory_heading_list(inventory: list[dict[str, Any]]) -> list[str]:
    """Deduped heading list for the whole manual inventory."""
    seen: set[str] = set()
    out: list[str] = []
    for chunk in inventory:
        for heading in chunk.get("headings") or []:
            key = str(heading).lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(str(heading))
    return out


def compute_heading_coverage(
    inventory_headings: list[str],
    excerpts: list[dict[str, Any]],
) -> dict[str, Any]:
    """Fraction of inventory headings represented in routed excerpt text."""
    corpus = "\n".join(
        str(e.get("text") or "") for e in excerpts if isinstance(e, dict)
    ).lower()
    guesses = {
        str(e.get("source_heading_guess") or "").lower()
        for e in excerpts
        if isinstance(e, dict)
    }
    covered: list[str] = []
    missing: list[str] = []
    for heading in inventory_headings:
        h = heading.lower()
        # Require meaningful overlap (avoid matching lone digits).
        token = h[:40]
        hit = bool(token) and (token in corpus or any(token in g for g in guesses if g))
        if hit:
            covered.append(heading)
        else:
            missing.append(heading)
    total = len(inventory_headings)
    fraction = (len(covered) / total) if total else 1.0
    return {
        "heading_count": total,
        "headings_covered_count": len(covered),
        "heading_coverage_fraction": round(fraction, 4),
        "coverage_low_threshold": COVERAGE_LOW_THRESHOLD,
        "coverage_low": bool(total and fraction < COVERAGE_LOW_THRESHOLD),
        "headings_all": inventory_headings,
        "headings_covered": covered,
        "headings_missing": missing,
    }


def retrieve_manual_excerpts(
    manual_ids: list[str],
    queries: list[str],
    *,
    top_k: int | None = None,
) -> list[dict[str, Any]]:
    """Return deduplicated excerpt dicts grounded in the given manual work IDs."""
    excerpts, _diagnostics, _coverage = retrieve_manual_excerpts_with_diagnostics(
        manual_ids, queries, top_k=top_k
    )
    return excerpts


# Prefer fill-in retrieval for these chapter prefixes / topic tokens when missing.
_PRIORITY_HEADING_PREFIXES = (
    "3.",
    "4.",
    "5.",
    "6.",
    "7.",
)

_PRIORITY_HEADING_TOKENS = (
    "climate",
    "hvac",
    "aircon",
    "air conditioner",
    "temperature",
)


def _priority_missing_headings(missing: list[str], *, limit: int = 12) -> list[str]:
    ranked: list[str] = []
    seen: set[str] = set()
    for heading in missing:
        h = heading or ""
        hl = h.lower()
        priority = any(h.startswith(p) for p in _PRIORITY_HEADING_PREFIXES) or any(
            tok in hl for tok in _PRIORITY_HEADING_TOKENS
        )
        if priority and h not in seen:
            ranked.append(h)
            seen.add(h)
        if len(ranked) >= limit:
            break
    # Also force exact Climate headings to the front when present.
    forced = [
        h
        for h in missing
        if re.search(r"(?i)\bCLIMATE\s+(PAGE|CONTROLS)\b", h or "")
    ]
    out: list[str] = []
    for h in forced + ranked:
        if h not in out:
            out.append(h)
        if len(out) >= limit:
            break
    return out


def retrieve_manual_excerpts_with_diagnostics(
    manual_ids: list[str],
    queries: list[str],
    *,
    top_k: int | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    """Excerpts, per-query diagnostics, and heading-coverage metrics."""
    if not manual_ids or not queries:
        return [], [], {
            "chunk_count": 0,
            "heading_count": 0,
            "heading_coverage_fraction": 0.0,
            "coverage_low": False,
            "top_k_used": BASE_TOP_K,
            "headings_all": [],
            "headings_covered": [],
            "headings_missing": [],
        }

    inventory = load_manual_chunk_inventory(manual_ids)
    inventory_headings = inventory_heading_list(inventory)
    chunk_count = len(inventory)
    used_top_k = (
        top_k if top_k is not None else scaled_top_k(chunk_count, len(queries))
    )

    embed_model = _build_embed_model()
    index = _build_index(embed_model)
    filters = MetadataFilters(
        filters=[
            MetadataFilter(key="manual_id", value=manual_id, operator=FilterOperator.EQ)
            for manual_id in manual_ids
        ],
        condition="or",
    )

    seen: set[str] = set()
    excerpts: list[dict[str, Any]] = []
    query_diagnostics: list[dict[str, Any]] = []

    def _run_query(query: str, k: int, *, phase: str) -> int:
        retriever = VectorIndexRetriever(
            index=index,
            similarity_top_k=k,
            filters=filters,
        )
        hit_count = 0
        for node in retriever.retrieve(QueryBundle(query_str=query)):
            node_id = getattr(node, "node_id", None) or str(id(node))
            if node_id in seen:
                continue
            raw = (
                node.get_content()
                if hasattr(node, "get_content")
                else getattr(node, "text", "") or ""
            )
            english = extract_english(str(raw)).strip()
            if not english:
                continue
            seen.add(node_id)
            hit_count += 1
            metadata = getattr(node, "metadata", None) or {}
            score = getattr(node, "score", None)
            excerpts.append(
                {
                    "manual_id": str(metadata.get("manual_id", "")),
                    "source_file": metadata.get("source_file"),
                    "page_start": metadata.get("page_start"),
                    "page_end": metadata.get("page_end"),
                    "query": query,
                    "retrieval_phase": phase,
                    "retrieval_score": float(score) if score is not None else None,
                    "text": clip_excerpt_text(english),
                    "source_heading_guess": guess_source_heading(english),
                }
            )
        return hit_count

    for query in queries:
        hit_count = _run_query(query, used_top_k, phase="scaled_query")
        query_diagnostics.append(
            {
                "query": query,
                "unique_hits_added": hit_count,
                "matched": hit_count > 0,
                "top_k": used_top_k,
                "phase": "scaled_query",
            }
        )

    # Per-section coverage quota: chase priority headings still missing.
    coverage = compute_heading_coverage(inventory_headings, excerpts)
    fill_queries = _priority_missing_headings(coverage.get("headings_missing") or [])
    fill_hits_total = 0
    for heading in fill_queries:
        added = _run_query(heading, min(3, used_top_k), phase="heading_fill")
        fill_hits_total += added
        query_diagnostics.append(
            {
                "query": heading,
                "unique_hits_added": added,
                "matched": added > 0,
                "top_k": min(3, used_top_k),
                "phase": "heading_fill",
            }
        )

    coverage = compute_heading_coverage(inventory_headings, excerpts)
    coverage.update(
        {
            "chunk_count": chunk_count,
            "top_k_used": used_top_k,
            "heading_fill_queries": len(fill_queries),
            "heading_fill_hits": fill_hits_total,
            "top_k_scaling": {
                "base": BASE_TOP_K,
                "max": MAX_TOP_K,
                "chunk_coverage_target": CHUNK_COVERAGE_TARGET,
                "scaled": used_top_k != BASE_TOP_K or chunk_count > 40,
            },
        }
    )
    return excerpts, query_diagnostics, coverage
