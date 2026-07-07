from __future__ import annotations

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.schema import QueryBundle
from llama_index.core.prompts import PromptTemplate
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.retrievers import VectorIndexRetriever
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

_RETRY_PREFIX = get_ask_text("retry_prefix")

CONTENT_FILTER_MESSAGE = get_ask_text("content_filter_message")


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


def build_query_engine() -> RetrieverQueryEngine:
    """Build and return a LlamaIndex query engine backed by pgvector."""

    embed_model = AzureOpenAIEmbedding(
        model="text-embedding-3-small",
        deployment_name=settings.azure_openai_embedding_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )

    llm = AzureOpenAI(
        model="gpt-4o",
        deployment_name=settings.azure_openai_chat_deployment,
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )

    sync_url, async_url = postgres_connection_strings(settings.database_url)
    vector_store = PGVectorStore.from_params(
        connection_string=sync_url,
        async_connection_string=async_url,
        table_name="cattitude",
        embed_dim=1536,
    )
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_vector_store(
        vector_store,
        storage_context=storage_context,
        embed_model=embed_model,
    )

    retriever = VectorIndexRetriever(index=index, similarity_top_k=5)

    synthesizer = get_response_synthesizer(
        llm=llm,
        response_mode="compact",
        text_qa_template=TEXT_QA_PROMPT,
        refine_template=REFINE_PROMPT,
    )

    return RetrieverQueryEngine(retriever=retriever, response_synthesizer=synthesizer)


_query_engine: RetrieverQueryEngine | None = None


def get_query_engine() -> RetrieverQueryEngine:
    global _query_engine
    if _query_engine is None:
        _query_engine = build_query_engine()
    return _query_engine


class ContentFilterError(Exception):
    """Raised when Azure blocks the prompt after a retry."""


def _set_node_content(node: object, content: str) -> None:
    target = getattr(node, "node", node)
    if hasattr(target, "set_content"):
        target.set_content(content)
        return
    if hasattr(target, "text"):
        target.text = content
        return
    raise TypeError(f"Cannot set content on {type(node)!r}")


def _english_nodes(nodes: list) -> list:
    """Replace node text with English-only excerpts for synthesis and sources."""
    kept: list = []
    for node in nodes:
        raw = node.get_content() if hasattr(node, "get_content") else getattr(node, "text", "") or ""
        english = extract_english(str(raw)).strip()
        if not english:
            continue
        _set_node_content(node, english)
        kept.append(node)
    return kept or nodes


def run_query(question: str):
    """Run RAG query with marine framing and one content-filter retry."""
    engine = get_query_engine()
    question = question.strip()
    nodes = engine.retrieve(QueryBundle(query_str=question))
    nodes = _english_nodes(nodes)

    attempts = (
        prepare_manual_query(question),
        _RETRY_PREFIX + question,
    )
    last_error: BaseException | None = None
    for prepared in attempts:
        try:
            return engine.synthesize(QueryBundle(query_str=prepared), nodes)
        except BadRequestError as exc:
            if not _is_content_filter_error(exc):
                raise
            last_error = exc
    raise ContentFilterError(CONTENT_FILTER_MESSAGE) from last_error
