"""
Manual ingestion pipeline.
Usage: python ingest.py --file ../manuals/yanmar_jh-cr_operator_manual.pdf --manual-id yanmar_jh-cr_operator
"""

from __future__ import annotations

import argparse
from pathlib import Path

from pypdf import PdfReader

from llama_index.core import Document, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.azure_openai import AzureOpenAIEmbedding
from llama_index.vector_stores.postgres import PGVectorStore

from config import settings
from db import postgres_connection_strings
from english_text import extract_english

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent
_MANUALS_DIR = _REPO_ROOT / "manuals"


def resolve_manual_path(file_path: str | Path) -> Path:
    """Resolve a manual PDF under cwd, backend/, repo root, or manuals/."""
    path = Path(file_path).expanduser()
    candidates: list[Path] = []
    if path.is_absolute():
        candidates.append(path)
    else:
        for root in (Path.cwd(), _BACKEND_DIR, _REPO_ROOT, _MANUALS_DIR):
            candidates.append(root / path)
        candidates.append(_MANUALS_DIR / path.name)

    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if resolved.is_file():
            return resolved

    raise FileNotFoundError(
        f"Manual not found: {file_path}\n"
        f"PDFs live in {_MANUALS_DIR}. From backend/, use e.g.:\n"
        f"  --file ../manuals/{path.name}"
    )


def pdf_to_pages(file_path: Path) -> list[tuple[int, str]]:
    """Extract text per PDF page (1-based page numbers)."""
    reader = PdfReader(str(file_path))
    pages: list[tuple[int, str]] = []
    for page_num, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((page_num, text))
    if not pages:
        raise ValueError(f"No extractable text in {file_path.name}")
    return pages


def pdf_to_text_docling(file_path: Path) -> str:
    from docling.document_converter import DocumentConverter

    converter = DocumentConverter()
    result = converter.convert(str(file_path))
    return result.document.export_to_markdown()


def ingest_manual(
    file_path: Path,
    manual_id: str,
    equipment_tags: list[str] | None = None,
    parser: str = "pypdf",
) -> None:
    """
    Parse a PDF, chunk it, embed it, and store in pgvector.

    Args:
        file_path: Path to the PDF manual
        manual_id: Stable identifier e.g. "yanmar_4jh45_operators"
        equipment_tags: Optional list e.g. ["yanmar", "4jh45", "engine"]
    """
    print(f"Extracting text from {file_path.name} ({parser})...")

    base_metadata = {
        "manual_id": manual_id,
        "source_file": file_path.name,
        "equipment_tags": equipment_tags or [],
    }

    documents: list[Document] = []
    if parser == "pypdf":
        for page_num, page_text in pdf_to_pages(file_path):
            english_text = extract_english(page_text)
            if not english_text.strip():
                continue
            documents.append(
                Document(
                    text=english_text,
                    metadata={
                        **base_metadata,
                        "page_start": page_num,
                        "page_end": page_num,
                    },
                )
            )
    elif parser == "docling":
        english_text = extract_english(pdf_to_text_docling(file_path))
        if not english_text.strip():
            raise ValueError(f"No English text extracted from {file_path.name}")
        documents.append(Document(text=english_text, metadata=base_metadata))
    else:
        raise ValueError(f"Unknown parser: {parser!r}. Use 'pypdf' or 'docling'.")

    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)
    nodes = splitter.get_nodes_from_documents(documents)

    for node in nodes:
        node.metadata.update(base_metadata)

    print(f"Created {len(nodes)} chunks from {file_path.name}")

    embed_model = AzureOpenAIEmbedding(
        model="text-embedding-3-small",
        deployment_name=settings.azure_openai_embedding_deployment,
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

    print("Embedding and storing chunks...")
    VectorStoreIndex(nodes, storage_context=storage_context, embed_model=embed_model)
    print(f"Done. {len(nodes)} chunks stored for manual '{manual_id}'")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--manual-id", required=True)
    parser.add_argument("--tags", nargs="*", default=[])
    parser.add_argument(
        "--parser",
        choices=("pypdf", "docling"),
        default="pypdf",
        help="PDF text extraction backend (default: pypdf, lower memory)",
    )
    args = parser.parse_args()
    ingest_manual(
        resolve_manual_path(args.file),
        args.manual_id,
        list(args.tags),
        parser=args.parser,
    )
