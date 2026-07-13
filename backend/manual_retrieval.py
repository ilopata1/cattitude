"""Retrieve manual excerpts from pgvector for equipment fragment drafting."""

from __future__ import annotations

from typing import Any

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.schema import QueryBundle
from llama_index.core.vector_stores import FilterOperator, MetadataFilter, MetadataFilters
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding

from config import settings
from db import postgres_connection_strings
from english_text import extract_english
from llama_index.vector_stores.postgres import PGVectorStore


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


def retrieve_manual_excerpts(
    manual_ids: list[str],
    queries: list[str],
    *,
    top_k: int = 4,
) -> list[dict[str, Any]]:
    """Return deduplicated excerpt dicts grounded in the given manual work IDs."""
    if not manual_ids or not queries:
        return []

    embed_model = _build_embed_model()
    index = _build_index(embed_model)
    filters = MetadataFilters(
        filters=[
            MetadataFilter(key="manual_id", value=manual_id, operator=FilterOperator.EQ)
            for manual_id in manual_ids
        ],
        condition="or",
    )
    retriever = VectorIndexRetriever(
        index=index,
        similarity_top_k=top_k,
        filters=filters,
    )

    seen: set[str] = set()
    excerpts: list[dict[str, Any]] = []
    for query in queries:
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
            metadata = getattr(node, "metadata", None) or {}
            excerpts.append(
                {
                    "manual_id": str(metadata.get("manual_id", "")),
                    "source_file": metadata.get("source_file"),
                    "page_start": metadata.get("page_start"),
                    "page_end": metadata.get("page_end"),
                    "query": query,
                    "text": english[:1200],
                }
            )
    return excerpts
