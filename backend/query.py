from __future__ import annotations

import logging
import re
from typing import Literal, Sequence

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.base.response.schema import Response
from llama_index.core.schema import NodeWithScore, QueryBundle
from llama_index.core.prompts import PromptTemplate
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.vector_stores import FilterOperator, MetadataFilter, MetadataFilters
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.vector_stores.postgres import PGVectorStore
from openai import BadRequestError
from pydantic import BaseModel, Field, field_validator

from config import settings
from db import postgres_connection_strings
from english_text import extract_english
from prompts.ask.registry import get_ask_text

logger = logging.getLogger(__name__)

_MARINE_CONTEXT = get_ask_text("marine_context")

TEXT_QA_PROMPT = PromptTemplate(_MARINE_CONTEXT + get_ask_text("text_qa"))

REFINE_PROMPT = PromptTemplate(_MARINE_CONTEXT + get_ask_text("refine"))

CONDENSE_PROMPT = PromptTemplate(get_ask_text("condense"))

_QUERY_PREFIX = get_ask_text("query_prefix")

CONTENT_FILTER_MESSAGE = get_ask_text("content_filter_message")

NO_EXCERPTS_MESSAGE = (
    "I couldn't find relevant excerpts in this vessel's equipment manuals "
    "for that question. Try rephrasing, or ask about installed systems that "
    "have manuals linked."
)

# Keep Ask synthesis under Railway/proxy gateway timeouts (~60s).
_SIMILARITY_TOP_K = 3
_SIMILARITY_TOP_K_TROUBLE = 4
_MAX_CONTEXT_NODES = 6
_MAX_NODE_CHARS = 1200
_MAX_HISTORY_MESSAGES = 8
_ALLOWED_HISTORY_ROLES = frozenset({"user", "assistant"})
_ASK_RELEVANCE = frozenset({"direct", "partial", "none"})

# Heuristic: guest is diagnosing a fault / abnormal behaviour.
_TROUBLESHOOT_RE = re.compile(
    r"\b("
    r"troubleshoot(?:ing)?|problem|issue|fault|error|alarm|warning|"
    r"not\s+work(?:ing)?|won'?t|will\s+not|doesn'?t|didn'?t|can'?t|"
    r"fail(?:ed|ing|ure)?|broken|leak(?:ing|s)?|overheat(?:ing|s)?|"
    r"smoke|smell|noise|vibration|intermittent|symptom|diagnos|"
    r"why\s+is|how\s+(?:do|can)\s+i\s+fix|what(?:'?s|\s+is)\s+wrong"
    r")\b",
    re.I,
)
_TROUBLESHOOT_BOOSTER = (
    "troubleshooting FAQ fault causes symptoms diagnostics "
    "alarm warning check procedure"
)

class AskSynthesis(BaseModel):
    """Structured Ask answer with citations and retrieval-fit relevance."""

    answer: str = Field(..., description="Guest-facing English answer; no citation markers")
    cited: list[int] = Field(
        default_factory=list,
        description="1-based chunk IDs that support manual-backed claims only",
    )
    relevance: Literal["direct", "partial", "none"] = Field(
        default="direct",
        description="How well retrieved context answers the question",
    )

    @field_validator("cited", mode="before")
    @classmethod
    def _coerce_cited(cls, value: object) -> list[int]:
        if value is None:
            return []
        if not isinstance(value, (list, tuple)):
            return []
        out: list[int] = []
        for item in value:
            try:
                out.append(int(item))
            except (TypeError, ValueError):
                continue
        return out

    @field_validator("relevance", mode="before")
    @classmethod
    def _coerce_relevance(cls, value: object) -> str:
        if value is None:
            return "direct"
        normalized = str(value).strip().lower()
        if normalized in _ASK_RELEVANCE:
            return normalized
        return "direct"


def prepare_manual_query(question: str) -> str:
    q = question.strip()
    if q.startswith("["):
        return q
    return _QUERY_PREFIX + q


def normalize_conversation_history(
    history: Sequence[dict] | None,
    question: str,
    *,
    max_messages: int = _MAX_HISTORY_MESSAGES,
) -> list[dict[str, str]]:
    """Validate prior turns; drop trailing duplicate of the current question."""
    if not history:
        return []

    cleaned: list[dict[str, str]] = []
    for item in history:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or "").strip().lower()
        content = str(item.get("content") or "").strip()
        if role not in _ALLOWED_HISTORY_ROLES or not content:
            continue
        cleaned.append({"role": role, "content": content})

    question_norm = question.strip()
    if (
        cleaned
        and cleaned[-1]["role"] == "user"
        and cleaned[-1]["content"] == question_norm
    ):
        cleaned = cleaned[:-1]

    if max_messages > 0 and len(cleaned) > max_messages:
        cleaned = cleaned[-max_messages:]
    return cleaned


def format_conversation_str(history: Sequence[dict[str, str]]) -> str:
    """Format prior turns for condense/synthesis prompts."""
    if not history:
        return "(none)"
    lines: list[str] = []
    for turn in history:
        label = "Guest" if turn["role"] == "user" else "Assistant"
        lines.append(f"{label}: {turn['content']}")
    return "\n".join(lines)


def condense_question(
    question: str,
    history: Sequence[dict[str, str]],
    *,
    llm: AzureOpenAI | None = None,
) -> str:
    """Rewrite a follow-up into a standalone retrieval query.

    Empty history returns ``question`` unchanged (no LLM call). On content-filter
    or empty model output, falls back to the raw question.
    """
    q = question.strip()
    if not history:
        return q

    conversation_str = format_conversation_str(history)
    ask_llm = llm if llm is not None else get_ask_llm()
    try:
        prompt = CONDENSE_PROMPT.format(
            conversation_str=conversation_str,
            question=q,
        )
        response = ask_llm.complete(prompt)
        condensed = str(getattr(response, "text", None) or response).strip()
    except BadRequestError as exc:
        if _is_content_filter_error(exc):
            logger.info(
                "Ask condense hit content filter; falling back to raw question"
            )
            return q
        raise
    except Exception:
        logger.exception("Ask condense failed; falling back to raw question")
        return q

    if not condensed:
        logger.info("Ask condense returned empty; falling back to raw question")
        return q
    return condensed


def _is_content_filter_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    if "content_filter" in msg or "content management policy" in msg:
        return True
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        err = body.get("error", {})
        if err.get("code") == "content_filter":
            return True
    return False


def _build_embed_model() -> AzureOpenAIEmbedding:
    return AzureOpenAIEmbedding(
        model="text-embedding-3-small",
        deployment_name=settings.azure_openai_embedding_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )


def _build_llm() -> AzureOpenAI:
    return AzureOpenAI(
        model="gpt-4o",
        deployment_name=settings.azure_openai_chat_deployment,
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


def build_query_engine() -> RetrieverQueryEngine:
    """Build and return a LlamaIndex query engine backed by pgvector.

    Unfiltered engine kept for synthesizer/LLM reuse; Ask retrieve always uses
    a per-request filtered retriever via ``run_query(..., manual_ids=...)``.
    Synthesis for Ask uses ``structured_predict(AskSynthesis, ...)`` in
    ``run_query`` rather than free-form ``engine.synthesize``.
    """
    embed_model = _build_embed_model()
    llm = _build_llm()
    index = _build_index(embed_model)
    retriever = VectorIndexRetriever(index=index, similarity_top_k=_SIMILARITY_TOP_K)
    synthesizer = get_response_synthesizer(
        llm=llm,
        response_mode="compact",
        text_qa_template=TEXT_QA_PROMPT,
        refine_template=REFINE_PROMPT,
    )
    return RetrieverQueryEngine(retriever=retriever, response_synthesizer=synthesizer)


_query_engine: RetrieverQueryEngine | None = None
_vector_index: VectorStoreIndex | None = None


def get_query_engine() -> RetrieverQueryEngine:
    global _query_engine
    if _query_engine is None:
        _query_engine = build_query_engine()
    return _query_engine


def get_ask_llm() -> AzureOpenAI:
    """LLM used for Ask structured synthesis (from the cached query engine)."""
    engine = get_query_engine()
    synthesizer = getattr(engine, "_response_synthesizer", None)
    llm = getattr(synthesizer, "_llm", None) if synthesizer is not None else None
    if isinstance(llm, AzureOpenAI):
        return llm
    return _build_llm()


def get_vector_index() -> VectorStoreIndex:
    """Shared pgvector index for per-request filtered Ask retrieve."""
    global _vector_index, _query_engine
    if _vector_index is not None:
        return _vector_index
    # Prefer index already built with the cached engine.
    engine = get_query_engine()
    retriever = getattr(engine, "retriever", None)
    index = getattr(retriever, "_index", None) or getattr(retriever, "index", None)
    if isinstance(index, VectorStoreIndex):
        _vector_index = index
        return _vector_index
    _vector_index = _build_index(_build_embed_model())
    return _vector_index


class ContentFilterError(Exception):
    """Raised when Azure blocks the prompt."""


def _set_node_content(node: object, content: str) -> None:
    target = getattr(node, "node", node)
    if hasattr(target, "set_content"):
        target.set_content(content)
        return
    if hasattr(target, "text"):
        target.text = content
        return
    raise TypeError(f"Cannot set content on {type(node)!r}")


def _truncate_node_text(text: str, limit: int = _MAX_NODE_CHARS) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip()
    return f"{cut or text[:limit]}…"


def _english_nodes(nodes: list) -> list:
    """Replace node text with trimmed English excerpts for synthesis and sources."""
    kept: list = []
    for node in nodes:
        raw = node.get_content() if hasattr(node, "get_content") else getattr(node, "text", "") or ""
        english = extract_english(str(raw)).strip()
        if not english:
            continue
        _set_node_content(node, _truncate_node_text(english))
        kept.append(node)
    return kept


def _node_text(node: object) -> str:
    if hasattr(node, "get_content"):
        return str(node.get_content() or "")
    return str(getattr(node, "text", None) or "")


def format_labeled_context(nodes: Sequence[object]) -> str:
    """Build prompt context with stable 1-based chunk labels [1]..[N]."""
    parts: list[str] = []
    for index, node in enumerate(nodes, start=1):
        parts.append(f"[{index}]\n{_node_text(node).strip()}")
    return "\n\n".join(parts)


def normalize_cited_ids(cited: Sequence[int], node_count: int) -> list[int]:
    """Keep unique in-range 1-based cite IDs in first-seen order."""
    if node_count <= 0:
        return []
    seen: set[int] = set()
    ordered: list[int] = []
    for raw in cited:
        try:
            cite_id = int(raw)
        except (TypeError, ValueError):
            continue
        if cite_id < 1 or cite_id > node_count or cite_id in seen:
            continue
        seen.add(cite_id)
        ordered.append(cite_id)
    return ordered


def filter_nodes_by_cited(
    nodes: Sequence[NodeWithScore] | Sequence[object],
    cited: Sequence[int],
    *,
    relevance: str | None = None,
) -> list:
    """Return nodes cited by 1-based IDs.

    Empty cited + relevance ``none``/``partial`` ⇒ no guest sources (general
    guidance or no fit). Empty cited + ``direct`` still fails soft to all
    retrieved nodes when the model forgets to cite.
    """
    node_list = list(nodes)
    ids = normalize_cited_ids(cited, len(node_list))
    if ids:
        return [node_list[i - 1] for i in ids]

    rel = (relevance or "").strip().lower()
    if rel in {"none", "partial"}:
        if cited:
            logger.warning(
                "Ask cited IDs %s out of range for %s chunks; dropping sources "
                "for relevance=%s",
                list(cited),
                len(node_list),
                rel,
            )
        return []

    if cited:
        logger.warning(
            "Ask cited IDs %s out of range for %s chunks; keeping all retrieved",
            list(cited),
            len(node_list),
        )
    else:
        logger.info(
            "Ask returned empty cited list; keeping all %s retrieved chunks",
            len(node_list),
        )
    return node_list


def is_troubleshooting_query(*texts: str) -> bool:
    """True when any text looks like fault / symptom troubleshooting."""
    for text in texts:
        if text and _TROUBLESHOOT_RE.search(text):
            return True
    return False


def build_retrieve_queries(
    *,
    question: str,
    retrieve_query: str,
    troubleshooting: bool,
) -> list[str]:
    """Ordered unique retrieval strings for one Ask turn."""
    primary = (retrieve_query or question).strip()
    raw = question.strip()
    queries: list[str] = []
    for candidate in (primary, raw):
        if candidate and candidate not in queries:
            queries.append(candidate)
    if troubleshooting and primary:
        booster = f"{primary} {_TROUBLESHOOT_BOOSTER}".strip()
        if booster not in queries:
            queries.append(booster)
    return queries or [question.strip()]


def _node_identity(node: object) -> str:
    node_id = getattr(node, "node_id", None)
    if node_id:
        return str(node_id)
    inner = getattr(node, "node", None)
    if inner is not None:
        inner_id = getattr(inner, "node_id", None) or getattr(inner, "id_", None)
        if inner_id:
            return str(inner_id)
    return str(id(node))


def merge_retrieved_nodes(
    batches: Sequence[Sequence[object]],
    *,
    limit: int,
) -> list:
    """Dedupe retrieved nodes across query batches, preserving first-seen order."""
    seen: set[str] = set()
    merged: list = []
    for batch in batches:
        for node in batch:
            key = _node_identity(node)
            if key in seen:
                continue
            seen.add(key)
            merged.append(node)
            if limit > 0 and len(merged) >= limit:
                return merged
    return merged


def _manual_id_filters(manual_ids: list[str]) -> MetadataFilters:
    return MetadataFilters(
        filters=[
            MetadataFilter(
                key="manual_id", value=manual_id, operator=FilterOperator.EQ
            )
            for manual_id in manual_ids
        ],
        condition="or",
    )


def _retrieve_for_queries(
    index: VectorStoreIndex,
    *,
    manual_ids: list[str],
    queries: Sequence[str],
    top_k: int,
) -> list:
    filters = _manual_id_filters(manual_ids)
    batches: list[list] = []
    for query in queries:
        retriever = VectorIndexRetriever(
            index=index,
            similarity_top_k=top_k,
            filters=filters,
        )
        batches.append(list(retriever.retrieve(QueryBundle(query_str=query))))
    limit = _MAX_CONTEXT_NODES if len(queries) > 1 else _SIMILARITY_TOP_K
    return merge_retrieved_nodes(batches, limit=limit)


def _node_manual_id(node: object) -> str | None:
    meta = getattr(node, "metadata", None) or {}
    inner = getattr(node, "node", None)
    if inner is not None:
        meta = getattr(inner, "metadata", None) or meta
    manual_id = meta.get("manual_id")
    return str(manual_id) if manual_id else None


def run_query(
    question: str,
    *,
    manual_ids: list[str],
    conversation_history: Sequence[dict] | None = None,
):
    """Run RAG query scoped to vessel inventory manuals.

    ``manual_ids`` must be non-empty (caller fail-closes empty allow-lists).
    Never searches the global corpus.

    When ``conversation_history`` has prior turns, the current question is
    condensed into a standalone retrieval query; synthesis still sees the
    guest question plus a short conversation transcript.

    Troubleshooting-style questions retrieve with an extra FAQ/fault booster
    query and may include the raw guest question when condensation changed it.

    Synthesis returns structured ``AskSynthesis`` (answer, cited chunk IDs,
    relevance tier). Returned ``source_nodes`` are filtered to cited chunks
    when the model provides valid IDs; empty cites with ``none``/``partial``
    yield no guest sources.
    """
    if not manual_ids:
        raise ValueError("manual_ids must be non-empty for Ask retrieve")

    # Ensure engine (and LLM) are warmed; retrieve uses shared index.
    get_query_engine()
    index = get_vector_index()
    question = question.strip()
    prior = normalize_conversation_history(conversation_history, question)
    llm = get_ask_llm()
    retrieve_query = condense_question(question, prior, llm=llm)
    if prior and retrieve_query != question:
        logger.info(
            "Ask condensed follow-up for retrieve: %r -> %r",
            question,
            retrieve_query,
        )

    troubleshooting = is_troubleshooting_query(question, retrieve_query)
    retrieve_queries = build_retrieve_queries(
        question=question,
        retrieve_query=retrieve_query,
        troubleshooting=troubleshooting,
    )
    top_k = _SIMILARITY_TOP_K_TROUBLE if troubleshooting else _SIMILARITY_TOP_K
    if troubleshooting:
        logger.info(
            "Ask troubleshooting retrieve queries=%s top_k=%s",
            retrieve_queries,
            top_k,
        )

    nodes = _retrieve_for_queries(
        index,
        manual_ids=manual_ids,
        queries=retrieve_queries,
        top_k=top_k,
    )
    nodes = _english_nodes(nodes)
    prepared = prepare_manual_query(question)
    if not nodes:
        return Response(
            response=NO_EXCERPTS_MESSAGE,
            source_nodes=[],
            metadata={
                "cited": [],
                "relevance": "none",
                "retrieved_count": 0,
                "source_count": 0,
                "retrieve_query": retrieve_query,
                "retrieve_queries": retrieve_queries,
                "troubleshooting_retrieve": troubleshooting,
                "prepared_query": prepared,
                "retrieved_context": "",
                "history_turns": len(prior),
                "no_excerpts": True,
            },
        )

    context_str = format_labeled_context(nodes)
    conversation_str = format_conversation_str(prior)
    try:
        synthesis = llm.structured_predict(
            AskSynthesis,
            TEXT_QA_PROMPT,
            context_str=context_str,
            conversation_str=conversation_str,
            query_str=prepared,
        )
    except BadRequestError as exc:
        if _is_content_filter_error(exc):
            raise ContentFilterError(CONTENT_FILTER_MESSAGE) from exc
        raise

    if not isinstance(synthesis, AskSynthesis):
        # Defensive: some program paths may return dict-like payloads.
        synthesis = AskSynthesis.model_validate(synthesis)

    answer = (synthesis.answer or "").strip() or "Empty Response"
    if synthesis.relevance == "none" and not normalize_cited_ids(
        synthesis.cited, len(nodes)
    ):
        # Prefer a clear short decline when the model marks no fit and cites nothing.
        if len(answer) < 40 or "couldn't find" in answer.lower():
            answer = NO_EXCERPTS_MESSAGE

    filtered = filter_nodes_by_cited(
        nodes, synthesis.cited, relevance=synthesis.relevance
    )
    retrieved_manual_ids: list[str] = []
    for node in nodes:
        manual_id = _node_manual_id(node)
        if manual_id and manual_id not in retrieved_manual_ids:
            retrieved_manual_ids.append(manual_id)
    return Response(
        response=answer,
        source_nodes=filtered,
        metadata={
            "cited": normalize_cited_ids(synthesis.cited, len(nodes)),
            "relevance": synthesis.relevance,
            "retrieved_count": len(nodes),
            "source_count": len(filtered),
            "retrieve_query": retrieve_query,
            "retrieve_queries": retrieve_queries,
            "troubleshooting_retrieve": troubleshooting,
            "prepared_query": prepared,
            "retrieved_context": context_str,
            "retrieved_manual_ids": retrieved_manual_ids,
            "history_turns": len(prior),
            "no_excerpts": False,
        },
    )
