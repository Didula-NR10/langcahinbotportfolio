import asyncio

import pytest
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from pydantic import ValidationError

from app.core.config import Settings
from app.knowledge.errors import EmbeddingRateLimitError, EmptyKnowledgeError, MissingVectorIndexError, VectorIndexError
from app.knowledge.index import active_collection, rebuild_index, split_documents
from app.ai.retriever import KnowledgeRetriever


class TinyEmbeddings(Embeddings):
    def _vector(self, text: str) -> list[float]:
        lowered = text.lower()
        return [float(lowered.count(word)) for word in ("python", "project", "degree", "education", "cloud")] + [0.1]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._vector(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._vector(text)


class FailingEmbeddings(TinyEmbeddings):
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        raise RuntimeError("provider failed")


class RateLimitedEmbeddings(TinyEmbeddings):
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        cause = RuntimeError("private provider response")
        cause.code = 429
        raise RuntimeError("embedding failed") from cause


def settings(tmp_path, **overrides):
    return Settings(
        _env_file=None,
        app_environment="testing",
        VECTOR_DB_PATH=str(tmp_path / "vectors"),
        **overrides,
    )


def document(text: str, source: str = "projects.md") -> Document:
    return Document(page_content=text, metadata={"source": source, "category": source.removesuffix(".md"), "document_type": "markdown"})


def test_split_preserves_metadata_and_respects_size(tmp_path):
    chunks = split_documents([document("# Projects\n" + "Python project. " * 80)], settings(tmp_path, RAG_CHUNK_SIZE=150, RAG_CHUNK_OVERLAP=20))
    assert len(chunks) > 1
    assert all(chunk.metadata["source"] == "projects.md" for chunk in chunks)
    assert all(len(chunk.page_content) <= 150 for chunk in chunks)


def test_index_rebuild_retrieval_and_duplicate_prevention(tmp_path):
    configured = settings(tmp_path, RAG_TOP_K=1)
    embedding = TinyEmbeddings()
    docs = [document("Python project using cloud tools."), document("A university degree in mathematics.", "education.md")]
    first = rebuild_index(docs, configured, embedding)
    assert first.updated and first.documents == 2 and first.chunks == 2
    first_collection = active_collection(configured.vector_db_path)
    second = rebuild_index(docs, configured, embedding)
    assert not second.updated
    assert active_collection(configured.vector_db_path) == first_collection

    results = asyncio.run(KnowledgeRetriever(configured, embedding).retrieve("Python project"))
    assert len(results) == 1
    assert results[0].metadata["source"] == "projects.md"

    newer = rebuild_index([document("Cloud project in Python.")], configured, embedding)
    assert newer.updated
    assert active_collection(configured.vector_db_path) != first_collection
    latest = asyncio.run(KnowledgeRetriever(configured, embedding).retrieve("Python project"))
    assert len(latest) == 1
    assert latest[0].page_content == "Cloud project in Python."


def test_failed_rebuild_keeps_previous_index(tmp_path):
    configured = settings(tmp_path)
    rebuild_index([document("Python project")], configured, TinyEmbeddings())
    active = active_collection(configured.vector_db_path)
    with pytest.raises(VectorIndexError):
        rebuild_index([document("Different project")], configured, FailingEmbeddings())
    assert active_collection(configured.vector_db_path) == active


def test_embedding_rate_limit_keeps_previous_index(tmp_path):
    configured = settings(tmp_path)
    rebuild_index([document("Python project")], configured, TinyEmbeddings())
    active = active_collection(configured.vector_db_path)
    with pytest.raises(EmbeddingRateLimitError) as caught:
        rebuild_index([document("Different project")], configured, RateLimitedEmbeddings())
    assert "private provider response" not in str(caught.value)
    assert active_collection(configured.vector_db_path) == active


def test_missing_index_and_empty_documents(tmp_path):
    configured = settings(tmp_path)
    with pytest.raises(MissingVectorIndexError):
        active_collection(configured.vector_db_path)
    with pytest.raises(EmptyKnowledgeError):
        rebuild_index([], configured, TinyEmbeddings())


@pytest.mark.parametrize("overrides", [
    {"RAG_TOP_K": 0},
    {"RAG_CHUNK_SIZE": 100, "RAG_CHUNK_OVERLAP": 100},
    {"RAG_MAX_CONTEXT_CHARS": 0},
    {"KNOWLEDGE_MODE": "unknown"},
])
def test_invalid_rag_settings(overrides):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **overrides)
