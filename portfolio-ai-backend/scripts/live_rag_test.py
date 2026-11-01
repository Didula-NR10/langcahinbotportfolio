"""Explicit live tests: python -m pytest scripts/live_rag_test.py -q."""

import asyncio

import pytest

from app.ai.embeddings import create_embeddings
from app.core.config import get_settings
from app.knowledge.index import active_collection
from app.services.knowledge_ai_service import get_knowledge_ai_service


def test_hosted_embedding_api():
    settings = get_settings()
    if not settings.embedding_api_key or not settings.embedding_api_key.get_secret_value():
        pytest.skip("EMBEDDING_API_KEY is not set")
    vector = create_embeddings(settings).embed_query("portfolio retrieval check")
    assert vector and all(isinstance(value, (float, int)) for value in vector)


def test_live_rag_answer():
    settings = get_settings()
    if not settings.embedding_api_key or not settings.embedding_api_key.get_secret_value():
        pytest.skip("EMBEDDING_API_KEY is not set")
    if not settings.groq_api_key or not settings.groq_api_key.get_secret_value():
        pytest.skip("GROQ_API_KEY is not set")
    try:
        active_collection(settings.vector_db_path)
    except Exception:
        pytest.skip("Build the knowledge index before running the live RAG test")
    service = get_knowledge_ai_service(settings.model_copy(update={"knowledge_mode": "rag"}))
    result = asyncio.run(service.answer("What verified projects are documented?", mode="rag"))
    assert result.answer.strip()
    assert result.mode == "rag"
    assert result.sources
