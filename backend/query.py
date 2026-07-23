from __future__ import annotations

import logging
from typing import Sequence

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

_QUERY_PREFIX = get_ask_text("query_prefix")

CONTENT_FILTER_MESSAGE = get_ask_text("content_filter_message")

NO_EXCERPTS_MESSAGE = (
    "I couldn't find relevant excerpts in this vessel's equipment manuals "
    "for that question. Try rephrasing, or ask about installed systems that "
    "have manuals linked."
)

# Keep Ask synthesis under Railway/proxy gateway timeouts (~60s).
_SIMILARITY_TOP_K = 3
_MAX_NODE_CHARS = 1200


class AskSynthesis(BaseModel):
    """Structured Ask answer with 1-based cited chunk IDs from labeled context."""

    answer: str = Field(..., description="Guest-facing English answer; no citation markers")
    cited: list[int] = Field(
        default_factory=list,
        description="1-based chunk IDs from context that were used for the answer",
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


def prepare_manual_query(question: str) -> str:
    q = question.strip()
    if q.startswith("["):
        return q
    return _QUERY_PREFIX + q


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
) -> list:
    """Return nodes cited by 1-based IDs; fail soft to all nodes if none valid."""
    node_list = list(nodes)
    ids = normalize_cited_ids(cited, len(node_list))
    if not ids:
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
    return [node_list[i - 1] for i in ids]


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


def run_query(question: str, *, manual_ids: list[str]):
    """Run RAG query scoped to vessel inventory manuals.

    ``manual_ids`` must be non-empty (caller fail-closes empty allow-lists).
    Never searches the global corpus.

    Synthesis returns structured ``AskSynthesis`` (answer + cited chunk IDs).
    Returned ``source_nodes`` are filtered to cited chunks when the model
    provides valid IDs; otherwise all retrieved nodes are kept (fail soft).
    """
    if not manual_ids:
        raise ValueError("manual_ids must be non-empty for Ask retrieve")

    # Ensure engine (and LLM) are warmed; retrieve uses shared index.
    get_query_engine()
    index = get_vector_index()
    question = question.strip()
    retriever = VectorIndexRetriever(
        index=index,
        similarity_top_k=_SIMILARITY_TOP_K,
        filters=_manual_id_filters(manual_ids),
    )
    nodes = retriever.retrieve(QueryBundle(query_str=question))
    nodes = _english_nodes(nodes)
    if not nodes:
        return Response(response=NO_EXCERPTS_MESSAGE, source_nodes=[])

    prepared = prepare_manual_query(question)
    context_str = format_labeled_context(nodes)
    llm = get_ask_llm()
    try:
        synthesis = llm.structured_predict(
            AskSynthesis,
            TEXT_QA_PROMPT,
            context_str=context_str,
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
    filtered = filter_nodes_by_cited(nodes, synthesis.cited)
    return Response(
        response=answer,
        source_nodes=filtered,
        metadata={
            "cited": normalize_cited_ids(synthesis.cited, len(nodes)),
            "retrieved_count": len(nodes),
            "source_count": len(filtered),
        },
    )
