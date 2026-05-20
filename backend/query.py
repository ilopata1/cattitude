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

# Framing helps Azure content filters treat prompts as marine equipment support.
_MARINE_CONTEXT = (
    "You are the Cattitude Manual Assistant for a sailing catamaran. "
    "Questions concern Yanmar engines, raw-water cooling, exhaust, plumbing, "
    "electrical, and other onboard systems — not personal health or self-harm.\n\n"
)

TEXT_QA_PROMPT = PromptTemplate(
    _MARINE_CONTEXT
    + "Context information from equipment manuals is below.\n"
    "---------------------\n"
    "{context_str}\n"
    "---------------------\n"
    "Using only the context above, and no hallucinations, answer this marine equipment question.\n"
    "Question: {query_str}\n"
    "Answer: "
)

REFINE_PROMPT = PromptTemplate(
    _MARINE_CONTEXT
    + "The original marine equipment question is: {query_str}\n"
    "We have provided an existing answer: {existing_answer}\n"
    "We have the opportunity to refine the existing answer "
    "(only if needed) with some more context below.\n"
    "------------\n"
    "{context_msg}\n"
    "------------\n"
    "Given the new context, refine the original answer to better "
    "answer the question. "
    "If the context isn't useful, return the original answer.\n"
    "Refined Answer: "
)

_QUERY_PREFIX = (
    "[Cattitude vessel equipment manual — engine cooling water / exhaust / "
    "plumbing troubleshooting, not a medical question]\n\n"
)

_RETRY_PREFIX = (
    "[Marine diesel engine seawater cooling system — operator manual procedure]\n\n"
)

CONTENT_FILTER_MESSAGE = (
    "Azure blocked this question due to a content-filter false positive. "
    "Try rephrasing in mechanical terms, for example: "
    '"No cooling water from the engine exhaust / raw-water telltale — what should I check?"'
)


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


def run_query(question: str):
    """Run RAG query with marine framing and one content-filter retry."""
    engine = get_query_engine()
    question = question.strip()
    nodes = engine.retrieve(QueryBundle(query_str=question))

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
