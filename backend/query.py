from __future__ import annotations

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.base.response.schema import Response
from llama_index.core.schema import QueryBundle
from llama_index.core.prompts import PromptTemplate
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.vector_stores import FilterOperator, MetadataFilter, MetadataFilters
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.vector_stores.postgres import PGVectorStore
from openai import BadRequestError

from config import settings
from db import postgres_connection_strings
from english_text import extract_english
from prompts.ask.registry import get_ask_text

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

    Unfiltered engine kept for synthesizer reuse; Ask retrieve always uses
    a per-request filtered retriever via ``run_query(..., manual_ids=...)``.
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
    """
    if not manual_ids:
        raise ValueError("manual_ids must be non-empty for Ask retrieve")

    engine = get_query_engine()
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
    try:
        return engine.synthesize(QueryBundle(query_str=prepared), nodes)
    except BadRequestError as exc:
        if _is_content_filter_error(exc):
            raise ContentFilterError(CONTENT_FILTER_MESSAGE) from exc
        raise
