from __future__ import annotations

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.llms.azure_openai import AzureOpenAI
from llama_index.vector_stores.postgres import PGVectorStore

from config import settings


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

    vector_store = PGVectorStore.from_params(
        connection_string=settings.database_url,
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
    )

    return RetrieverQueryEngine(retriever=retriever, response_synthesizer=synthesizer)


_query_engine: RetrieverQueryEngine | None = None


def get_query_engine() -> RetrieverQueryEngine:
    global _query_engine
    if _query_engine is None:
        _query_engine = build_query_engine()
    return _query_engine
