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