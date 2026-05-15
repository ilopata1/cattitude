"""
Manual ingestion pipeline.
Usage: python ingest.py --file ../manuals/yanmar_4jh45_operators.pdf --manual-id yanmar_4jh45_operators
"""

from __future__ import annotations

import argparse
from pathlib import Path

from docling.document_converter import DocumentConverter
from llama_index.core import Document, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.vector_stores.postgres import PGVectorStore

from config import settings


def ingest_manual(
    file_path: Path,
    manual_id: str,
    equipment_tags: list[str] | None = None,
) -> None:
    """
    Parse a PDF with Docling, chunk it, embed it, and store in pgvector.

    Args:
        file_path: Path to the PDF manual
        manual_id: Stable identifier e.g. "yanmar_4jh45_operators"
        equipment_tags: Optional list e.g. ["yanmar", "4jh45", "engine"]
    """
    print(f"Converting {file_path} with Docling...")
    converter = DocumentConverter()
    result = converter.convert(str(file_path))
    markdown_text = result.document.export_to_markdown()

    metadata = {
        "manual_id": manual_id,
        "source_file": file_path.name,
        "equipment_tags": equipment_tags or [],
    }
    document = Document(text=markdown_text, metadata=metadata)

    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)
    nodes = splitter.get_nodes_from_documents([document])

    for node in nodes:
        node.metadata.update(metadata)

    print(f"Created {len(nodes)} chunks from {file_path.name}")

    embed_model = AzureOpenAIEmbedding(
        model="text-embedding-3-small",
        deployment_name=settings.azure_openai_embedding_deployment,
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

    print("Embedding and storing chunks...")
    VectorStoreIndex(nodes, storage_context=storage_context, embed_model=embed_model)
    print(f"Done. {len(nodes)} chunks stored for manual '{manual_id}'")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--manual-id", required=True)
    parser.add_argument("--tags", nargs="*", default=[])
    args = parser.parse_args()
    ingest_manual(Path(args.file), args.manual_id, list(args.tags))
